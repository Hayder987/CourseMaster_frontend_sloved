# CourseMaster Frontend — Bug Report

| Item | Value |
|---|---|
| Repository | `courseMaster_frontEnd` (local worktree: `D:\27.05.2026 computer\B7-Practise\problem_solving\courseMaster_frontEnd`) |
| Branch / HEAD | `main` / `e867fa4` (pushed; `origin/main` = `e867fa4`) |
| Remote | `https://github.com/Hayder987/CourseMaster_frontend_sloved.git` (fork, not the original `Pullock4981` repository) |
| Live frontend | https://course-master-front-end.vercel.app/ |
| Backend intended for production | `https://course-master-backend-ochre.vercel.app/api` |
| Audit dates | 2026-10-21 (initial audit and first six groups), 2026-10-22 (API/session group), 2026-10-22 (read-only re-audit), 2026-10-22 (BUG-001 and BUG-002 fix phases) |
| Report path | `BUG_REPORT_FRONTEND.md` |

**Current state:** HEAD `e867fa4` is unchanged and still contains the earlier approved fixes. Phase 1 of this pass (read-only) rewrote only this report. Phase 2, approved as **BUG-001**, fixed the login/registration credential handling; Phase 3, approved as **BUG-002**, fixed the session-verification model, the duplicate `/auth/me` calls and the fail-open guard; Phase 4, approved as **BUG-003**, fixed the enrollment-state timing (enrolled student / admin / creator flash); Phase 5, approved as **BUG-004**, made the course player reuse the shared enrollment state and show a retry on lookup failure; Phase 6, approved as **BUG-005**, fixed the CourseCard markup, the dashboard stats fallback and the dashboard error/empty-state confusion; Phase 7, approved as **BUG-006**, re-verified the admin analytics/update fixes, extracted the analytics mapping and added reducer/mapping tests. The phases added dependency-free regression tests (43 total); **no commit, push or deployment was made**. One frontend defect remains open (search ordering, BUG-007).

**Working-tree warning (observed 2026-10-22 01:31):** the git-ignored `.env` and the tracked `.env.example` were modified **outside this task** to target `http://localhost:5000/api` (the production line was commented out). They were not reverted, per the preservation rule. The current `npm run build` therefore targets localhost and must not be deployed; see 5.1. This is a BUG-007 environment blocker, not a BUG-001 code defect.

---

## 1. Project and audit scope

CourseMaster is a React 19 + Vite single-page application using Redux Toolkit, React Router, Axios, Tailwind CSS and DaisyUI. It has public course browsing, login/registration, a student dashboard, an enrolled-only course player (video, quiz, assignment), and an admin area (courses, video classes, enrollments, assignment review, analytics, users).

**In scope**

- Every file under `src/` (entry point, providers, router, layouts, pages, components, contexts, services, Redux slices, utilities).
- `README.md`, `package.json`, the lockfile, `.env.example`, Vite configuration, deployment-related files.
- Frontend-to-backend contracts read from the backend repository **read-only** (no backend file was modified).
- Live read-only HTTP checks against the production and local APIs.
- Live inspection of the deployed JavaScript bundle.

**Out of scope / not done**

- Backend code changes, database seeding, credential issuance, JWT revocation, Vercel project settings.
- Commits, pushes or deployments made during this re-audit.
- Real-credential login (no valid credentials were available; no account was created and no production data was written).

**Preservation rule:** the existing design, colours, layout, typography, component structure and routing are preserved. All proposed changes below are minimal and targeted.

---

## 2. Audit methodology

1. **Repository state:** `git status`, branch, remotes, last commits, ahead/behind, tracked files, existing diff.
2. **Static trace:** read the full login/registration → token storage → Axios interceptor → `/auth/me` → protected-route → role-guard chain, then the course, enrollment, player, dashboard, assignment, quiz and admin paths.
3. **Repo-wide searches:** `dev_bypass`, JWT-shaped strings (`eyJ…`), `localStorage`/`sessionStorage`, `Authorization`, `payload.data`, `price * 100`, `topCourses`, `AdminRoute`, `ProtectedRoute`, `MainLayout`, `getMe`, enrollment state, search/pagination, loading flags.
4. **Contract comparison:** frontend payloads and response assumptions were compared with the backend controllers/services (read-only).
5. **Runtime harnesses:** isolated Node/esbuild harnesses executed the real `utils/auth.js`, `services/api.js`, `authSlice`, `enrollmentSlice` and `adminSlice` with stubbed browser APIs. Temporary files live outside the repository.
6. **Live HTTP checks:** read-only `GET` requests and a login probe with the credentials published by the frontend itself. Tokens and passwords were redacted from all output.
7. **Build/lint/test:** `npm run build`, `npm run lint` and (after BUG-001) `npm test`, which runs the dependency-free Node suite.
8. **Deployed bundle:** fetched `index.html` and the referenced JS asset, then searched for the known pre-fix markers.
9. **Browser:** attempted repeatedly; the session has **no connected browser**, so no clicks, console capture or screenshots were possible.

At the start of Phase 1 the project had no test framework (`package.json` exposed only `dev`, `build`, `lint`, `preview`). BUG-001 (Phase 2), BUG-002 (Phase 3), BUG-003 (Phase 4), BUG-004 (Phase 5), BUG-005 (Phase 6), BUG-006 (Phase 7) and BUG-007 (Phase 8) added a dependency-free Node test runner (`node --test`), now with 50 tests; there is still no React DOM/browser test dependency.

---

## 3. Login failure investigation and evidence

### 3.1 Reported symptom

The login form displays:

> Invalid email or password

even when the user believes the credentials are valid.

### 3.2 Full trace of the implemented flow

| Step | Implementation | Audit result |
|---|---|---|
| Form state | `src/pages/Login/Login.jsx:10` — `{ email, password }` | Correct field names |
| Submit | `Login.jsx:22-38` → `loginUser(form)` | Correct |
| Service | `src/services/auth.api.js:4` → `POST /auth/login` | Correct endpoint and method |
| API base URL | `src/services/api.js:4-16` — `VITE_API_BASE_URL`, dev-only localhost fallback | Correct; production bundle resolves to the production API |
| Request body | Axios JSON `{ email, password }` | Matches the backend `loginSchema` |
| Response handling | `saveToken(res.data.token)`; `navigate("/")`; reload | Correct only after a **successful** response |
| Token key | `src/utils/auth.js:1-4` — `user_token` for save/read | Consistent (fixed in `e867fa4`) |
| Request header | `src/services/api.js:19-28` — `Authorization: <token>` | Matches the backend extractor |
| Hydration | `src/layouts/MainLayout.jsx:13-21` — `token && !user` | Fetches the profile after reload (fixed in `e867fa4`) |
| Current user | `src/services/auth.api.js:5` → `GET /auth/me` | Endpoint correct |
| Protected routes | `src/routes/ProtectedRoute.jsx`, `src/routes/AdminRoute.jsx` | Route checks exist; transient-error behaviour still defective (see BUG-002) |

### 3.3 Live evidence (read-only)

| Check | Result |
|---|---|
| `GET https://course-master-backend-ochre.vercel.app/api/courses?limit=1` | **200** (API reachable, real data) |
| `GET https://course-master-backend-ochre.vercel.app/api/auth/me` without a token | **401** (expected) |
| `POST …/api/auth/login` with the credentials published in `README.md` | **400** `{"message":"Invalid email or password"}` |
| `POST http://localhost:5000/api/auth/login` with the same published credentials | **401** `{"message":"Invalid email or password"}` |
| `POST …/api/auth/login` with the credentials hardcoded in the login page's “Quick Demo Credentials” buttons | **400** (production) |
| CORS preflight from the live frontend origin | **204**, `Access-Control-Allow-Origin: *` |
| Deployed bundle | references `https://course-master-backend-ochre.vercel.app/api` |

The rejection is generated by the backend's own auth service (`"Invalid email or password"`), not by the frontend. The request reached the intended host, used the intended endpoint and field names, and was answered with a well-formed JSON error. The frontend correctly kept the form mounted for `400`/`401` (the 401 interceptor exempts `/auth/login`).

### 3.4 Root cause established

The credentials that the repository and the UI publish are **stale**. The backend's seed path was hardened: `src/utils/seedCredentials.js` refuses well-known/default passwords (including the password printed in `README.md`) and requires explicit `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment values. The backend's own tests assert that the old published password must not appear in the seed or the backend README. Both the production and local databases therefore reject the published demo credentials.

Before BUG-001, the frontend still:

- printed the old admin password in `README.md`, and
- offered “Quick Demo Credentials → Admin Fill / Student Fill” buttons in `Login.jsx` (formerly lines 60-85) that injected those same rejected values.

A user who followed either path would always see “Invalid email or password”. This was a frontend documentation/UX/security defect even though the auth request itself was implemented correctly. BUG-001 removed both paths and the demo-email placeholder; the only remaining login blocker is the absence of a valid account.

### 3.5 What the login failure is **not**

- **Not an API-URL problem:** the live bundle calls the production API; direct requests to it return the backend's JSON error.
- **Not a payload problem:** raw `curl` with `{email,password}` reproduces the same rejection.
- **Not a response-shape problem:** no success response was received, so token extraction/unwrapping never ran.
- **Not the old token-key mismatch:** that defect was real but could only show up *after* a successful login; it was fixed in `e867fa4`.
- **Not a CORS problem:** preflight succeeds with `*`, and server-side requests are unaffected.

### 3.6 Acceptance criteria status

| Criterion | Status |
|---|---|
| Invalid credentials remain rejected | **Verified** (both hosts) |
| Successful credentials authenticate | **Blocked** — no valid credentials available; no account was created |
| Token stored and read consistently | **Source-verified**; real-token round trip **not executed** |
| `/auth/me` uses the correct token | **Source-verified**; live success case **blocked** |
| Auth state/navigation correct after login | **Source-verified**; browser **blocked** |
| Network/server errors distinguished from bad credentials | **Met in source** — `getLoginErrorMessage` plus 3 passing tests; browser not run |
| No hardcoded authentication bypass | **Verified in current source**; bundled/historical token revocation is a backend action |

### 3.7 Conclusion

The reported login failure is **reproducible and explained**: the backend is reachable and correctly rejects the only credentials the frontend gave the user. The frontend's auth plumbing (URL, payload, token key, hydration) is no longer the cause. Those two frontend actions — removing the dead credentials and distinguishing transport/server failures — were completed in BUG-001 (Phase 2). Real successful-login verification still requires a valid account from the backend owner.

