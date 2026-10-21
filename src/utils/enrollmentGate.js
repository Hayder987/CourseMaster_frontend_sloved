/**
 * Decides what the course player should render for the current user's
 * enrollment state.
 *
 * The enrollment list is owned by the shared slice and starts empty, so an
 * empty list must never be read as "this student is not enrolled" until the
 * request has actually settled. A failed lookup is a third, distinct state:
 * it must not redirect as if the account were validly non-enrolled.
 *
 * Returns one of: "loading" | "error" | "not-enrolled" | "ready".
 */
export function getEnrollmentViewState({ loaded, loadError, enrollment }) {
    if (loadError) return "error";
    if (!loaded) return "loading";
    if (!enrollment) return "not-enrolled";
    return "ready";
}
