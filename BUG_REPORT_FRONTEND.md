# CourseMaster Frontend — Bug Bash Report

Repository: `courseMaster_frontEnd` (worktree at `D:\27.05.2026 computer\B7-Practise\problem_solving\courseMaster_frontEnd`)
Branch: `main` · Commit: `14e57e8` · Remote: `https://github.com/Hayder987/CourseMaster_frontend_sloved.git` (user-owned, not the original `Pullock4981` repository)
Live frontend: https://course-master-front-end.vercel.app/ · API base compiled into the currently deployed bundle: `https://course-master-backend-ochre.vercel.app/api`
Audit dates: 2026-10-21 (Phases A–B) and 2026-10-22 (Phase C)

**Scope note:** Phase A was audit-only; no file under `src/` was modified during the audit and `git status --short` was clean. Phase B applied the first six groups. Phase C (2026-10-22) re-measured the working tree against both API hosts, added BUG-007, and extended BUG-006 with the admin update-loading defect. 20 files under `src/` plus `.env.example` are modified (the git-ignored `.env` is also updated locally); `BUG_REPORT_FRONTEND.md` is untracked. Nothing is committed or pushed, and the live site still serves the pre-fix bundle.

---

## Audit baseline (measured, not assumed)

| Command | Result |
|---|---|
| `git status --short` | clean (before audit) |
| `npm run build` | **PASS** — 2417 modules transformed, built in 9.90s |
| `npm run lint` | **FAIL** — 18 pre-existing errors (unused vars, `react-hooks/set-state-in-effect`, `react-refresh/only-export-components`); unrelated to the defects below |
| Test framework | none installed (`package.json` has no `test` script, no Jest/Vitest) |
| Browser automation | **not available** — the session's browser tools reported "No desktop browser is connected", so no click-through/console/screenshot verification was possible |
| Public read-only API | `GET /api/courses?limit=3` → 200; course `price` is `4500`, `batches[0]._id` exists |

Isolated runtime checks that *were* executed (temporary files under `%TEMP%`, nothing added to the repo):

- `utils/auth.js` simulated with a stub `localStorage`: after `saveToken("…")` the only key is `user_token`, `getToken()` returns `null`, `clearToken()` leaves `user_token` in place.
- `enrollmentSlice` reduced with the real backend payload shape (an array): `state.enrollments === undefined`, and `enrollments.length` throws `TypeError: Cannot read properties of undefined (reading 'length')`.
- `mongoose.Types.ObjectId("0")` throws `CastError: input must be a 24 character hex string…`.

---

## Phase C re-verification (2026-10-22, measured)

| Check | Result |
|---|---|
| `npm run build` | **PASS** — 2417 modules transformed, built in 4.29s |
| `npm run lint` | **FAIL** — 17 errors, same 10 files and same rules as the Phase B end-state; none added by Phase C |
| `GET https://course-master-backend-ochre.vercel.app/api` | 200 — `Course Master Backend Running` |
| `GET …/api/courses?limit=2` | 200 with real data (`price: 4500`, `batches[0]._id` present) |
| `GET …/api/auth/me` without a token | 401 (as expected) |
| `POST …/api/auth/login` with invalid credentials | 400 `{"message":"Invalid email or password"}` (deployed backend) |
| `POST http://localhost:5000/api/auth/login` with invalid credentials | 401 with the same message (local backend, development stack trace) |
| `GET http://localhost:5000/api/courses?limit=1` | 200 |
| CORS preflight from `https://course-master-front-end.vercel.app` | 204; `Access-Control-Allow-Origin: *` |
| Deployed bundle `index-H7pn9ZKo.js` (fetched over HTTPS) | still the pre-fix build: `getItem("token")`, `dev_bypass`, `price*100`, `enrollments=y.payload.data`; `baseURL` = the production API |
| Bundle built in this worktree after the BUG-007 fix | production URL present, **0** occurrences of `localhost:5000` |

Both API hosts answer correctly, so the base URL is selected from measured behaviour and not from a fallback chain. The deployed bundle proves the Phase B fixes are not live yet (no push/redeploy was authorised).

---

# BUG-001 - Hardcoded admin JWT / permanent auth bypass, plus login tokens that are never read back

**1. Location & Steps**
Page: `/login` (and every protected route: `/student`, `/admin/*`, `/courses/:id/player`)
File: `src/pages/Login/Login.jsx`, `src/utils/auth.js`, `src/routes/ProtectedRoute.jsx`, `src/components/shared/Navbar.jsx`, `src/services/api.js`
Code Location (before fix): `Login.handleSubmit` (`Login.jsx:22-38`), "Dev Route Inspector Bypass" buttons (`Login.jsx:85-120`), `saveToken`/`getToken`/`clearToken` (`utils/auth.js:1-3`), `ProtectedRoute` bypass branch (`ProtectedRoute.jsx:11-16`), `Navbar` bypass branch (`Navbar.jsx:68-73`), `Navbar.handleLogout` (`Navbar.jsx:18-23`), request interceptor (`services/api.js:8-20`)
Steps:
1. Open `/login` and sign in with the demo admin account documented in `README.md`.
2. After the reload, open `/student` or `/admin`.
3. Alternatively click "👑 Admin Portal" under "Direct Login & Inspect Routes (Dev Bypass)" on a fresh browser profile, press Logout, then open `/admin` again.