---

## 4. Disposition of the eight previously reported issues

| Issue | Finding | Evidence | Group | Status |
|---|---|---|---|---|
| **A — Missing browser verification** | Confirmed limitation, not an application defect | `browser.tabs.list()` → `[browser.disconnected] No desktop browser is connected`; the 9 added tests cover only pure auth helpers | Cross-cutting | **Blocked** |
| **B — Deployed site contains an old bundle** | Confirmed | Live asset is still `index-H7pn9ZKo.js` with `dev_bypass` (4), `price*100` (1), no login-401 exemption; HEAD `e867fa4` is pushed but not deployed | BUG-001, BUG-007 | **Blocked on deployment** |
| **C — Backend 400 vs 401 divergence** | Confirmed backend inconsistency; frontend handles both | Production 400, local/repository 401; login form shows the backend message; 401 interceptor exempts auth routes; BUG-001 now separates transport/5xx errors | BUG-001 | **Handled in frontend; backend divergence outside scope** |
| **D — AdminRoute fails closed on transient network failure** | Confirmed | Previously `AdminRoute.jsx` redirected whenever `me` was null and `authSlice` cleared the token on **any** `getMe` failure; Phase 3 clears the token only on 401/403 and shows a retry panel | BUG-002 | **Fixed at source (unit-tested)** |
| **E — Previously leaked admin JWT** | Confirmed historical exposure; source is clean | No JWT-shaped literal, `dev_bypass` bypass or hardcoded credential remains in `src/`; the leaked token is still valid server-side until expiry/secret rotation; BUG-001 removed the published password from `README.md` | BUG-001 | **Source fixed; revocation blocked on backend** |
| **F - CourseCard invalid HTML** | Confirmed | `CourseCard.jsx` nested the avatar `<div>` inside `<p>`; Phase 6 changes the row to a `<div>` with the same classes | BUG-005 | **Fixed at source (tested)** |
| **G - StudentDashboard "View Details" wording** | Confirmed | Button label is "Details"; the fallback told the user to click "View Details" and appeared only after expansion; Phase 6 replaces it with “Could not load course statistics.” + Retry | BUG-005 | **Fixed at source (tested)** |
| **H - CourseDetails enrollment-state flash** | Confirmed by state trace | `alreadyEnrolled` was computed from `myEnrollments`, which starts as `[]`, and the slice had no "loaded" flag; Phase 4 adds `loaded`/`loadError` and gates the action (`CourseDetails.jsx` `pendingCheck`; `enrollmentSlice.js:83-99`) | BUG-003 | **Fixed at source (unit-tested)** |
| **H2 - Admin/creator "Enroll Now" flash** | Confirmed by state trace | `isAdmin`/`cannotEnroll` depend on `user`, which is `null` until `/auth/me` resolves; Phase 4 gates the action on profile resolution too | BUG-003 | **Fixed at source (unit-tested)** |

---

## 5. Baseline: environment, commands and live checks

### 5.1 Environment configuration

| File | State | Notes |
|---|---|---|
| `.env.example` | **External uncommitted edit** — production line commented out, localhost line active | Not made by this task; only a template (not loaded by Vite); must be restored before deployment |
| `.env` | **External uncommitted edit** — active `VITE_API_BASE_URL` = `http://localhost:5000/api` | Git-ignored; not committed; the current build therefore targets localhost |
| `.env.local` | Not present | Optional local override (`http://localhost:5000/api`) |
| Vite prefix | `VITE_` only | Only public build-time values are exposed |

No token, password, JWT secret or private key is stored in a `VITE_` variable. The API base URL is public by design.

> **Deployment blocker (observed 2026-10-22 01:31, outside BUG-001):** both env files now select the local API. The BUG-001 build below is a successful compile, but its emitted bundle contains `http://localhost:5000/api`, so it is **not deployment-ready**. This is a BUG-007 environment regression and was not reverted; restoring the production URL requires the owner's decision.

### 5.2 Repository baseline (measured 2026-10-22)

| Command | Result |
|---|---|
| `git status --short` | clean at the start of Phase 1 (before BUG-001) |
| `git log --oneline -2` | `e867fa4` (HEAD), `14e57e8` |
| `git rev-list --left-right --count origin/main...HEAD` | `0  0` (HEAD is pushed) |
| `npm run build` | **PASS** — 2417 modules, built in **9.79 s**; `dist/assets/index-UAyuBP96.js` (baseline, before BUG-001) |
| `npm run lint` | **FAIL (baseline)** — **17 errors, 0 warnings**, same 10 files as before; none introduced by the fixes |
| Test framework | None at baseline; BUG-001 added 9 dependency-free Node tests |
| Browser automation | **Unavailable** — disconnected |
| Deployed bundle | `index-H7pn9ZKo.js`, still pre-fix |

### 5.3 Live read-only checks

| Check | Result |
|---|---|
| `GET …/api/courses?limit=1` (production) | 200 |
| `GET …/api/courses?limit=1` (local) | 200 |
| `GET …/api/auth/me` (no token) | 401 |
| Invalid login (production) | 400, JSON message |
| Invalid login (local) | 401, JSON message |
| CORS preflight | 204, `*` |
| Deployed bundle markers | `dev_bypass=4`, `price*100=1`, `localhost:5000=0`, login-401 exemption absent |

### 5.4 Baseline lint failures (pre-existing, not caused by the fixes)

17 errors across `CoursesSection.jsx`, `CoursesPreview.jsx`, `ThemeContext.jsx`, `CoursePlayer.jsx`, `CourseDetails.jsx`, `AdminSidebar.jsx`, `CreateCourse.jsx`, `EditCourse.jsx`, `VideoClasses.jsx` and `ProtectedRoute.jsx`. The rules are unused variables, `react-hooks/set-state-in-effect`, `react-refresh/only-export-components` and `no-unused-vars`. All are baseline issues; the fix phases must not add new ones.

---

## 6. Bug-fix groups

# BUG-001 — Credential handling, shipped credentials, and login error classification

**1. Location & Steps**

Page/Route: `/login`, `/register`, every protected route; `README.md`.
Files: `src/pages/Login/Login.jsx`, `src/utils/auth.js`, `src/services/api.js`, `src/routes/ProtectedRoute.jsx`, `src/components/shared/Navbar.jsx`, `README.md`.
Component/Function/Code Location: `Login.handleSubmit` (`Login.jsx:19-36`); `getLoginErrorMessage` (`utils/loginError.js:9-25`); “Quick Demo Credentials” (historical, removed); `saveToken`/`getToken`/`clearToken` (`utils/auth.js:1-9`); request interceptor (`api.js:19-28`); response interceptor (`api.js:30-49`); README “Demo accounts” section.

Steps to reproduce:

1. Open `/login`.
2. Click “Admin Fill” or “Student Fill”, then “Sign In”.
3. Alternatively, copy the admin credentials printed in `README.md` and sign in.
4. Observe “Invalid email or password”.
5. Disconnect the network (or stop the local backend), submit the form, and observe that the message still tells the user to check credentials.

**2. Expected vs. Actual**

Expected: the UI must not advertise credentials the backend rejects; a rejected login must preserve the backend's message; a transport failure must be reported as a network/server problem; no credential material may ship in the client or be committed; a successful login stores one token and every later request uses it.

Actual (historical, now fixed in `e867fa4`):

- `saveToken` wrote `user_token` while `getToken` read `token`, so a successful login never authenticated later requests. Logout also failed to remove the key that login had written.
- `Login.jsx` shipped hardcoded JWT literals and a “Dev Route Inspector Bypass” that wrote a token plus `dev_bypass`; `ProtectedRoute` and `Navbar` honoured the bypass. The embedded admin token was accepted by the live backend (`GET /auth/me` → 200, `role=admin`).
- `clearToken` did not remove the legacy keys, so bypass residue survived logout.

Actual (before Phase 2; the three items below were fixed in this phase):

- `README.md` published the old admin password and `Login.jsx` pre-filled it and a student password. The backend explicitly rejects those values (section 3.4), so the helper buttons guaranteed failure. Both paths are now removed.
- `Login.jsx` used `err.response?.data?.message || "Login failed. Please check your credentials."`. When there was **no response** (DNS failure, offline, CORS/network error, timeout), the user was told their credentials were wrong; a 5xx was also collapsed into the same message. The form now calls `getLoginErrorMessage`.
- `Register.jsx` ignored the token returned by `POST /auth/register` and redirected to `/login`, so a successful registration required a second login. It now stores the token and continues like login.

Root cause: credential documentation/UI was not updated when the backend seed was hardened; the login catch block had no transport/server branch; the registration page bypassed the session path. BUG-001 addresses all three.

**3. Severity & Evidence**

Severity: **Critical** (historical bypass) / **High** (stale credential UI and misleading errors).
Priority: **P1**.

Evidence:

- Static scan for JWT-shaped strings and `dev_bypass` over `src/`: no hardcoded JWT and no bypass check remain; only `localStorage.removeItem("dev_bypass")` in `auth.js:8`.
- Live and local login probes with the published credentials: production **400**, local **401**, both with `"Invalid email or password"`.
- Backend `seedCredentials.js` rejects that password and requires env-provided credentials; backend tests assert the old password is gone.
- Before Phase 2, the frontend contained both quick-fill literals and the README line. After Phase 2, a search for the email/password literals and “Quick Demo Credentials” over `src/` and `README.md` returns **0** matches.
- `npm test` — 9/9 pass, including the network-vs-credential message cases.
- No browser/screenshot evidence (browser disconnected).

**4. Fix & Verification**

Fix (historical, applied in `e867fa4`, committed and pushed):

- One token key (`user_token`) for save/read; `clearToken` removes `user_token`, the legacy `token` key and `dev_bypass`.
- Removed the hardcoded JWT literals, the “Dev Route Inspector Bypass” UI, the `ProtectedRoute` bypass branch, and the `Navbar` bypass branch.
- Removed the credential exposure from the login page's bypass block and the dead `/profile`/`/about` navigation (the latter in BUG-005).

Fix (Phase 2, approved BUG-001):

