/**
 * Builds the `/courses` query object for the current search state.
 *
 * Empty filters are sent as `undefined` so axios omits them, matching the
 * backend's optional query contract. Kept pure so the shape can be tested
 * without a browser.
 */
export function buildCourseQuery({ page, limit, search, sort, category, tags }) {
    return {
        page,
        limit,
        search: search || undefined,
        sort: sort || undefined,
        category: category || undefined,
        tags: tags || undefined,
    };
}