**2. Expected vs. Actual**
Expected: a successful login stores one session token, every subsequent request sends it, protected routes remain reachable until logout, and logout ends the session. No credential material should ship in the client bundle, and no UI control should grant a role without authentication.
Actual (before fix): `saveToken` wrote `localStorage["user_token"]` while `getToken` read `localStorage["token"]` and `clearToken` deleted `token`. The token written by login was therefore never used: `ProtectedRoute` saw no token and redirected to `/login`, and the axios interceptor sent no `Authorization` header. The page also shipped two hardcoded JWT literals (values intentionally withheld here) and one-click buttons that wrote them to `localStorage` together with `dev_bypass=true`; `ProtectedRoute` honoured that flag and `?bypass=true`, and the flag was never cleared by logout. A read-only `GET /api/auth/me` with the embedded admin token returned HTTP 200 with `role = "admin"` on the live backend, i.e. the embedded admin credential was (and server-side still is) valid.
Actual (after fix): login writes and reads `user_token` through the same constant; logout removes `user_token`, the legacy `token` key and `dev_bypass`; the bypass UI, the hardcoded JWTs and both bypass branches are gone, so `/admin` is reachable only through `ProtectedRoute` → `getMe()` → `AdminRoute` role check.

**3. Severity & Evidence**
Severity: Critical
Priority: P1
Screenshot / Error: Not available (no browser). Evidence: runtime simulation before the fix printed `keys after saveToken: ['user_token']`, `getToken() after saveToken: null`; live `GET /api/auth/me` = 200 with `role="admin"` for the embedded token (values redacted); the deployed bundle contains `localStorage.setItem("user_token", …)` next to `getItem("token")` and the `dev_bypass` branch.

**4. Fix & Verification**
Fix: (a) `src/utils/auth.js` now defines one `TOKEN_KEY = "user_token"` used by `saveToken`/`getToken`; `clearToken` removes `user_token`, the legacy `token` key and `dev_bypass`. (b) The whole "Dev Route Inspector Bypass" block, including both hardcoded JWT literals, was deleted from `Login.jsx`. (c) The `dev_bypass` / `?bypass=true` branch was removed from `ProtectedRoute.jsx`. (d) The `dev_bypass` "Student Portal / Admin Portal" branch was removed from `Navbar.jsx`. No visual or layout change was made.
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/utils/auth.js` — single token key plus cleanup of the legacy `token` and `dev_bypass` keys.
- `src/pages/Login/Login.jsx` — removed the 36-line dev-bypass block and both hardcoded JWT literals.
- `src/routes/ProtectedRoute.jsx` — removed the `dev_bypass` / `?bypass=true` shortcut.
- `src/components/shared/Navbar.jsx` — removed the `dev_bypass` navigation branch.

**Verification:**
- Command: `npx esbuild` + `node` on a temporary harness importing the real `src/utils/auth.js` with a stubbed `localStorage` — Result: `getToken after saveToken: session-token`; after `clearToken()`: `getToken: null`, `keys: []`, `dev_bypass still present: false` (legacy `token` and `dev_bypass` were seeded before the test).
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.28s.
- Command: `npm run lint` — Result: still 18 pre-existing errors, 0 new errors; `ProtectedRoute`/`Login.jsx` report no new rules (the remaining `set-state-in-effect` at `ProtectedRoute.jsx:12` and `'to' is unused` at `Navbar.jsx:13` existed before this change).
- Static scan: `Select-String` over `src` for `eyJ|dev_bypass|bypass=true` — Result: no hardcoded JWT and no bypass check left; only the cleanup line `localStorage.removeItem("dev_bypass")` in `auth.js`.
- Browser verification: **Not performed** — no browser was connected to this session, so the login → protected-route → logout flow was not clicked through.
- Remaining limitation: the leaked admin JWT stays valid until it expires or `JWT_SECRET` is rotated on the backend (out of this repository's scope); removing the UI does not revoke tokens already copied by a third party.

**Code Location Details:**
- File: `src/utils/auth.js` — `saveToken`, `getToken`, `clearToken` — lines 1-9 — one key (`user_token`) plus legacy cleanup.
- File: `src/pages/Login/Login.jsx` — `handleSubmit` — lines 22-38 unchanged; bypass block deleted after line 84.
- File: `src/routes/ProtectedRoute.jsx` — `ProtectedRoute` effect — lines 10-23 — token-only verification.
- File: `src/components/shared/Navbar.jsx` — desktop menu — lines 58-68; `handleLogout` lines 18-23 now also clears the bypass residue through `clearToken`.

---

# BUG-002 — Enrollment state is wiped to `undefined`: student dashboard crashes and enrollment UI is wrong

**1. Location & Steps**  
Page: `/student` (and `/courses/:id`)  
File: `src/store/slices/enrollmentSlice.js`, `src/pages/student/StudentDashboard.jsx`  
Code Location (before fix): `fetchMyEnrollments.fulfilled` (`enrollmentSlice.js:82-86`, faulty line 84), `StudentDashboard` selector (`StudentDashboard.jsx:11`), empty-state check (`StudentDashboard.jsx:172`), progress percentage (`StudentDashboard.jsx:261`)  
Steps:
1. Sign in as a student and open `/student`.
2. Wait for `GET /enrollments/my` to resolve (the backend returns a bare array of enrollments).
3. Observe the page.

**2. Expected vs. Actual**  
Expected: `state.enrollments` holds the array returned by the API; the dashboard lists the student's courses and shows a valid completion percentage.  
Actual (before fix): the thunk already returned `res.data` (the array), but the reducer assigned `action.payload.data`, which is `undefined` for an array. `enrollments` became `undefined`, then `StudentDashboard.jsx:172` evaluated `enrollments.length` and threw. The same corrupted state made `CourseDetails.jsx:37` (`myEnrollments?.find(...)`) always false, so an enrolled student was offered "Enroll Now" again and the syllabus stayed hidden. Independently, the percentage at line 261 divided by `stats?.courseData?.syllabus?.reduce(...)`, which is `undefined` until the stats request finishes (and `0` if the syllabus is empty), so `NaN%` / `Infinity%` was rendered.  
Actual (after fix): the reducer stores `action.payload` when it is an array (otherwise `[]`), the dashboard selector defaults to `[]` so the empty state can never throw, and the progress figure reads `enrollment.progress.percent` (the same API field the progress bar below it already used), so it shows `0%` instead of `NaN%` while course stats are still loading.

**3. Severity & Evidence**  
Severity: High  
Priority: P1  
Screenshot / Error: Not available (no browser). Evidence: backend `enrollment.service.js` returns `Enrollment.find(...)` (an array) and `GET /enrollments/my` is used as an array by `CoursePlayer.jsx:63` (`res.data.find(...)`); the isolated reducer run before the fix printed `enrollments value: undefined` then `RUNTIME ERROR: TypeError: Cannot read properties of undefined (reading 'length')`; `Math.round((0/undefined)*100)` printed `NaN`.

**4. Fix & Verification**  
Fix: `enrollmentSlice.js` now assigns `Array.isArray(action.payload) ? action.payload : []`; `StudentDashboard` destructures `enrollments = []`; the percentage line now renders `enrollment.progress?.percent || 0`. No layout, styling or data-fetching change.  
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/store/slices/enrollmentSlice.js` — fulfilled reducer stores the array (with an `Array.isArray` guard) instead of `payload.data`.
- `src/pages/student/StudentDashboard.jsx` — selector default `[]`; progress percentage uses the API `percent` with a `0` fallback.

