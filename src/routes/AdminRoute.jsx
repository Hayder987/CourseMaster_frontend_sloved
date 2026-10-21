import { Navigate } from "react-router-dom";

export default function AdminRoute({ children, me, loading }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }
    // No profile (missing/expired session): send the user to login instead of
    // rendering an empty page.
    if (!me) return <Navigate to="/login" replace />;
    if (me.role !== "admin") return <Navigate to="/student" replace />;
    return children;
}