- Deleted the “Quick Demo Credentials” block, `handleQuickLogin`, and the unused `ShieldCheck`/`UserCheck` imports from `Login.jsx`; replaced the demo-email placeholder with `you@example.com`; added `role="alert"` to the error box.
- Removed the published admin password from `README.md` and replaced it with a note that the backend owner provisions accounts.
- Added `src/utils/loginError.js`: no response → connection message; 5xx → server message/fallback; 400/401/403 → backend message; anything else → generic fallback. `Login.handleSubmit` now uses it.
- `Register.jsx` saves the returned token, navigates home, and reloads (the same hydration pattern as login); if no token is returned it falls back to `/login`.
- Added a dependency-free regression suite and a `test` script.

Files Changed:
- Historical: `src/utils/auth.js`, `src/pages/Login/Login.jsx`, `src/routes/ProtectedRoute.jsx`, `src/components/shared/Navbar.jsx`.
- Phase 2: `src/pages/Login/Login.jsx`, `src/utils/loginError.js` (new), `src/pages/Register/Register.jsx`, `README.md`, `package.json`, `tests/loginError.test.js` (new), `tests/authStorage.test.js` (new), `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/loginError.test.js` — 7 cases: network, 5xx with/without message, 401, 400, 403, unexpected status.
- `tests/authStorage.test.js` — 2 cases: save/read uses `user_token`; `clearToken` removes the session + legacy `token` + `dev_bypass`.
- `npm test` runs `node --test "tests/**/*.test.js"`. No React DOM/browser test dependency was added.

Verification Results:

- `npm test` — **PASS**, 9 tests, 0 failures, 90.8 ms.
- `npm run build` — **PASS**, 2417 modules, ≈4.1 s. **Environment caveat:** the current `.env` was externally switched to localhost, so this bundle contains `http://localhost:5000/api` and is not deployment-ready (see 5.1).
- `npm run lint` — 17 baseline errors, 0 warnings; the new tests introduced no new errors (count unchanged).
- Static scan — 0 stale credential literals, 0 “Quick Demo Credentials”, 0 hardcoded JWT/`dev_bypass` checks.
- Live invalid-login — production 400, local 401, message preserved; valid-login round trip **not executed** (no valid credentials).
- Browser — **not performed** (disconnected).

Status: **Partially Fixed** — all six code-level findings in this group are fixed at source (three historical + three in Phase 2); the group stays partial because the leaked JWT is not revoked, a successful login could not be verified, and the deployed bundle is old.

Known limitations: removing a token from the client does not revoke it server-side; the backend owner must rotate `JWT_SECRET`. Without a valid account, a successful login cannot be demonstrated. The current localhost build is an external environment change, not part of this fix.

Code Location Details:

- `src/pages/Login/Login.jsx` — submit/catch 19-36; error alert 57-64; email placeholder 79; quick-fill block and handler removed.
- `src/utils/loginError.js` — `getLoginErrorMessage` 9-25.
- `src/pages/Register/Register.jsx` — token handling 33-44.
- `src/utils/auth.js` — `TOKEN_KEY`/save/get/clear — lines 1-9.
- `src/services/api.js` — request interceptor 19-28; response interceptor 30-49.
- `src/routes/ProtectedRoute.jsx` — bypass removed; current verification effect 10-23.
- `README.md` — “Demo accounts” section near the top.

---

# BUG-002 — Session hydration, protected routes, and transient verification failures

**1. Location & Steps**

Page/Route: `/student`, `/courses/:id/player`, `/admin/*`, any page after a reload.
Files: `src/store/slices/authSlice.js`, `src/store/slices/enrollmentSlice.js`, `src/layouts/MainLayout.jsx`, `src/routes/ProtectedRoute.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/admin/components/AdminDashboard.jsx`, `src/pages/student/StudentDashboard.jsx`.

Steps to reproduce:

1. Sign in (or seed a valid `user_token`), then reload `/student` and `/admin`.
2. Open `/admin` while `/auth/me` is slow, then simulate a network failure for `/auth/me`.
3. Inspect the Network panel: `/auth/me` is requested by `MainLayout`, `ProtectedRoute` and `AdminDashboard` on the same navigation.
4. Sign in with a student token and open `/admin`.
5. Make `GET /enrollments/my` fail and open `/student`.

**2. Expected vs. Actual**

Expected: the profile is fetched once per session; a protected screen shows a spinner while verification runs; an authenticated admin reaches `/admin`; an authenticated non-admin is redirected to `/student`; an unauthenticated user goes to `/login`; a **transient** verification failure shows a retry path instead of destroying the session; a failed enrollment request shows an error, not “No courses enrolled yet”.

Actual (historical, fixed in `e867fa4`): `enrollmentSlice` stored `action.payload.data` while the API returns a bare array, making `enrollments` `undefined` and crashing the dashboard; `MainLayout` hydrated on `token && !isAuthenticated`, which is false after a reload (so the profile was never fetched); `AdminRoute` returned `null` for a null `me`, producing a blank `/admin`.

Actual (before Phase 3; items 1–3 below were fixed in this phase):

- **Issue D — transient failure destroyed the session.** `authSlice.getMeAsync` called `clearToken()` for *every* error (network, timeout, 5xx, 401). `AdminRoute` then saw no profile and redirected to `/login`, and `AdminDashboard` swallowed the cause with no retry. A temporary outage was indistinguishable from a revoked session.
- **Duplicate verification.** `MainLayout.jsx` dispatched `getMeAsync`; `ProtectedRoute.jsx` called `getMe()` independently; `AdminDashboard.jsx`, `Navbar.jsx`, `ManageUsers.jsx` and `CourseDetails.jsx` each issued further `/auth/me` requests, so one navigation could fire four or five. Every redundant call site is now removed: only `MainLayout` hydrates, plus the two guard Retry buttons and one defensive fetch on the enroll click.
- **Fail-open in `ProtectedRoute`.** Its `.catch` set `setIsValid(!!token)`, so a failed verification (including a 401) still rendered the protected child. The guard now fails closed.
- **Misleading empty state (cross-group, fixed in Phase 6).** `StudentDashboard` used to show the error alert and also "No courses enrolled yet" because `enrollments` remained `[]`. BUG-003 added the slice’s `loaded`/`loadError`, and Phase 6 (BUG-005) now gates the empty card on them.

Root cause: authentication state had no explicit “verifying / verified / transient-error” model; verification was duplicated across components; the thunk conflated HTTP 401 with transport failure; the enrollment slice has no `loaded` flag.

**3. Severity & Evidence**

Severity: **High**.
Priority: **P1**.

Evidence:

- Source trace of the previous `/auth/me` call sites (`MainLayout.jsx`, `ProtectedRoute.jsx`, `AdminDashboard.jsx`, `Navbar.jsx`, `ManageUsers.jsx`, `CourseDetails.jsx`). After Phase 3, `Select-String` for `getMe()` / `getMeAsync(` in `src/` returns only `authSlice` (thunk body), `MainLayout` (the single dispatch), `CourseDetails` (on-demand on the enroll click) and the two guard Retry buttons.
- `authSlice.js` previously cleared the token in the catch regardless of `err.response`; it now clears it only when the rejected payload carries `isAuthError`.
- `AdminRoute.jsx` previously had a single `!me` branch → `/login`; it now renders a retry panel on a transient error.
- `ProtectedRoute.jsx` previously fell back to `!!token`; the fallback is gone (fail closed).
- `npm test` — 5 new reducer tests cover the verified / auth-error / transient / logout / login transitions.
- Browser reproduction of the transient case — **not performed** (disconnected).

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- `enrollmentSlice` stores the array (`Array.isArray(payload) ? payload : []`) and the dashboard defaults to `[]`.
- `MainLayout` hydrates on `token && !user`.
- `AdminDashboard` tracks `loading`; `AdminRoute` shows a spinner and redirects when no profile is available.
- `AdminRoute` was added as the role guard (admin → render, non-admin → `/student`, no profile → `/login`).

Fix applied in Phase 3 (approved BUG-002):

- `authSlice`: added `checked` and `verifyError` to the state; `getMeAsync` now rejects with `{ message, isAuthError }`; the token is cleared **only** on 401/403, while network/timeout/5xx keep the token and store a `verifyError`. `logout` and the login/register success paths reset the new fields.
- `ProtectedRoute`: no longer calls `getMe()` or holds local state; it reads the shared session state, renders children only for a verified profile, fails closed otherwise, and shows a Retry / Sign in again panel on a transient error.
- `AdminRoute`: now consumes the shared session state (no `me`/`loading` props), keeps the role check, and shows the same retry panel on a transient error.
- `AdminDashboard`: removed its own `getMe()` and `useState`/`useEffect`; it simply renders `AdminRoute`.
- Duplicate-call cleanup: `Navbar` and `ManageUsers` now read `state.auth.user` instead of calling `getMe`; the redundant hydration effect in `CourseDetails` was removed.
- `services/api.js`: `const env = import.meta.env || {}` so the module can also be imported by the Node test runner; no change to Vite behaviour.

Files Changed (historical): `src/store/slices/enrollmentSlice.js`, `src/pages/student/StudentDashboard.jsx`, `src/layouts/MainLayout.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/admin/components/AdminDashboard.jsx`.
Files Changed (Phase 3): `src/store/slices/authSlice.js`, `src/routes/ProtectedRoute.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/admin/components/AdminDashboard.jsx`, `src/components/shared/Navbar.jsx`, `src/pages/admin/pages/ManageUsers.jsx`, `src/pages/CousrseDetails/CourseDetails.jsx`, `src/services/api.js`, `tests/authSlice.test.js` (new), `tests/register-hook.mjs` (new), `tests/extension-resolve-hook.mjs` (new), `package.json`, `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/authSlice.test.js` — 5 cases: fulfilled marks the session verified; 401/403 clears it; a transient failure keeps the token and sets `verifyError`; `logout` resets; login marks verified.
- The Node runner now loads a small resolver hook (`tests/register-hook.mjs` → `tests/extension-resolve-hook.mjs`) so Vite's extensionless imports resolve under `node --test`.

Verification Results:

- `npm test` - **PASS**, 14 tests at this phase, 0 failures (5 new + 9 from BUG-001); the suite is 20 after BUG-003.
- `npm run build` — **PASS**, 2417 modules, ≈4.3 s.
- `npm run lint` — **16 errors, 0 warnings** (down from 17: removing the `ProtectedRoute` effect also removed its `react-hooks/set-state-in-effect` error); no new errors.
- Static trace — one automatic `/auth/me` per load; `/admin` no longer fires three.
- Browser/network-failure reproduction — **not performed**.