**Verification:**
- Command: `npx esbuild` + `node` on a temporary harness importing the real slice reducer — Result: `array payload -> isArray: true len: 1`, `undefined payload -> isArray: true len: 0`, `envelope payload -> isArray: true len: 0`, `dashboard default -> isArray: true len: 0`; the old expression reproduced `value: undefined | .length: TypeError`; percent fallback printed `0%, 0%, 37%`.
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.36s.
- Command: `npm run lint` — Result: still 18 pre-existing errors, 0 new errors in `enrollmentSlice.js` or `StudentDashboard.jsx`.
- Browser verification: **Not performed** — no browser was connected to this session, so `/student` was not rendered with a real student account.

**Code Location Details:**
- File: `src/store/slices/enrollmentSlice.js` — `fetchMyEnrollments.fulfilled` — lines 82-86 — guard added at line 85.
- File: `src/pages/student/StudentDashboard.jsx` — selector — line 11; progress percentage — line 261 — uses `enrollment.progress?.percent || 0`.

---

# BUG-003 - Course details shows a 100x price, and batch selection makes enrollment fail

**1. Location & Steps**  
Page: `/courses/:id`  
File: `src/pages/CousrseDetails/CourseDetails.jsx`  
Code Location (before fix): `CourseDetails` render price (`CourseDetails.jsx:111-116`), `handleEnroll` batch payload (`CourseDetails.jsx:56-59`), batch picker (`CourseDetails.jsx:258-292`, confirmation at 288)  
Steps:
1. Open any course, e.g. the live course "Python for Data Science & Machine Learning" (`price` = 4500 in `GET /api/courses`).
2. Compare the amount on the listing card with the amount on the details page.
3. Expand "Available Batches", select "Batch 1 (2026)" (index 0), then press "Enroll Now".

**2. Expected vs. Actual**  
Expected: the details page shows the same amount as the listing (`৳4,500`), enrolling with a selected batch sends that batch's `_id`, and selecting any batch shows the confirmation hint.  
Actual (before fix): line 116 rendered `৳ {course.price * 100}`, i.e. `৳450,000` for the same course (the deployed bundle contains the same `price*100` expression). `handleEnroll` sent `batchId: selectedBatchId.toString()`, i.e. the array index `"0"`, although batches are subdocuments with real `_id`s (`GET /api/courses` returns `batches[0]._id`) and the backend field is `Schema.Types.ObjectId`; the cast fails, so the request is rejected. Additionally `{selectedBatchId && ...}` was falsy for index `0`, so selecting the first batch showed no "Batch selected" confirmation.  
Actual (after fix): the price renders `course.price?.toLocaleString()` (identical to the listing card), the picker stores `batch._id`, `handleEnroll` sends that id unchanged (or `null` when nothing is selected), and the confirmation uses `selectedBatchId !== null`, so index 0 behaves like any other batch.

**3. Severity & Evidence**  
Severity: High  
Priority: P2  
Screenshot / Error: Not available (no browser). Evidence: live `GET /api/courses` -> `price: 4500`, `batches: [{ _id: "6ac1f37f66006f1dcbb5b53f", ... }]`; deployed bundle contains `tl.price*100`; `new mongoose.Types.ObjectId("0")` -> `BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer`, while the real 24-hex id casts successfully; backend `Enrollment.batchId` is `Schema.Types.ObjectId` (optional).

