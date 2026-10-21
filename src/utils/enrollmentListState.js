/**
 * Decides what the student dashboard should render for its enrollment list.
 *
 * The slice starts with `enrollments: []` and `loaded: false`, so an empty
 * array must not be shown as "No courses enrolled yet" until the request has
 * settled. A failed request is a distinct state and must not be presented as
 * an empty list.
 *
 * Returns one of: "loading" | "error" | "empty" | "list".
 */
export function getEnrollmentListState({ loaded, loadError, count = 0 }) {
    if (loadError) return "error";
    if (!loaded) return "loading";
    if (count === 0) return "empty";
    return "list";
}