Status: **Partially Fixed** - Issue D, duplicate verification and fail-open are fixed at source and unit-tested; the misleading empty state is now fixed in Phase 6 (BUG-005), and browser/admin end-to-end verification is blocked.

Known limitations: without a valid account and a browser, the admin/transient paths cannot be exercised end-to-end.

Code Location Details:

- `src/store/slices/authSlice.js` — `getMeAsync` 31-56; state incl. `checked`/`verifyError` 61-72; `logout` 74-82; `getMeAsync` handlers 126-153.
- `src/routes/ProtectedRoute.jsx` — full guard 1-55 (no `getMe`, fail closed, retry panel).
- `src/routes/AdminRoute.jsx` — full guard 1-52 (shared state, retry panel).
- `src/pages/admin/components/AdminDashboard.jsx` — now 1-29 (no `getMe`).
- `src/components/shared/Navbar.jsx` — session read from Redux (no `getMe`).
- `src/pages/admin/pages/ManageUsers.jsx` — self-check from `state.auth.user`.
- `src/pages/CousrseDetails/CourseDetails.jsx` — redundant hydration effect removed.
- `src/layouts/MainLayout.jsx` — single hydration 13-21.
- `src/pages/student/StudentDashboard.jsx` - error + empty state 166-183 (fixed in Phase 6, BUG-005).

---

# BUG-003 — Course price, batch selection, and enrollment-state timing

**1. Location & Steps**

Page/Route: `/courses/:id`, `/courses`.
Files: `src/pages/CousrseDetails/CourseDetails.jsx`, `src/components/CourseCard/CourseCard.jsx`, `src/store/slices/enrollmentSlice.js`, `src/services/enrollment.api.js`.

Steps to reproduce:

1. Open a course whose API `price` is `4500`; compare the card and the details page.
2. Select the first batch and press “Enroll Now”.
3. Sign in as an already-enrolled student and open the course URL directly (hard refresh).
4. Sign in as an admin (or the course creator) and open the same URL directly.

**2. Expected vs. Actual**

Expected: the details page shows the same amount as the card; the selected batch's real `_id` is sent; an enrolled student sees “Go to Dashboard” immediately; an admin/creator sees “Manage Course” or the creator notice, never “Enroll Now”.

Actual (historical, fixed in `e867fa4`):

- The details page rendered `course.price * 100` (`৳450,000` for a `৳4,500` course). The deployed bundle still contains `price*100`.
- `handleEnroll` sent `selectedBatchId.toString()`, i.e. the array index `"0"`, while the backend expects a Mongo `ObjectId`; the cast failed and enrollment was rejected. The `{selectedBatchId && …}` confirmation was also false for index `0`.

Actual (before Phase 4; items 1–2 were fixed in this phase):

- **Issue H — enrollment-state flash.** `alreadyEnrolled` is derived from `myEnrollments`, which was `[]` until `GET /enrollments/my` resolved, and the slice had no `loaded` flag, so an enrolled student could briefly see “Enroll Now”. Clicking it in that window could dispatch a second enrollment request (the backend then rejects it as already enrolled).
- **Admin/creator flash.** `isAdmin`/`cannotEnroll` depend on `user`, which was `null` until `/auth/me` finished, so an admin or the instructor also saw “Enroll Now” on a direct load.
- The slice could not say “not fetched yet” vs. “fetched and empty”, which was the root of both flashes.

Root cause: the enrollment/profile checks were derived from initial empty state without a loading gate; the data slices did not expose a “loaded” flag.

**3. Severity & Evidence**

Severity: **High** (historical wrong price and failed enrollment) / **Medium** (current flash).
Priority: **P2**.

Evidence:

- Live `GET /api/courses` returned `price: 4500` and real `batches[0]._id`.
- Backend `Enrollment.batchId` is an optional `ObjectId`; casting `"0"` fails with a BSON error (earlier harness).
- Before Phase 4, `CourseDetails.jsx` computed `alreadyEnrolled` from `myEnrollments` only, gated the page on `detailLoading` alone, and rendered the enroll button unconditionally; `enrollmentSlice.js` initialised `enrollments: []` with no `loaded`. Phase 4 adds `loaded`/`loadError` and a `pendingCheck` gate.
- `npm test` — 6 new reducer tests cover the loaded/`loadError` transitions.
- No browser trace of the flash (browser disconnected); the race is established from the state machine.

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- Price rendered as `course.price?.toLocaleString()`; batch selection stores and sends `batch._id`; no-batch enrollment sends `{}`; confirmation uses `selectedBatchId !== null`.
- Enrollment payload is normalised to an array.

Fix applied in Phase 4 (approved BUG-003):

- `enrollmentSlice` now exposes `loaded` and `loadError`, set on both fulfilment and rejection; `clearError` clears both `error` and `loadError`. `loaded` deliberately stays true across a refetch so a retry does not re-show the “Checking…” state.
- `CourseDetails` computes `pendingCheck` (profile not yet verified, or enrollments not yet loaded) and `checkError` (transient profile or enrollment-load failure). While pending it renders a disabled “Checking enrollment…” button; on failure it renders the message with a Retry that re-dispatches `getMeAsync` or `fetchMyEnrollments`. “Enroll Now” is only rendered once both the profile and the enrollment list are resolved.
- The “enroll to view the syllabus” info card is also suppressed while pending or errored, so it cannot flash before the state is known.

Files Changed (historical): `src/pages/CousrseDetails/CourseDetails.jsx`, `src/store/slices/enrollmentSlice.js`, `src/services/enrollment.api.js`.
Files Changed (Phase 4): `src/store/slices/enrollmentSlice.js`, `src/pages/CousrseDetails/CourseDetails.jsx`, `tests/enrollmentSlice.test.js` (new), `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/enrollmentSlice.test.js` — 6 cases: initial (not loaded, empty); fulfilled marks loaded; non-array payload guard; rejected marks loaded + `loadError`; `clearError` clears both; a successful enroll appends.

Verification Results:

- `npm test` — **PASS**, 20 tests, 0 failures (6 new).
- `npm run build` — **PASS**, 2417 modules, ≈4.3 s.
- `npm run lint` — 16 errors, 0 new (the unused `err` in `CourseDetails.handleEnroll` is baseline).
- Price/batch harness (earlier): old `450000` vs. new `4,500`; old batch payload `"0"` vs. new real id; first-batch confirmation false → true.
- Browser click-through — **not performed**.

Status: **Partially Fixed** — Issue H and the admin/creator flash are fixed at source and unit-tested; browser click-through is still blocked.

Known limitations: the flash is a timing state; without a browser it was not photographed or measured. The fix is verified at the state-machine level.

Code Location Details:

- `src/store/slices/enrollmentSlice.js` — state incl. `loaded`/`loadError` 48-59; `clearError` 60-63; fetch handlers 83-99.
- `src/pages/CousrseDetails/CourseDetails.jsx` — `pendingCheck`/`checkError`/`retryCheck` 41-54; price 131; action branch 137-185; syllabus info gate 253; batches 282-322.
- `src/services/enrollment.api.js` — batch payload 3-5.

---

# BUG-004 — Course player access, completion state, video sizing, and enrollment-error handling

**1. Location & Steps**

Page/Route: `/courses/:id/player`.
File: `src/pages/CoursePlayer/CoursePlayer.jsx`.

Steps to reproduce:

1. Sign in with an account not enrolled in the course and open the player URL directly.
2. As an enrolled student, mark a lesson complete and reopen it.
3. Open a lesson with a YouTube URL on desktop and mobile.
4. Make `GET /enrollments/my` fail, then open the player.

**2. Expected vs. Actual**

Expected: only enrolled students see the player; completed lessons show a disabled “Completed” state; the iframe fills its card at 16:9; a failed enrollment lookup shows an error/retry rather than pretending the user is not enrolled.

Actual (historical, fixed in `e867fa4`):

- The player rendered all modules/lessons, video, quiz and assignment for any signed-in user, because the only check was `if (!currentCourse)`.
- The completion check compared the lesson **object** with `completedLessons` (which stores ids), so it never matched; the sidebar marker disagreed with the button.
- The iframe used inline `height: 700px; width: 300px`.

Actual (before Phase 5; fixed in this phase):

- The enrollment lookup was duplicated: the component called `getMyEnrollments()` directly while `MainLayout` and the global slice also fetch enrollments.
- If that request failed, `enrollmentChecked` became true with `enrollment === null`, so the component redirected to `/courses/:id` as if the user were not enrolled. The failure was only logged to the console; the user got no retry or explanation. This was a fail-closed security decision (good) but a poor error state.
- Completing a lesson (or submitting an assignment/quiz) triggered additional `fetchMyEnrollments()` refreshes even though the shared slice already held the updated enrollment.

Root cause: the component owned a second enrollment fetch instead of consuming the shared state, and it had no distinction between “not enrolled” and “lookup failed”.

**3. Severity & Evidence**

Severity: **High** (historical access bypass) / **Low–Medium** (current error handling).
Priority: **P2**.

Evidence:

- Gate (before Phase 5): spinner → `!currentCourse` → `!enrollment` redirect; the redirect fired even when the lookup had failed.
- Completion comparison uses `lesson._id`.
- Iframe `className="w-full aspect-video"`.
- Duplicate fetch sites (before Phase 5): the component's own `getMyEnrollments()` call plus `MainLayout.jsx:23-27`.
- The failure branch only `console.error`d.
- Phase 5 adds `getEnrollmentViewState` (`src/utils/enrollmentGate.js`) with a unit test, so the lookup/empty/error distinction is verified at the state level.
- No browser verification.

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- Added `enrollmentChecked` and a redirect for non-enrolled users.
- Completion state compares lesson ids.
- Responsive 16:9 iframe.

Fix applied in Phase 5 (approved BUG-004):

- The player no longer fetches enrollments itself. It derives `enrollment` from the shared slice (`enrollments.find(...)`) and gates on `loaded`/`loadError`, so there is one lookup per session, not two.
- A new pure helper `src/utils/enrollmentGate.js#getEnrollmentViewState` returns `loading` / `error` / `not-enrolled` / `ready`. `error` is checked before `not-enrolled`, so a failed lookup keeps the player closed and shows the message plus a **Retry** button instead of redirecting.
- Retry re-dispatches `fetchMyEnrollments()`; the slice clears `loadError` and sets `loading`, which moves the view back to the spinner. The button is disabled while the retry is in flight, so no request loop is possible.
- Redundant post-action `fetchMyEnrollments()` refreshes in the player and the quiz/assignment sub-forms were removed — the slice’s `completeLessonAsync.fulfilled` already updates the shared list.