**4. Fix & Verification**  
Fix: render `course.price?.toLocaleString()`; keep the selected batch `_id` in `selectedBatchId` and send it unchanged; compare with `!== null` for the confirmation hint; use `batch._id` as the React key (falling back to the index for legacy data without ids). No layout or styling change.  
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/pages/CousrseDetails/CourseDetails.jsx` — price no longer multiplied; batch selection/sending uses `_id`; truthiness check replaced with `!== null`.

**Verification:**
- Command: `node` with the backend's own `mongoose` — Result: `new ObjectId("0") -> BSONError: input must be a 24 character hex string...`; `new ObjectId("6ac1f37f66006f1dcbb5b53f") -> 6ac1f37f66006f1dcbb5b53f`.
- Command: `node` logic harness — Result: old price output `450000` vs new `4,500`; first-batch selection old `selected = 0`, `confirmation = false`, `payload "0"` vs new `selected = "batch-id-0"`, `confirmation = true`, `payload "batch-id-0"`; clicking the same batch again returns `null` and hides the hint.
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.03s.
- Command: `npm run lint` — Result: still 18 pre-existing errors, 0 new (`CourseDetails.jsx:44 'err' is unused` existed before this change).
- Browser verification: **Not performed** — no browser was connected to this session, so the course page and the Enroll button were not clicked through.

**Code Location Details:**
- File: `src/pages/CousrseDetails/CourseDetails.jsx` — price — line 114; `handleEnroll` batch payload — line 56; batch picker — lines 256-273; confirmation — line 284.

---

# BUG-004 - Course player is reachable without enrollment, never reflects completed lessons, and renders a 300x700 video

**1. Location & Steps**  
Page: `/courses/:id/player`  
File: `src/pages/CoursePlayer/CoursePlayer.jsx`  
Code Location (before fix): `CoursePlayer` enrollment fetch/render gate (`CoursePlayer.jsx:57-115`), lesson completion button (`CoursePlayer.jsx:153-159`), sidebar completed marker (`CoursePlayer.jsx:237`), video iframe (`CoursePlayer.jsx:142-151`)  
Steps:
1. Sign in with any account that is **not** enrolled in the course.
2. Open `/courses/:id/player` directly (the route is guarded by `ProtectedRoute`, which only checks that a token exists).
3. Open an enrolled course, press "Mark as Complete", then reopen the same lesson.

**2. Expected vs. Actual**  
Expected: non-enrolled users are sent back to the course details page (which says "Enroll in this course to view the complete syllabus and access all lessons"); after completing a lesson the button reads "Completed" and is disabled; the video player fills its card responsively.  
Actual (before fix): `CoursePlayer` only checked `if (!currentCourse)`; when `enrollment` was `null` it still rendered every module/lesson, the video iframe and the quiz/assignment panels, so the enrollment gate enforced on the details page was bypassed. The completion check used `completedLessons?.includes(lesson)` (the lesson object) instead of `lesson._id`, so the button never showed the completed state and could be pressed repeatedly, while the sidebar marker (which correctly uses `les._id`) disagreed. The iframe was fixed at `style={{ height: '700px', width: '300px' }}`, producing a narrow 300 px column and 700 px height on all screen sizes.  
Actual (after fix): the component waits for both the course and the enrollment request before rendering, redirects to `/courses/:id` when no enrollment matches, compares `completedLessons` with `lesson._id`, and the iframe uses `className="w-full aspect-video"` so it fills the card at 16:9.

**3. Severity & Evidence**  
Severity: High  
Priority: P2  
Screenshot / Error: Not available (no browser). Evidence: source only — before the fix there was no `Navigate`/access check between lines 57-115; the completion button compared an object with id strings at 155-159; the iframe had fixed inline dimensions at 144; `completedLessons.includes(lesson)` printed `false` while `completedLessons.includes(lesson._id)` printed `true` for the same completed lesson.

**4. Fix & Verification**  
Fix: added an `enrollmentChecked` flag set in `finally` after `GET /enrollments/my`, show the spinner until it settles, and a `Navigate` redirect to `/courses/:id` when no enrollment matches; compare `lesson._id` (guarded for a missing lesson) for the disabled/label/class state; replace the fixed iframe size with a responsive 16:9 class. No layout, styling or routing change beyond the redirect.  
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/pages/CoursePlayer/CoursePlayer.jsx` — enrollment gate with redirect, `_id`-based completion state, responsive iframe.

**Verification:**
- Command: `node` logic harness — Result: old object comparison `false` vs `_id` comparison `true` for the same completed lesson; not-completed lesson `false`; missing lesson `false`; gate decision `enrollment = null -> Navigate`, `enrollment = found -> render player`.
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.81s.
- Command: `npm run lint` — Result: still 18 pre-existing errors, 0 new (`CoursePlayer.jsx:251-252` unused `isUpcoming`/`liveClassDate` existed before this change).
- Static review: the player body is now rendered only after `loading === false && enrollmentChecked === true && enrollment !== null`; `Navigate` is imported from `react-router-dom`.
- Browser verification: **Not performed** — no browser was connected to this session, and signing in / enrolling is out of bounds for this task.
- Known limitation: if `GET /enrollments/my` fails, the component treats the user as not enrolled and redirects (fail-closed). The details page still shows an error-free public view.

**Code Location Details:**
- File: `src/pages/CoursePlayer/CoursePlayer.jsx` — gate and completion flag — lines 105-126; iframe — lines 154-161; completion button — lines 164-170.

---

# BUG-005 - Navigation and responsive layout defects

**1. Location & Steps**  
Page: every page (navbar), `/courses` (course cards), `/admin` (mobile), footer  
File: `src/components/shared/Navbar.jsx`, `src/components/shared/Footer.jsx`, `src/components/CourseCard/CourseCard.jsx`, `src/pages/admin/components/AdminSidebar.jsx`, `src/pages/admin/components/AdminDashboard.jsx`  
Code Location (before fix): `Navbar.navLinkClass` (`Navbar.jsx:13-16`), mobile dropdown container (`Navbar.jsx:132-138`), `/profile` links (`Navbar.jsx:112`, `Navbar.jsx:185`), footer `/about` link (`Footer.jsx:30`), card title (`CourseCard.jsx:35`), mobile admin bar (`AdminSidebar.jsx:57-65`) versus content padding (`AdminDashboard.jsx:43`)  
Steps:
1. Open `/` at desktop width and look at the Home / Courses menu items.
2. Resize to a phone width (<768 px), open the hamburger menu, and scroll to the bottom of the menu.
3. Open `/admin` below the `lg` breakpoint; then on any course card read the title of "Cross-Platform Mobile Development with Flutter & Dart".
4. Click "Profile" in the avatar menu and "About Us" in the footer.

