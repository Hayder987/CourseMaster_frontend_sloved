import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getCourses } from "../../services/courses.api";
import { buildCourseQuery } from "../../utils/courseQuery";
import CoursesFilters from "./CoursesFilters";
import CoursesGrid from "./CoursesGrid";
import CoursesPagination from "./CoursesPagination";

export default function CoursesSection() {
    const { user } = useSelector((state) => state.auth);
    const [courses, setCourses] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // query states
    const [page, setPage] = useState(1);
    const [limit] = useState(8);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");

    // Request identity: only the newest response may update the grid.
    const requestSeq = useRef(0);
    const cancelRef = useRef(null);

    const fetchCourses = async (pageOverride) => {
        const requestedPage = pageOverride ?? page;
        const seq = ++requestSeq.current;

        // Cancel the previous in-flight request (filter/page change, unmount).
        cancelRef.current?.abort();
        const controller = new AbortController();
        cancelRef.current = controller;

        try {
            setLoading(true);
            setError(null);

            const params = buildCourseQuery({
                page: requestedPage,
                limit,
                search,
                sort,
                category,
                tags,
            });

            const res = await getCourses(params, { signal: controller.signal });
            if (seq !== requestSeq.current) return;
            setCourses(res.data.courses || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (err) {
            // A cancelled or superseded request must not touch state.
            if (seq !== requestSeq.current) return;
            if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
            setError("Failed to load courses");
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, sort, category, tags]);

    // Abort any in-flight request when the grid unmounts.
    useEffect(() => () => {
        requestSeq.current += 1;
        cancelRef.current?.abort();
    }, []);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        if (page === 1) {
            // Page is already 1, so the filter effect will not re-run.
            fetchCourses(1);
            return;
        }
        // Going back to page 1 triggers the effect, which reads the current
        // filters. Calling fetchCourses() here too would fire a second
        // request with the stale page number.
        setPage(1);
    };

    // Reset the page together with a filter so a change on page 2+ issues a
    // single page-1 request instead of a stale-page request plus a second one.
    const changeFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    return (
        <div className="space-y-6">

            <CoursesFilters
                search={search} setSearch={setSearch}
                sort={sort} setSort={changeFilter(setSort)}
                category={category} setCategory={changeFilter(setCategory)}
                tags={tags} setTags={changeFilter(setTags)}
                onSearchSubmit={onSearchSubmit}
            />

            {/* states */}
            {loading && (
                <div className="flex justify-center py-10">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && courses.length === 0 && (
                <div className="rounded-xl border border-primary/20 bg-base-200 p-6 text-center">
                    <h3 className="text-lg font-semibold text-primary">
                        No courses found
                    </h3>
                    <p className="mt-1 text-base-content/70">
                        Try adjusting your search or filters.
                    </p>
                </div>
            )}


            {!loading && !error && courses.length > 0 && (
                <>
                    <CoursesGrid courses={courses} />
                    {user?.role === "admin" && (
                        <div className="flex justify-center pt-4">
                            <Link
                                to="/admin/courses"
                                className="btn btn-primary btn-wide"
                            >
                                Manage Courses
                            </Link>
                        </div>
                    )}
                </>
            )}

            <CoursesPagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
            />
        </div>
    );
}