Files Changed (historical): `src/pages/CoursePlayer/CoursePlayer.jsx`.
Files Changed (Phase 5): `src/pages/CoursePlayer/CoursePlayer.jsx`, `src/utils/enrollmentGate.js` (new), `tests/enrollmentGate.test.js` (new), `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/enrollmentGate.test.js` — 4 cases: unsettled is `loading` even with an enrollment present; a failed lookup is `error` (and wins even if `loaded` is false); settled-empty is `not-enrolled`; settled-with-enrollment is `ready`.

Verification Results:

- `npm test` — **PASS**, 24 tests, 0 failures (4 new).
- `npm run build` — **PASS**, 2417 modules, ≈4.5 s.
- `npm run lint` — 16 errors, 0 new; the remaining `CoursePlayer` unused variables are baseline.
- Static trace confirms the gate is before the player body, the retry path cannot loop, and the iframe stays responsive.
- Browser/network-failure run — **not performed**.

Status: **Partially Fixed** — the duplicate fetch and the enrollment-error handling are fixed at source and the view-state helper is unit-tested; a browser/network-failure run is still blocked.

Known limitations: no enrolled account is available for a real playback test; the network-failure path was not exercised in a browser.

Code Location Details:

- `src/pages/CoursePlayer/CoursePlayer.jsx` — shared-state selectors 55-69; mark-complete 75-94; gate 96-137; completion 142; iframe 169-179.
- `src/utils/enrollmentGate.js` — `getEnrollmentViewState` 12-17.
- `src/layouts/MainLayout.jsx` — enrollment dispatch 23-27.

---

# BUG-005 — Navigation, responsive layout, markup and labels

**1. Location & Steps**

Page/Route: every page (navbar), `/courses`, `/admin`, `/student`, footer.
Files: `src/components/shared/Navbar.jsx`, `src/components/shared/Footer.jsx`, `src/components/CourseCard/CourseCard.jsx`, `src/pages/admin/components/AdminSidebar.jsx`, `src/pages/admin/components/AdminDashboard.jsx`, `src/pages/student/StudentDashboard.jsx`.

Steps to reproduce:

1. At desktop width, look at the Home/Courses menu items.
2. At phone width, open the hamburger menu and scroll to the avatar/logout block.
3. Open `/admin` below the `lg` breakpoint.
4. Read a long course title on a card.
5. Click “Profile” in the avatar menu and “About Us” in the footer (historical).
6. Inspect a course card's instructor row in DevTools.
7. Sign in as a student with enrollments, expand a course, and read the fallback text.

**2. Expected vs. Actual**

Expected: only the active route is highlighted; the whole mobile menu is reachable; admin content starts below the fixed bar; long titles wrap; links point to real routes; markup is valid; labels match the controls.

Actual (historical, fixed in `e867fa4`):

- `navLinkClass` marked every link active because `pathname.startsWith("/")` is always true.
- The mobile dropdown was capped at `max-h-32` with `overflow-hidden`, clipping the avatar/dashboard/logout.
- The fixed mobile admin bar overlaid `<main>`, which had no compensating top padding.
- Card titles were forced onto one line (`whitespace-nowrap`).
- `/profile` and `/about` were linked but not routed (404); the dead entries were removed.

Actual (before Phase 6; fixed in this phase):

- **Issue F — invalid nesting.** `CourseCard.jsx` rendered a `<div>` avatar inside a `<p>`. Browsers repair this by closing the `<p>` early, which can split the instructor row and produce inconsistent DOM in hydration/testing.
- **Issue G — mismatched label / dead-end fallback.** The button says “Details”, while the fallback said `Click "View Details" to load statistics`. That fallback only rendered after expansion when stats were still missing (e.g. a failed fetch), so it told the user to perform an action already taken and offered no retry.
- **Error + empty state.** The same screen could show an error alert and “No courses enrolled yet” because the empty state was derived from `enrollments.length` without consulting `loaded`/`loadError` (also tracked in BUG-002).

Root cause: markup and copy were not updated with the component changes; the dashboard fallback assumed a label that does not exist and did not model a failed stats load; the empty state ignored the slice’s loading/error flags.

**3. Severity & Evidence**

Severity: **Medium** (historical layout/link defects) / **Low** (markup/label).
Priority: **P3**.

Evidence:

- Before Phase 6, `CourseCard.jsx` wrapped the avatar in `<p …><div …>…</div><span>…</span></p>`.
- Before Phase 6, the dashboard button said “Details” while the fallback said “View Details”.
- Historical source scan: no `/profile`, `/about`, `max-h-32` or `startsWith("/")` nav logic remains.
- Built CSS contains the responsive/padding/wrapping utilities (earlier check).
- Phase 6 adds two source-contract tests (`tests/bug005Markup.test.js`) and four list-state tests (`tests/enrollmentListState.test.js`).
- No browser or screenshot evidence.

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- `isActive`-only nav styling; mobile dropdown uncapped; admin top padding; wrapped card titles; dead links removed.

Fix applied in Phase 6 (approved BUG-005):

- The instructor row is now a `<div>` with the same classes, so the avatar `<div>` is valid HTML and the row is no longer split by the parser.
- The dashboard stats fallback is a real failure state: “Could not load course statistics.” plus a **Retry** button that reuses `handleRefreshStats(courseId)`. The dead-end “View Details” copy is gone.
- The enrollment list now uses a pure helper, `src/utils/enrollmentListState.js#getEnrollmentListState` (`loading` / `error` / `empty` / `list`). The dashboard shows the empty card only for a settled, error-free, empty list; a failed request shows the error alert with a **Retry** and never the empty card. The loading spinner covers `!loaded`, so the empty state cannot flash before the request settles.

Files Changed (historical): `src/components/shared/Navbar.jsx`, `src/components/shared/Footer.jsx`, `src/components/CourseCard/CourseCard.jsx`, `src/pages/admin/components/AdminDashboard.jsx`.
Files Changed (Phase 6): `src/components/CourseCard/CourseCard.jsx`, `src/pages/student/StudentDashboard.jsx`, `src/utils/enrollmentListState.js` (new), `tests/enrollmentListState.test.js` (new), `tests/bug005Markup.test.js` (new), `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/enrollmentListState.test.js` — 4 cases: unsettled → `loading`; failed request → `error` (wins over empty); settled-empty → `empty`; settled-with-rows → `list`.
- `tests/bug005Markup.test.js` — 2 source-contract cases: the instructor row is a `<div>`; the dashboard fallback no longer says “View Details” and describes the failure with a retry.

Verification Results:

- `npm test` — **PASS**, 30 tests, 0 failures (6 new).
- `npm run build` — **PASS**, 2417 modules, ≈4.4 s.
- `npm run lint` — 16 errors, 0 new.
- Source scan confirms the dead links, the old nav logic, the `<div>`-inside-`<p>` row and the “View Details” copy are gone.
- Browser/mobile inspection — **not performed**.

Status: **Partially Fixed** — Issues F and G and the error/empty state are fixed at source and covered by tests; browser/mobile visual verification is still blocked.

Known limitations: visual regressions cannot be ruled out without a browser; the source-contract tests guard the markup/copy, not the rendered pixels.

Code Location Details:

- `src/components/CourseCard/CourseCard.jsx` — instructor row 39-44; title 35.
- `src/pages/student/StudentDashboard.jsx` — list state 11-25; gate 161; error/empty 178-192; stats fallback 519-530.
- `src/utils/enrollmentListState.js` — `getEnrollmentListState` 12-17.
- `src/components/shared/Navbar.jsx` — active class and mobile menu (historical).
- `src/pages/admin/components/AdminDashboard.jsx` — `<main>` padding 46.

---

# BUG-006 — Admin analytics, course creation/update states, and theme readability

**1. Location & Steps**

Page/Route: `/admin` (Overview), `/admin/courses/create`, `/admin/courses/edit/:id`, `/admin/video-classes`, `/admin/users`.
Files: `src/pages/admin/pages/AdminOverview.jsx`, `src/pages/admin/pages/CreateCourse.jsx`, `src/pages/admin/pages/ManageUsers.jsx`, `src/store/slices/adminSlice.js`, `src/pages/admin/pages/EditCourse.jsx`, `src/pages/admin/pages/VideoClasses.jsx`.

Steps to reproduce:

1. Sign in as an admin and open `/admin`; compare the analytics card with `GET /admin/analytics`.
2. Submit a course creation form that the backend rejects.
3. Toggle dark mode and open `/admin/users`.
4. Change a course and press “Update Course”; watch the button on a slow connection.
5. Open “Start Video Class” and press a video-class button.

**2. Expected vs. Actual**

Expected: the Top Courses chart uses the API's actual keys; a rejected creation keeps the form and its error visible; table text follows the theme; update/video-class actions disable and show progress until the request settles.

Actual (historical, fixed in `e867fa4`):

- The API returns `{ chartData, enrollmentsByCourse, stats }` with `{ _id, courseName, enrollments }`, but the overview read `analytics.topCourses` and `course.courseTitle`/`course.count`, so the section never rendered.
- `CreateCourse` tested `result.payload?.message` (the payload is a string) and used a stale `error`, so it navigated away after a rejected creation.
- The users table forced `color: '#1e293b'`, which is nearly invisible on the dark theme.
- `updateCourseAsync` had no `pending` handler and `EditCourse` read `creating`, so the update button never disabled; `VideoClasses` read a non-existent `updating` flag.

Actual (current): all four are fixed in source and re-checked in Phase 7; no new admin defect is confirmed. The analytics mapping was extracted to a pure helper so the API-key contract is now unit-tested, and the create/update reducer flags are covered too. The earlier per-screen `/auth/me` calls are gone (BUG-002), and none of the admin flows has browser coverage.

Root cause (historical): frontend assumed an analytics envelope that the backend does not return; thunk result handling was wrong; a hardcoded light-theme colour; a missing reducer flag.

**3. Severity & Evidence**

Severity: **Medium**.
Priority: **P3**.

Evidence:

- Backend `admin.service.js` groups/sorts/limits to five and projects `courseName`/`enrollments`; live analytics has no `topCourses` (earlier read-only check).
- Thunk harness: `fulfilled.match(rejected) === false`; old mapping `[]`, new mapping produced chart rows.
- Reducer harness: `updating:false` → `pending:true` → `fulfilled:false`; `create pending` leaves `updating:false`.
- Source scan: no `topCourses`, `#1e293b` or `payload?.message` remains.
- Phase 7 adds `tests/adminAnalytics.test.js` (5 mapping cases) and `tests/adminSlice.test.js` (8 reducer cases), which encode the same checks in the suite.
- No browser evidence.

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- Map `enrollmentsByCourse` → `{ name: courseName, enrollments }`.
- Navigate only on `createCourseAsync.fulfilled.match(result)`.
- Remove the hardcoded email colour.
- Add `updating` to `adminSlice` and use it in `EditCourse` (and the existing `VideoClasses` selector).

Fix still required: none confirmed for this group beyond the shared session hydration in BUG-002.

Verification added in Phase 7 (no behaviour change beyond extracting the mapping):

- `src/utils/adminAnalytics.js` (new) — `mapCourseEnrollments(enrollmentsByCourse, limit = 5)` maps the backend's `{ courseName, enrollments }` rows to the chart's `{ name, enrollments }`, truncates names to 15 characters, limits to five and degrades missing values safely. `AdminOverview` now calls it.
- `tests/adminAnalytics.test.js` (new) — 5 cases covering the API-key contract.
- `tests/adminSlice.test.js` (new) — 8 cases covering `creating`, `updating`, their fulfilment/rejection transitions and the `fetchEnrollments` store.

Files Changed: `src/pages/admin/pages/AdminOverview.jsx`, `src/pages/admin/pages/CreateCourse.jsx`, `src/pages/admin/pages/ManageUsers.jsx`, `src/store/slices/adminSlice.js`, `src/pages/admin/pages/EditCourse.jsx`.
Files Changed (Phase 7): `src/pages/admin/pages/AdminOverview.jsx`, `src/utils/adminAnalytics.js` (new), `tests/adminAnalytics.test.js` (new), `tests/adminSlice.test.js` (new), `BUG_REPORT_FRONTEND.md`.

Tests Added or Updated:
- `tests/adminAnalytics.test.js` — 5 cases: missing/non-array → `[]`; key mapping; 15-character truncation; default/custom limit; safe defaults.
- `tests/adminSlice.test.js` — 8 cases: initial flags; create pending/fulfilled/rejected; update pending/fulfilled/rejected; enrollments fulfilled.

Verification Results:

- `npm test` — **PASS**, 43 tests, 0 failures (13 new).
- `npm run build` — **PASS** (2417 modules, ≈4.0 s).
- `npm run lint` — 16 errors, no new error in the changed files.
- Static scan — no old analytics keys or hardcoded colour.
- Admin login/browser flow — **not performed** (no admin credentials, no browser).

Status: **Partially Fixed** — the four source fixes are present and now regression-tested; browser/admin-account verification is unavailable.

Known limitations: analytics and review flows need a real admin session to verify.

Code Location Details:

- `src/pages/admin/pages/AdminOverview.jsx` — chart mapping 137; helper import 6.
- `src/utils/adminAnalytics.js` — `mapCourseEnrollments` 9-15.
- `src/pages/admin/pages/CreateCourse.jsx` — submit 68-72.
- `src/pages/admin/pages/ManageUsers.jsx` — email cell 216.
- `src/store/slices/adminSlice.js` — `updateCourseAsync` 97-108.
- `src/pages/admin/pages/EditCourse.jsx` — selector 13; button 716-722.

---

# BUG-007 — API base URL, request lifecycle, and course search consistency

**1. Location & Steps**

Page/Route: `/courses`, `/login`, any page after reload, `/admin`.
Files: `.env`, `.env.example`, `src/services/api.js`, `src/components/CourseCard/CoursesSection.jsx`, `src/layouts/MainLayout.jsx`, `src/routes/AdminRoute.jsx`.

Steps to reproduce:

1. Build with the original duplicated `.env` and search the bundle for the API host (historical).
2. Against the local backend, submit a wrong password and watch the page (historical).
3. On `/courses`, go to page 2+, type a search term and submit.
4. Rapidly change sort/category/tags while on page 2+ and watch the Network panel.
5. Throttle one course response and let a newer response arrive first.
6. Open `/admin` while `/auth/me` is slow or failing.

**2. Expected vs. Actual**

Expected: a production build always targets the configured API; a rejected login preserves its message; a search always requests page 1 exactly once with current filters; only the newest response updates the grid; a failed session check shows a retry, not a logout.

Actual (historical, fixed in `e867fa4`):

- `.env` declared `VITE_API_BASE_URL` twice (production first, localhost last); Vite keeps the last, so builds emitted localhost. `api.js` also hardcoded `|| "http://localhost:5000/api"`, so a build without the variable targeted localhost.
- The response interceptor treated **every** 401 as an expired session, clearing the token and reloading `/login` even for a failed login, so the message never rendered.
- `onSearchSubmit` called `setPage(1)` and then `fetchCourses()`, which closed over the old page; from page 2+ it issued the old-page request plus a page-1 request, and the last response won.

Actual (before Phase 8; fixed in this phase):

- **No response ordering/cancellation.** `fetchCourses` had no `AbortController` or request sequence number. If an older request resolved after a newer one (slow network, rapid filter changes), it overwrote `courses`/`totalPages` with stale data.
- **Duplicate request on filter change when page > 1.** The fetch effect depended on `[page, sort, category, tags]` and a second effect reset `page` to 1 on `[sort, category, tags]`. On page 2+, changing a filter first fetched the new filter with the **old** page, then page 1 — two requests, one stale.
- **Unmount/navigation.** No abort meant a response could still call `setCourses` after leaving `/courses` (harmless in React 19, but it kept the request alive).
- **Admin retry** is covered in BUG-002; the `AdminRoute` here still fails closed on a transient error.

Root cause: the search lifecycle was effect-driven with overlapping dependencies and no request identity; the earlier fix only removed the duplicate *search-submit* call.

**3. Severity & Evidence**

Severity: **High** (historical localhost/401) / **Medium** (current races).
Priority: **P2**.

Evidence:

- A/B build with the duplicated `.env`: `localhost in bundle: true`, production URL `false`; after the fix: production URL present, `localhost:5000` occurrences `0`.
- Interceptor harness: old login 401 → reload, token cleared; new login 401 → no reload, token kept; protected 401 → redirect/clear; 500 → untouched.
- Deployment: live bundle `index-H7pn9ZKo.js` still has `dev_bypass=4`, `price*100=1`, **no** login-401 exemption, but does use the production API.
- Before Phase 8, `CoursesSection` had two effects: fetch `[page, sort, category, tags]` and a separate page reset `[sort, category, tags]`.
- Phase 8 adds `tests/bug007RequestLifecycle.test.js` (3 source-contract cases) and `tests/courseQuery.test.js` (4 query-shape cases).
- No request trace/browser evidence (disconnected).

**4. Fix & Verification**

Fix (applied in `e867fa4`):

- One production `VITE_API_BASE_URL` in `.env`/`.env.example`; `.env.local` documented for local work. *(Current working tree differs: both files were externally switched to localhost — see 5.1.)*
- `api.js` falls back to localhost **only** in `DEV`; production without the variable resolves to `""` and logs a configuration error.
- The 401 interceptor exempts `/auth/login` and `/auth/register`, clears/redirects for other 401s, and avoids reloading when already on `/login`.
- `MainLayout` hydration fixed; `AdminRoute`/`AdminDashboard` loading state added.
- Search submit uses an explicit page and no longer double-fetches on submit.

Fix applied in Phase 8 (approved BUG-007):

- `fetchCourses` now takes a monotonically increasing request id and an `AbortController`. Before each request it aborts the previous one; responses whose id is no longer current are ignored, and an unmount invalidates and aborts the in-flight request.
- The standalone page-reset effect is gone. Filter setters now reset the page in the same state update (`changeFilter`), so a filter change on page 2+ produces exactly one page-1 request.
- The query object is built by a pure helper, `src/utils/courseQuery.js#buildCourseQuery`, so the page actually requested is explicit.
- `getCourses` accepts an optional axios config so the abort signal reaches the request.
- The admin transient-retry model was already delivered by BUG-002.

Files Changed (historical): `.env` (local, ignored), `.env.example`, `src/services/api.js`, `src/layouts/MainLayout.jsx`, `src/routes/AdminRoute.jsx`, `src/pages/admin/components/AdminDashboard.jsx`, `src/components/CourseCard/CoursesSection.jsx`.
Files Changed (Phase 8): `src/components/CourseCard/CoursesSection.jsx`, `src/services/courses.api.js`, `src/utils/courseQuery.js` (new), `tests/courseQuery.test.js` (new), `tests/bug007RequestLifecycle.test.js` (new), `BUG_REPORT_FRONTEND.md`. `.env`/`.env.example` were **not** touched (see the working-tree warning).

Tests Added or Updated:
- `tests/courseQuery.test.js` — 4 cases: page/limit always sent; empty filters omitted; active filters preserved; requested page wins.
- `tests/bug007RequestLifecycle.test.js` — 3 source-contract cases: abort + signal wiring; stale responses ignored and unmount invalidates; the standalone page-reset effect is gone and filters batch the reset.

Verification Results:

- `npm test` — **PASS**, 50 tests, 0 failures (7 new).
- `npm run build` — **PASS**, 2417 modules, ≈4.5 s.
- `npm run lint` — 15 errors, one fewer than the Phase 7 baseline (the unused `err` in `CoursesSection` is now used).
- Build scan — production URL present, 0 localhost occurrences *(historical; the current working tree is externally set to localhost — see 5.1)*.
- Interceptor/baseURL harness — results as listed above.
- Live checks — production/local courses 200, `/auth/me` 401, invalid login 400/401.
- Browser/search-race trace — **not performed**.

Status: **Partially Fixed** — the request lifecycle and duplicate filter fetch are fixed at source and covered by tests; a real browser/throttled-network trace and the live deployment are still blocked.

Known limitations: Vercel environment variables can override repository values; the deployed project is not serving HEAD; the race was verified by source contract, not by throttling a live request.

Code Location Details:

- `.env.example` — single key + `.env.local` guidance — lines 1-11. *(Working tree currently externally switched to localhost — see 5.1.)*
- `src/services/api.js` — base URL 4-16; interceptor 30-49.
- `src/components/CourseCard/CoursesSection.jsx` — request refs 26-27; fetch 29-64; fetch effect 66-69; unmount abort 71-75; submit 77-88; `changeFilter` 91-94; props 98-105.
- `src/services/courses.api.js` — `getCourses` config 3-5.
- `src/utils/courseQuery.js` — `buildCourseQuery` 8-16.
- `src/layouts/MainLayout.jsx` — hydration 13-21.
- `src/routes/AdminRoute.jsx` — guard 3-15.

---

## 7. Cross-group verification matrix

| Check | Method | Result | Status |
|---|---|---|---|
| Production build (compile) | `npm run build` | PASS, 2417 modules, ≈4.3 s; the current bundle targets localhost because of the external env edit | Compile verified; **env blocker** |
| Lint | `npm run lint` | 15 errors, 0 warnings (17 before BUG-002, 16 before BUG-007) | Verified |
| Production API reachable | `GET /api/courses?limit=1` | 200 | Verified |
| Local API reachable | `GET /api/courses?limit=1` | 200 | Verified |
| Auth guard without token | `GET /api/auth/me` | 401 | Verified |
| Invalid login, production | `POST /api/auth/login` | 400 + JSON message | Verified |
| Invalid login, local | `POST /api/auth/login` | 401 + JSON message | Verified |
| Login transport/server classification | `npm test` | pass | Verified (unit) |
| Valid login | real credentials | not available | **Blocked** |
| Token round trip | unit tests | `user_token` save/read; legacy cleanup | Verified (unit) |
| Registration token | source trace | stored; same reload path as login | Source-verified |
| `/auth/me` per load | source trace + unit | one call (MainLayout); 401 clears, transient retries | **Fixed (unit)** |
| Admin transient failure | source trace + unit | retry panel; admin role check preserved | **Fixed (unit)** |
| Enrollment flash | state trace + unit | gated until `loaded`; enrolled user never sees Enroll Now early | **Fixed (unit)** |
| Admin/creator flash | state trace | gated until the profile resolves | **Fixed (unit)** |
| Search ordering | source trace + test | sequence guard + abort; stale responses ignored | **Fixed (unit)** |
| Duplicate filter request | source trace + test | one page-1 request per filter change | **Fixed (unit)** |
| CourseCard markup | source + test | `<div>` inside `<p>` | **Fixed (unit)** |
| Dashboard label | source + test | “Details” vs. “View Details” | **Fixed (unit)** |
| Dashboard error/empty | state trace + test | error alert + “No courses enrolled yet” together | **Fixed (unit)** |
| Deployed bundle | live fetch | pre-fix asset | **Blocked** |
| Browser interaction | browser tools | disconnected | **Blocked** |
| Automated tests | `npm test` | 50 tests pass | Verified |

---

## 8. Commands executed and real results

| Command | Result |
|---|---|
| `git status --short` | modified: BUG-001/BUG-002 files + report; `.env`/`.env.example` also modified externally |
| `git log --oneline -2` | `e867fa4`, `14e57e8` |
| `git rev-list --left-right --count origin/main...HEAD` | `0  0` |
| `npm test` | PASS - 50 tests, 0 failures (9 auth-helper + 5 session-reducer + 6 enrollment-reducer + 4 player view-state + 4 list-state + 2 markup/copy + 5 analytics-mapping + 8 admin-reducer + 7 course-query/lifecycle) |
| `npm run build` | PASS — 2417 modules, ≈4.5 s; bundle contains `http://localhost:5000/api` (external env) |
| `npm run lint` | 15 errors, 0 warnings (17 before BUG-002, 16 before BUG-007) |
| `node <temp>/login-diagnostic.cjs` | local 401, production 400, no token returned |
| `GET https://…/api/courses?limit=1` | 200 |
| `GET http://localhost:5000/api/courses?limit=1` | 200 |
| `GET https://…/api/auth/me` (no token) | 401 |
| Live `index.html` + asset fetch | `index-H7pn9ZKo.js`; `dev_bypass=4`, `price100=1`, `localhost5000=0`, login-401 exemption absent |
| `git show --stat e867fa4` | 22 files changed (20 `src/` files + `.env.example` + this report) |
| Static scan for JWT-shaped strings / `dev_bypass` / long bearer values | no hardcoded credentials in current `src/` |
| Static scan for the old demo email/password and “Quick Demo Credentials” | **0** matches in `src/` and `README.md` |

The login probe read the documented credentials from `README.md` at runtime before BUG-001 removed that block; it printed only status/message/has-token. No password or token appears in this report or in the command output.

**Environment timestamp evidence:** `Get-ChildItem .env*` reported `.env.example` changed at `2026-10-22 01:31:34` and `.env` at `2026-10-22 01:31:46`; both select localhost. This was not done by the BUG-001 edits and was not reverted.

---

## 9. Changed files

### 9.1 Historical source changes in `e867fa4` (committed and pushed)

- `src/utils/auth.js`
- `src/pages/Login/Login.jsx`
- `src/routes/ProtectedRoute.jsx`
- `src/routes/AdminRoute.jsx`
- `src/components/shared/Navbar.jsx`
- `src/components/shared/Footer.jsx`
- `src/layouts/MainLayout.jsx`
- `src/services/api.js`
- `src/store/slices/enrollmentSlice.js`
- `src/store/slices/adminSlice.js`
- `src/components/CourseCard/CourseCard.jsx` (title wrapping)
- `src/components/CourseCard/CoursesSection.jsx`
- `src/pages/CousrseDetails/CourseDetails.jsx`
- `src/pages/CoursePlayer/CoursePlayer.jsx`
- `src/pages/student/StudentDashboard.jsx`
- `src/pages/admin/components/AdminDashboard.jsx`
- `src/pages/admin/pages/AdminOverview.jsx`
- `src/pages/admin/pages/CreateCourse.jsx`
- `src/pages/admin/pages/EditCourse.jsx`
- `src/pages/admin/pages/ManageUsers.jsx`
- `.env.example`

The local, git-ignored `.env` was also updated (not committed).

### 9.2 Phase 2 (BUG-001) to Phase 8 (BUG-007)

Phase 1 (read-only): `BUG_REPORT_FRONTEND.md` was rewritten; no application source was modified.

Phase 2 (BUG-001):

- `src/pages/Login/Login.jsx` — removed the stale credential quick-fill block and unused imports; neutral email placeholder; `role="alert"`; uses the new error classifier.
- `src/utils/loginError.js` (new) — transport/server/credential error mapping.
- `src/pages/Register/Register.jsx` — stores the registration token and follows the login flow.
- `README.md` — removed the published credential block.
- `package.json` — added the `test` script.
- `tests/loginError.test.js` (new) — 7 message-classification tests.
- `tests/authStorage.test.js` (new) — 2 token-storage tests.

Phase 3 (BUG-002):

- `src/store/slices/authSlice.js` — `checked`/`verifyError` state; token cleared only on 401/403.
- `src/routes/ProtectedRoute.jsx` — shared session state, fail closed, retry panel.
- `src/routes/AdminRoute.jsx` — shared session state, transient retry panel, role check.
- `src/pages/admin/components/AdminDashboard.jsx` — independent `getMe` removed.
- `src/components/shared/Navbar.jsx` — session read from Redux.
- `src/pages/admin/pages/ManageUsers.jsx` — self-check from `state.auth.user`.
- `src/pages/CousrseDetails/CourseDetails.jsx` — redundant hydration effect removed.
- `src/services/api.js` — `import.meta.env || {}` so the Node test runner can import it.
- `tests/authSlice.test.js` (new) — 5 session-reducer tests.
- `tests/register-hook.mjs`, `tests/extension-resolve-hook.mjs` (new) — ESM resolver hook for `node --test`.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 2/3 evidence and counts.

Phase 4 (BUG-003):

- `src/store/slices/enrollmentSlice.js` — added `loaded` and `loadError`; `clearError` clears both; fetch handlers set the flags on fulfilment/rejection.
- `src/pages/CousrseDetails/CourseDetails.jsx` — `pendingCheck`/`checkError`/`retryCheck`; disabled “Checking enrollment…” state and a Retry on failure; syllabus info card suppressed while unresolved.
- `tests/enrollmentSlice.test.js` (new) — 6 enrollment-reducer tests.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 4 evidence and counts.

Phase 5 (BUG-004):

- `src/pages/CoursePlayer/CoursePlayer.jsx` — consumes the shared enrollment slice instead of its own `getMyEnrollments()` call; `error` state shows “Could not verify your enrollment” with a Retry; redundant post-action refreshes removed.
- `src/utils/enrollmentGate.js` (new) — `getEnrollmentViewState` returns `loading` / `error` / `not-enrolled` / `ready`.
- `tests/enrollmentGate.test.js` (new) — 4 view-state tests.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 5 evidence and counts.

Phase 6 (BUG-005):

- `src/components/CourseCard/CourseCard.jsx` — instructor row changed from `<p>` to `<div>` with the same classes.
- `src/pages/student/StudentDashboard.jsx` — list state helper, error-only state with Retry, empty card gated on `loaded`, stats fallback replaced with a failure + Retry.
- `src/utils/enrollmentListState.js` (new) — `getEnrollmentListState` returns `loading` / `error` / `empty` / `list`.
- `tests/enrollmentListState.test.js` (new) — 4 list-state tests.
- `tests/bug005Markup.test.js` (new) — 2 source-contract tests.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 6 evidence and counts.

Phase 7 (BUG-006):

- `src/pages/admin/pages/AdminOverview.jsx` — uses the extracted `mapCourseEnrollments` helper.
- `src/utils/adminAnalytics.js` (new) — maps `enrollmentsByCourse` to the chart rows.
- `tests/adminAnalytics.test.js` (new) — 5 mapping tests.
- `tests/adminSlice.test.js` (new) — 8 reducer tests for `creating`/`updating`.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 7 evidence and counts.

Phase 8 (BUG-007):

- `src/components/CourseCard/CoursesSection.jsx` — request sequence + `AbortController`; stale responses ignored; unmount abort; single page-reset path via `changeFilter`; query built by the helper.
- `src/services/courses.api.js` — `getCourses(params, config)` so the abort signal reaches axios.
- `src/utils/courseQuery.js` (new) — `buildCourseQuery` query-shape helper.
- `tests/courseQuery.test.js` (new) — 4 query-shape tests.
- `tests/bug007RequestLifecycle.test.js` (new) — 3 source-contract tests.
- `BUG_REPORT_FRONTEND.md` — updated with Phase 8 evidence and counts.