**2. Expected vs. Actual**  
Expected: only the current route is highlighted; the whole mobile menu is reachable; admin content starts below the fixed mobile menu bar; long course titles wrap inside their card; nav links lead to existing pages.  
Actual (before fix): `navLinkClass` returned the active style whenever `window.location.pathname.startsWith("/")` — always true — so every nav item was permanently highlighted and the hover style was unreachable. The mobile dropdown was capped at `max-h-32` with `overflow-hidden`, so the avatar block, Dashboard, Profile and Logout were clipped. On `/admin` below `lg`, the fixed "Admin Menu" bar (`top-16`) overlaid the top of `<main>`, which had no compensating top padding. The card title used `whitespace-nowrap overflow-visible`, forcing long titles onto one line instead of wrapping. `/profile` and `/about` were not declared in `App.jsx` and rendered the 404 page.  
Actual (after fix): `navLinkClass` uses the `isActive` render prop only; the mobile dropdown no longer caps its height; `<main>` gets a mobile-only top offset (`pt-16`, reset at `lg`); card titles wrap (`break-words`); the two dead links are removed (the footer keeps Home and Courses, the avatar menus keep Dashboard and Logout).

**3. Severity & Evidence**  
Severity: Medium  
Priority: P3  
Screenshot / Error: Not available (no browser). Evidence: source only (conditions above); the built stylesheet now contains `.pt-16{padding-top:calc(var(--spacing)*16)}`, `sm:pt-16`, `lg:pt-5` and `.break-words{overflow-wrap:break-word}`; live course titles confirm the long-title case.

**4. Fix & Verification**  
Fix: `isActive`-only nav class; removed `max-h-32 overflow-hidden`; added `pt-16 sm:pt-16 lg:pt-5` to the admin main; `break-words` on card titles; removed the `/profile` entries and the `/about` footer link. Note: this removes the two dead entries instead of creating Profile/About pages; real pages would be a separate feature.  
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/components/shared/Navbar.jsx` — active-link logic; mobile dropdown height; removed the Profile entries.
- `src/components/shared/Footer.jsx` — removed the About Us link.
- `src/components/CourseCard/CourseCard.jsx` — title wraps instead of staying on one line.
- `src/pages/admin/components/AdminDashboard.jsx` — mobile top offset for the fixed admin bar.

**Verification:**
- Command: source scan for `"/profile"`, `"/about"`, `max-h-32`, `startsWith("/")` — Result: no matches left in `src` (the only remaining `startsWith` hits are unrelated URL/lesson parsing).
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.51s; the emitted CSS contains `pt-16`, `sm:pt-16`, `lg:pt-5` and `break-words`.
- Command: `npm run lint` — Result: 17 errors (down from 18) because the unused `to` parameter in Navbar is gone; no new errors in the changed files.
- Browser verification: **Not performed** — no browser was connected, so the mobile menu, sticky bar and card wrapping were not visually inspected.
- Note: the fixed admin bar still overlays content while the page is scrolled (by design); the new padding guarantees the content starts below it.

**Code Location Details:**
- File: `src/components/shared/Navbar.jsx` — `navLinkClass` lines 13-16; mobile menu lines 132-137; Profile entries removed at 112 and 185 (old numbering).
- File: `src/components/shared/Footer.jsx` — Quick Links lines 18-28.
- File: `src/components/CourseCard/CourseCard.jsx` — title line 35.
- File: `src/pages/admin/components/AdminDashboard.jsx` — `<main>` line 43.

---

# BUG-006 - Admin dashboard reads analytics keys that the API never returns, and a failed course creation still navigates away

**1. Location & Steps**  
Page: `/admin` (Overview) and `/admin/courses/create`  
File: `src/pages/admin/pages/AdminOverview.jsx`, `src/pages/admin/pages/CreateCourse.jsx`, `src/pages/admin/pages/ManageUsers.jsx`  
Code Location (before fix): `courseEnrollmentData` (`AdminOverview.jsx:135-139`), `CreateCourse.handleSubmit` (`CreateCourse.jsx:68-72`), users table email cell (`ManageUsers.jsx:216`)  
Steps:
1. Open `/admin` as an admin; `GET /admin/analytics` succeeds, but the "Top Courses by Enrollments" card is absent.
2. Open `/admin/courses/create`, submit a form that the backend rejects (e.g. a duplicate/invalid value), and watch the page.
3. Toggle the theme to dark and open `/admin/users`.

**2. Expected vs. Actual**  
Expected: the Top Courses chart renders the five most enrolled courses; a rejected creation keeps the form on screen with the error message; table text uses theme colours and stays readable in both themes.  
Actual (before fix): the API returns `{ chartData, enrollmentsByCourse, stats }` with items `{ _id, courseName, enrollments }`, but the overview read `analytics?.topCourses?.slice(0, 5)` and then `course.courseTitle` / `course.count`; the expression was always `undefined`, so the section was skipped entirely (the `/admin/analytics` page uses the correct `enrollmentsByCourse` / `courseName` keys, which confirms the mismatch). `CreateCourse` tested `result.payload?.message`; on rejection the payload is a string, so `.message` was `undefined`, and `!error` used the stale render-time value, so it always scheduled `navigate("/admin/courses")` after 1.5 s — the error alert unmounted and the form was lost. The email cell was forced to `style={{ color: '#1e293b' }}`; on the dark theme (`--color-base-100: #35374B`) that is a contrast ratio of roughly 1.1:1, i.e. effectively unreadable.  
Actual (after fix): the chart maps `enrollmentsByCourse` to `{ name: courseName, enrollments }` (the backend already sorts and limits to 5); the redirect is scheduled only when `createCourseAsync.fulfilled.match(result)` is true; the email cell has no inline colour and inherits the theme.

**3. Severity & Evidence**  
Severity: Medium  
Priority: P3  
Screenshot / Error: Not available (no browser). Evidence: live `GET /admin/analytics` returned top-level `chartData, enrollmentsByCourse, stats` with items `_id, courseName, enrollments` and no `topCourses`; backend `admin.service.js:156-187` groups/sorts/limits to 5 and projects `courseName`/`enrollments`; a node harness fed that shape to the old and new expressions — old produced `[]` (section hidden) and new produced two chart rows; `createCourseAsync.fulfilled.match(rejected)` printed `false`; the old dark-theme email colour was a hardcoded `#1e293b`.

