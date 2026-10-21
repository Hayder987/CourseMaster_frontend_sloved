/**
 * Maps the admin analytics `enrollmentsByCourse` payload to the chart shape.
 *
 * The backend returns `[{ _id, courseName, enrollments }]`, not a `topCourses`
 * array with `courseTitle`/`count`. Keeping the mapping in one pure function
 * makes the contract testable without a browser or an admin session.
 */
export function mapCourseEnrollments(enrollmentsByCourse, limit = 5) {
    if (!Array.isArray(enrollmentsByCourse)) return [];
    return enrollmentsByCourse.slice(0, limit).map((course) => ({
        name: course?.courseName ? String(course.courseName).substring(0, 15) : "Unknown",
        enrollments: course?.enrollments ?? 0,
    }));
}