### 9.3 Remaining proposed changes

None in application source. The only outstanding action is environmental: restore `.env`/`.env.example` to the production API (see 5.1).

`.env` and `.env.example` were changed externally to localhost (see 5.1). They are left untouched and must be reviewed before any deployment.

---

## 10. Tests added or updated

A dependency-free suite was added across BUG-001 to BUG-007 and runs through the project script:

```bash
npm test   # node --import ./tests/register-hook.mjs --test "tests/**/*.test.js"
```

| File | Cases | Covers |
|---|---|---|
| `tests/loginError.test.js` | 7 | no response → network message; 5xx with/without message; 401; 400; 403; unexpected status |
| `tests/authStorage.test.js` | 2 | `saveToken`/`getToken` share `user_token`; `clearToken` removes `user_token`, `token`, `dev_bypass` |
| `tests/authSlice.test.js` | 5 | verified session; 401/403 clears token; transient keeps token + `verifyError`; `logout` resets; login marks verified |
| `tests/enrollmentSlice.test.js` | 6 | initial not loaded/empty; fulfilled marks `loaded`; non-array payload guard; rejected marks `loaded` + `loadError`; `clearError` clears both; successful enroll appends |
| `tests/enrollmentGate.test.js` | 4 | unsettled → `loading`; failed lookup → `error` (wins over an empty list); settled-empty → `not-enrolled`; settled-with-enrollment → `ready` |
| `tests/enrollmentListState.test.js` | 4 | unsettled → `loading`; failed request → `error` (wins over empty); settled-empty → `empty`; settled-with-rows → `list` |
| `tests/bug005Markup.test.js` | 2 | CourseCard instructor row is a `<div>`; StudentDashboard no longer says “View Details” and describes the stats failure with a retry |
| `tests/adminAnalytics.test.js` | 5 | missing/non-array → `[]`; `courseName`/`enrollments` → `name`/`enrollments`; 15-char truncation; default/custom limit; safe defaults |
| `tests/adminSlice.test.js` | 8 | initial flags; create/update pending, fulfilled, rejected; `fetchEnrollments` |
| `tests/courseQuery.test.js` | 4 | page/limit always sent; empty filters omitted; active filters preserved; requested page wins |
| `tests/bug007RequestLifecycle.test.js` | 3 | abort + signal wiring; stale responses ignored and unmount invalidates; standalone page-reset effect removed and filters batch the reset |

Result: **50 passed, 0 failed**. The two `.mjs` files under `tests/` are the Node ESM resolver hook that lets the runner import Vite's extensionless modules. No React DOM, browser or network test was added, so interaction-level claims remain unverified.

Planned coverage: none. Browser/throttled-network verification remains blocked by the missing browser connection and live deployment.

---

## 11. Baseline failures vs. final failures

| Item | Baseline | Current | Change |
|---|---|---|---|
| Build (compile) | PASS (2417 modules) | PASS (2417 modules, ≈4.5 s) | None |
| Lint | 17 errors (after the earlier Navbar fix; originally 18) | 15 errors, 0 warnings | **Improved** |
| Test suite | absent | 50 Node tests, all passing | **Improved** |
| Browser verification | unavailable | unavailable | None |
| Stale demo credentials | present in README + login | removed; 0 matches | **Fixed** |
| Login network/server message | conflated with credentials | separated; 7 tests | **Fixed** |
| Registration token | ignored | stored; same reload path | **Fixed** |
| `/auth/me` per load | 3–5 duplicate calls | one call + guard retries | **Fixed (unit)** |
| `ProtectedRoute` fail-open | render on any failure | fail closed | **Fixed (unit)** |
| `AdminRoute` transient failure | redirect to `/login` | retry panel; token kept | **Fixed (unit)** |
| Runtime crash (enrollments) | `undefined.length` | fixed in source | Improved |
| Wrong price | `price*100` | fixed in source | Improved |
| Enrollment flash | wrong action before `loaded` | gated; Enroll Now only when resolved | **Fixed (unit)** |
| Player access bypass | open | fixed in source | Improved |
| Player enrollment error | redirect on lookup failure; duplicate fetch | shared state + retry; one lookup per session | **Fixed (unit)** |
| CourseCard markup | `<div>` inside `<p>` | valid `<div>` row with the same classes | **Fixed (unit)** |
| Dashboard label/fallback | dead-end “View Details” copy | “Could not load course statistics.” + Retry | **Fixed (unit)** |
| Dashboard error/empty | error alert + “No courses enrolled yet” | error-only state; empty gated on `loaded` | **Fixed (unit)** |
| Admin analytics mapping / update flag | harness only | unit-tested (`adminAnalytics`, `adminSlice`) | **Verified (unit)** |
| Search response ordering | no guard | sequence guard + abort; stale responses ignored | **Fixed (unit)** |
| Filter change on page 2+ | two requests (stale page + page 1) | one page-1 request | **Fixed (unit)** |
| Hardcoded JWT/bypass | present | removed from source | Improved |
| API target | production | **localhost (external env edit)** | **Regressed — must restore** |
| Deployed bundle | pre-fix | still pre-fix | None |

No new build or lint failure was introduced by BUG-001–BUG-007; the lint count dropped because the `ProtectedRoute` effect was removed (BUG-002) and the unused `err` in `CoursesSection` is now used (BUG-007). The localhost build is an external environment change, not a code regression.

---

## 12. Remaining issues and dependencies

### Frontend (no open code defects)

1. **Environment:** `.env`/`.env.example` currently select localhost (external edit); this must be restored before any production build.
2. No application-source defect from BUG-001–BUG-007 remains open; all 37 findings are fixed at source, but the interaction-level verification below is still pending.

### Backend / security owner (cannot be fixed in the frontend)

1. Rotate `JWT_SECRET` and invalidate the previously leaked admin JWT.
2. Provide a valid admin/student account for end-to-end verification.
3. Align the invalid-credential status (400 vs. 401) across deployments.
4. Keep seed credentials out of documentation and rotate any credential that was ever published (the frontend README is now clean).

### Deployment / tooling

1. The live Vercel site still serves `index-H7pn9ZKo.js`, despite `origin/main` being `e867fa4`; the project's Git linkage/branch must be checked by its owner.
2. No browser is connected to this session; interactive verification is blocked.
3. The Node test suite covers pure auth/course helpers, the session/enrollment/admin reducers, the player/list view-state helpers, the analytics mapping and two source-contract files; no React DOM/browser tests exist yet.

---

## 13. Safe deployment steps (not executed)

These require explicit authorization:

1. Review `git diff` / `git status`; confirm no secrets or `.env` are staged.
2. **Restore `.env` and `.env.example` to the production API** (currently externally set to localhost) and rebuild; confirm the bundle no longer contains `localhost:5000`.
3. Add and commit only the intended source/report files (never the git-ignored `.env`).
4. Push to the branch that the Vercel project actually builds.
5. Confirm the Vercel project points at `Hayder987/CourseMaster_frontend_sloved` (or the intended repository) and that the production environment has `VITE_API_BASE_URL=https://course-master-backend-ochre.vercel.app/api`.
6. Trigger a production deployment.
7. After deployment, re-fetch `/` and the new asset; verify the hash changed, no `dev_bypass`/`price*100` remains, and the bundle contains the login-401 exemption.
8. Re-test login, reload hydration, `/admin` (including a simulated `/auth/me` outage → Retry), enrollment and search in a real browser.

Do not consider production fixed until steps 7–8 pass.

---

## 14. Final regression summary

| Group | Title | Severity | Status |
|---|---|---|---|
| BUG-001 | Credential handling, shipped credentials, login error classification | Critical / High | Partially Fixed — all 6 code findings fixed at source; JWT revocation/valid login/deploy blocked |
| BUG-002 | Session hydration, protected routes, transient failures | High | Partially Fixed — Issue D, duplicate `/auth/me` and fail-open fixed + unit-tested; empty-state deferred; browser blocked |
| BUG-003 | Price, batch selection, enrollment-state timing | High / Medium | Partially Fixed |
| BUG-004 | Player access, completion, video, enrollment errors | High / Low | Partially Fixed — duplicate fetch and enrollment-error handling fixed + unit-tested; browser/network-failure run blocked |
| BUG-005 | Navigation, layout, markup, labels | Medium / Low | Partially Fixed — Issues F/G and the error/empty state fixed + tested; browser/mobile inspection blocked |
| BUG-006 | Admin analytics, create/update states, theme readability | Medium | Partially Fixed — four historical fixes present and now unit-tested; browser/admin session blocked |
| BUG-007 | API base URL, request lifecycle, search consistency | High / Medium | Partially Fixed — request sequence/abort and the single page-1 filter path fixed + tested; browser/throttled-network trace and deployment blocked |

**Counts**

- Confirmed findings across the seven groups: **37** (including defects already fixed in `e867fa4` and the registration-token finding).
- Fixes applied at source level: **37** (24 historical + 3 BUG-001 + 3 BUG-002 + 2 BUG-003 + 1 BUG-004 + 3 BUG-005 + 1 BUG-007).
- Fully verified fixes (`Fixed & Verified`): **0** — browser and real-account verification are unavailable. The 50 new tests verify pure helpers, the auth/enrollment/admin reducers and two source-contract files only.
- Open defects: **0**.
- Blocked items: browser verification, valid-credential login, JWT revocation, production deployment, environment restoration.

**No claim is made that the application is fully fixed.** The code builds, 50 regression tests pass, the login failure is explained (the frontend *was* offering credentials the hardened backend no longer accepts; BUG-001 removed them), a transient session outage no longer destroys the session (BUG-002), an enrolled student, admin or course creator is no longer shown “Enroll Now” before the state resolves (BUG-003), a failed enrollment lookup in the player no longer redirects as if the student were not enrolled (BUG-004), the dashboard no longer shows a dead-end fallback or claims “No courses enrolled yet” when loading failed (BUG-005), the admin analytics mapping plus create/update flags are covered by tests (BUG-006), and course search now cancels superseded requests and issues a single page-1 request per filter change (BUG-007). The production deployment is still old and the current env targets localhost; those, the backend JWT tasks and the missing browser/credential verification are the remaining dependencies listed above.