**4. Fix & Verification**  
Fix: map the real analytics keys; use the thunk's `fulfilled.match` result to decide the redirect; remove the hardcoded email colour. No layout or styling change beyond removing the inline colour.  
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `src/pages/admin/pages/AdminOverview.jsx` — `enrollmentsByCourse` / `courseName` / `enrollments`.
- `src/pages/admin/pages/CreateCourse.jsx` — redirect only on a fulfilled action.
- `src/pages/admin/pages/ManageUsers.jsx` — theme-aware email text.
- `src/store/slices/adminSlice.js` — `updating` flag for `updateCourseAsync` (Phase C).
- `src/pages/admin/pages/EditCourse.jsx` — button/spinner driven by `updating` instead of `creating` (Phase C).

**Verification:**
- Command: `npx esbuild` + `node` harness importing the real `adminSlice` thunk — Result: `fulfilled.match(fulfilled): true`, `fulfilled.match(rejected): false`; old analytics mapping `[]` with section rendered `false`, new mapping `[{"name":"Python for Data","enrollments":7},{"name":"Web Development","enrollments":3}]` with section rendered `true`.
- Command: `npm run build` — Result: PASS, 2417 modules transformed, built in 4.38s.
- Command: `npm run lint` — Result: still 17 errors, 0 new (`CreateCourse.jsx` unused builder variables existed before).
- Source scan: no `topCourses`, `#1e293b` or `payload?.message` left; `courseTitle` in `VideoClasses.jsx` is an unrelated local video-class field.
- Browser verification: **Not performed** — no browser was connected, and signing in as an admin / creating a course is out of bounds for this task.

**Code Location Details:**
- File: `src/pages/admin/pages/AdminOverview.jsx` — `courseEnrollmentData` — lines 135-139.
- File: `src/pages/admin/pages/CreateCourse.jsx` — `handleSubmit` — lines 68-71.
- File: `src/pages/admin/pages/ManageUsers.jsx` — email cell — line 216.

**Phase C addition (2026-10-22) — admin update operations never show progress**

- Location: `src/pages/admin/pages/EditCourse.jsx` (selector and submit button), `src/store/slices/adminSlice.js` (`updateCourseAsync` handlers); the same missing flag is consumed by `src/pages/admin/pages/VideoClasses.jsx`.
- Steps: open `/admin/courses/edit/:id`, change a field, press "Update Course". On `/admin/video-classes`, open "Start Video Class" and press "Google Meet".
- Expected vs. actual: the button should disable and read "Updating…" until `PATCH /admin/courses/:id` settles. Before this fix `EditCourse` read `creating`, which only `createCourseAsync.pending` ever sets; `updateCourseAsync` had no `pending` handler, and `VideoClasses` read a `state.admin.updating` key that did not exist. Both flags were therefore permanently `false`: the spinner never appeared, the button stayed clickable (double submit), and the video-class buttons never disabled. After the fix `adminSlice` exposes `updating` (set on pending, cleared on fulfilled/rejected) and `EditCourse` uses it for `disabled` and the spinner label; `VideoClasses` needed no code change because it already read that key.
- Severity & evidence: Medium / P3. Source evidence only; no browser. Real-slice harness output before/after the reducer change: `initial updating:false`; `update pending -> updating:true`; `fulfilled -> false` + success message; `rejected -> false` + error; `create pending -> creating:true, updating:false`.
- Fix & verification: reducer handlers added; selector/button switched to `updating`. `npm run build` PASS; `npm run lint` unchanged at 17. Browser: **not performed**.

---

# BUG-007 - API base URL, session bootstrap, and request lifecycle: builds can target localhost, login failures lose their message, the profile is never re-hydrated, admin screens render blank, and course search races pagination

**1. Location & Steps**
Pages: `/login`, any page after a reload, `/admin`, `/courses`
Files: `.env`, `src/services/api.js`, `src/layouts/MainLayout.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/admin/components/AdminDashboard.jsx`, `src/components/CourseCard/CoursesSection.jsx`
Code Location (before fix): duplicate `VITE_API_BASE_URL` (`.env:5` and `.env:8`), localhost fallback (`api.js:5`), global 401 redirect (`api.js:24-28`), hydration effect (`MainLayout.jsx:13-17`), admin guard (`AdminRoute.jsx:4`), admin profile load (`AdminDashboard.jsx:13-25`), search submit (`CoursesSection.jsx:24-57`)
Steps:
1. Build this worktree (`npm run build`) and search the emitted bundle for the API host.
2. Against the local backend (`http://localhost:5000/api`), open `/login` and submit a wrong password.
3. Sign in, reload the page, then open `/courses`: as an admin, look for the "Manage Courses" button, and on `/admin` watch the first paint.
4. Open `/admin` while `/auth/me` is slow or failing.
5. On `/courses`, go to page 2 or later, type a search term and press Search; watch the network panel.

**2. Expected vs. Actual**
Expected: (a) the bundle always calls the configured API host, and a deployed build can never fall back to a developer's localhost; (b) a rejected login shows "Invalid email or password" on the form; (c) after a reload the profile is fetched once, so `state.auth.user` is populated and role-dependent UI appears; (d) a protected screen shows a spinner while the session is checked and never stays blank; (e) submitting a search from page > 1 requests page 1 exactly once with the current filters.

Actual (before fix):
(a) `.env` declared `VITE_API_BASE_URL` twice (production at line 5, localhost at line 8). Vite's dotenv loader keeps the **last** value, so a normal `npm run build` in this worktree emitted `baseURL:"http://localhost:5000/api"`. Independently, `api.js` hardcoded `|| "http://localhost:5000/api"`, so any build with the variable missing (a fresh clone has no `.env`; it is git-ignored) also targeted localhost — exactly the prod→localhost fallback that must not exist in deployed code.
(b) `loginUser` goes through the shared axios instance. The local backend answers a wrong password with **401** (documented contract; the deployed backend currently answers 400), and the response interceptor treated every 401 as an expired session: it cleared the token and did `window.location.href = "/login"`. The page reloaded before `Login.jsx` could render `err.response.data.message`, so the user saw a blank form and no reason for the failure.
(c) `authSlice` initialises `token` and `isAuthenticated` from the stored token, so after a reload `isAuthenticated === true` while `user === null`. `MainLayout` only dispatched `getMeAsync()` when `token && !isAuthenticated`; that condition is false in precisely this state, so the profile was never fetched. Consequences: `CoursesSection.jsx:103` and `CoursesPreview` never rendered their admin-only "Manage Courses" button, and role checks elsewhere only worked when the screen fetched the profile itself (`CourseDetails` does; `CoursesSection` does not).
(d) `AdminDashboard` started with `me = null` and `AdminRoute` did `if (!me) return null`, with no loading or error state, so `/admin` painted an empty page while `getMe` was in flight and stayed empty if it failed.
(e) `onSearchSubmit` called `setPage(1)` and then `fetchCourses()` in the same handler. `fetchCourses` closed over the pre-update `page`, so from page 2+ it issued a request for the old page while the `page` change issued a second request for page 1; whichever response arrived last won, and the grid could show page-2 results with a "Page 1" paginator.

Actual (after fix):
(a) `.env`/`.env.example` contain exactly one active key (production), with `.env.local` documented for local work; `api.js` only falls back to localhost when `import.meta.env.DEV`, and logs an error if a production build lacks the variable.
(b) the interceptor skips the redirect for `/auth/login` and `/auth/register` (credential errors), still clears the token and redirects for any other 401, and does not reload when already on `/login`.
(c) `MainLayout` dispatches `getMeAsync()` when `token && !user`, fetching the profile exactly once per session.
(d) `AdminDashboard` tracks `loading` and passes it to `AdminRoute`, which renders the standard spinner while the profile is loading and redirects to `/login` if no profile could be loaded instead of rendering `null`.
(e) `fetchCourses(pageOverride)` uses the explicit page, and `onSearchSubmit` either fetches page 1 directly (already on page 1) or only sets `page = 1` and lets the existing effect perform the single fetch.

**3. Severity & Evidence**
Severity: High
Priority: P2
Screenshot / Error: Not available (no browser). Evidence (all commands executed in this worktree):
- A/B `vite build` with the duplicated `.env` restored to its original two-key form, output to a temporary outdir: `duplicate-key build -> localhost in bundle: True`, `production URL in bundle: False`. After restoring the single-key `.env`, `npm run build` emitted the production URL and the scan `Select-String dist/assets/*.js -Pattern 'localhost:5000/api'` returned **0** matches.
- Deployed bundle `https://course-master-front-end.vercel.app/assets/index-H7pn9ZKo.js` fetched and searched: contains `baseURL:"https://course-master-backend-ochre.vercel.app/api"`. So the Vercel dashboard variable currently wins and the live site is **not** pointing at localhost; the defect affects builds that rely on this repository's files. The same bundle still contains the pre-fix code (`getItem("token")`, `dev_bypass`, `price*100`, `enrollments=y.payload.data`), which confirms it predates the fixes.
- `POST http://localhost:5000/api/auth/login` with an invalid account → HTTP **401** `{"message":"Invalid email or password"}`; the same request against production → HTTP **400**. The login-message defect therefore reproduces against the local API today and would reproduce on production as soon as it serves the repository's 401 contract.
- Interceptor harness importing the real `src/services/api.js` (`response.interceptors.handlers[0].rejected`), old file from `HEAD` vs. working tree:
  - old: `login 401 → reloaded:true, tokenKept:false`; `protected 401 → /login, token cleared`; `401 on /login → reloaded:true`; `500 → untouched`.
  - new: `login 401 → reloaded:false, tokenKept:true`; `protected 401 → /login, token cleared`; `401 on /login → reloaded:false, token cleared`; `500 → untouched`.
- Real `authSlice` reducer initialised with a stored `user_token`: `{token:"stored-session-token", isAuthenticated:true, user:null}`; evaluating the two guards printed `oldConditionFires:false`, `newConditionFires:true`.
- `GET https://course-master-backend-ochre.vercel.app/api/auth/me` without a token → 401; CORS preflight from the Vercel frontend origin → 204 with `Access-Control-Allow-Origin: *`, so the production URL is usable from the browser.
- (d) and (e) are source-level findings: `AdminRoute` returned `null` for a null `me` with no other branch, and `CoursesSection.fetchCourses` read `page` from the render closure. No network/browser trace was available to reproduce the race visually.

**4. Fix & Verification**
Fix:
- `.env` / `.env.example`: one active `VITE_API_BASE_URL` (production) plus instructions to put the localhost override in the git-ignored `.env.local` (Vite gives `.env.local` higher priority).
- `api.js`: `baseURL` = env value, else localhost **only** when `import.meta.env.DEV`; production without the variable resolves to an empty (same-origin) base and logs a configuration error. The 401 interceptor now exempts `/auth/login` and `/auth/register`, keeps the token on a rejected login, and skips the reload when already on `/login`.
- `MainLayout.jsx`: hydration keyed on `token && !user`.
- `AdminRoute.jsx` + `AdminDashboard.jsx`: loading spinner and fail-closed redirect instead of `null`.
- `CoursesSection.jsx`: explicit page argument and a single request per search submit.
No colour, spacing, typography, component or layout change was made.
Status: Fix Applied — Verification Incomplete

**Changed Files:**
- `.env` — removed the duplicate key; production active, `.env.local` documented for local API work (git-ignored, not part of the commit).
- `.env.example` — same single-key documentation.
- `src/services/api.js` — dev-only localhost fallback, production misconfiguration log, login/register-aware 401 handling.
- `src/layouts/MainLayout.jsx` — profile re-hydration after reload.
- `src/routes/AdminRoute.jsx` — loading state + redirect when the profile is unavailable.
- `src/pages/admin/components/AdminDashboard.jsx` — tracks and passes the profile-loading state.
- `src/components/CourseCard/CoursesSection.jsx` — search submit no longer races the page-reset effect.

**Verification:**
- Command: duplicate-key A/B `npx vite build --outDir dist-verify` — Result: `localhost in bundle: True`, `production URL: False` with the duplicate; after the fix `npm run build` → PASS, 2417 modules, 4.29s, `localhost:5000/api` occurrences **0**, production URL present.
- Command: `npm run build` after all Phase C edits — Result: PASS (2417 modules, 4.29s).
- Command: `npm run lint` — Result: **17 errors**, identical file/rule set to the Phase B end-state (unused vars, `set-state-in-effect`, `react-refresh/only-export-components`); no new error in any file changed here.
- Command: esbuild + node harness on the real `api.js` (old vs new) — Result: the four cases in section 3; login 401 no longer reloads or clears a session, other 401s still redirect.
- Command: esbuild + node harness on the real `authSlice` — Result: `oldConditionFires:false`, `newConditionFires:true` for a stored token after reload.
- Command: esbuild + node harness printing `api.defaults.baseURL` — Result: production build with the variable → `https://course-master-backend-ochre.vercel.app/api`; production build without it → `""` (no localhost) plus the configuration error; dev build without it → `http://localhost:5000/api`.
- Command: live API checks — Result: production root 200, `/api/courses` 200, `/api/auth/me` 401, invalid login 400; local `/api/courses` 200, invalid login 401; CORS preflight 204 with `*`.
- Browser verification: **Not performed** — the session's browser tools reported "No desktop browser is connected"; no click-through, console capture or screenshot exists for the reload, login-error, `/admin` loading or search-race scenarios.
- Known limitations: the deployed site keeps the old bundle until the worktree is committed, pushed and redeployed; the Vercel dashboard variable, not `.env`, controls that build. Locally the login-message fix is observable only with a backend that returns 401 (the local one does; the deployed one currently returns 400). `AdminRoute` fails closed: a transient `/auth/me` network error sends the admin to `/login` rather than showing a retry screen. The search fix is verified by source reasoning only — no request trace or browser run.

**Code Location Details:**
- File: `.env` — single `VITE_API_BASE_URL` — line 5; local override instructions lines 7-9.
- File: `src/services/api.js` — `baseURL` resolution — lines 4-16; response interceptor — lines 30-49.
- File: `src/layouts/MainLayout.jsx` — hydration effect — lines 13-21.
- File: `src/routes/AdminRoute.jsx` — loading branch — lines 3-10; null-profile redirect — lines 11-13.
- File: `src/pages/admin/components/AdminDashboard.jsx` — `loading` state — line 14; `finally` — lines 23-25; prop pass — line 31.
- File: `src/components/CourseCard/CoursesSection.jsx` — `fetchCourses(pageOverride)` — lines 24-25; submit handler — lines 54-65.

---

## Status overview

| ID | Severity | Priority | Status |
|---|---|---|---|
| BUG-001 | Critical | P1 | Fix Applied — Verification Incomplete |
| BUG-002 | High | P1 | Fix Applied — Verification Incomplete |
| BUG-003 | High | P2 | Fix Applied — Verification Incomplete |
| BUG-004 | High | P2 | Fix Applied — Verification Incomplete |
| BUG-005 | Medium | P3 | Fix Applied — Verification Incomplete |
| BUG-006 | Medium | P3 | Fix Applied — Verification Incomplete |
| BUG-007 | High | P2 | Fix Applied — Verification Incomplete |

Post-fix checks (Phase C): `npm run build` PASS (2417 modules, 4.29s); `npm run lint` 17 errors — one fewer than at audit time because the Navbar parameter disappeared with BUG-005, and none added by any fix group; the built bundle targets the production API with 0 localhost occurrences. No browser click-through was possible, so every group — including BUG-007 — keeps the "Verification Incomplete" status.

## Not grouped (outside the seven groups)

- `CourseCard.jsx:39-44` nests a `<div>` inside a `<p>` (invalid HTML, no observed visual impact).
- `StudentDashboard.jsx:502` tells the user to click "View Details" while the button is labelled "Details".

These are cosmetic/robustness items outside the seven groups; they are **not** part of any fix that will be proposed without separate approval.

## Suspected, not confirmed

- `CourseDetails` / `StudentDashboard` assume `enrollment.course` is always populated; the backend does populate it, so no defect was confirmed.
- `CourseDetails` does not dispatch `fetchMyEnrollments` itself (it relies on `MainLayout`). On a direct page load the "Enroll Now" button can be visible for a brief moment before the enrollment request resolves; no wrong final state was demonstrated, so it is not claimed as a defect.

## Limitations

1. No browser/console/screenshot verification was possible in any phase (browser tools disconnected), so interaction-level claims are backed by source, isolated runtime harnesses and live HTTP checks, not by clicks. This is why no group is marked fully verified.
2. No test framework exists in the project (`package.json` has no `test` script and no Jest/Vitest), so no automated suite could be run; `npm run lint` reports 17 pre-existing errors, all unrelated to these groups.
3. Login end-to-end was not exercised against production (no credential entry, no production writes). The invalid-credential status codes were measured without creating a session: production currently answers 400, the local backend (and the repository's controller) answers 401.
4. The worktree is neither committed nor pushed, and the deployed frontend still serves the pre-fix bundle, so none of these fixes are live. The production API base URL is supplied by the Vercel dashboard, not by the repository's `.env`.
5. The leaked admin JWT from BUG-001 stays valid until it expires or `JWT_SECRET` is rotated on the backend; the frontend removal does not revoke it, and that remediation is outside this repository.
