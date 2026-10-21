import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getMeAsync, logout } from "../store/slices/authSlice";

export default function AdminRoute({ children }) {
    const dispatch = useDispatch();
    const { token, user, isAuthenticated, verifyError } = useSelector(
        (state) => state.auth
    );

    // No stored session: send the visitor to login.
    if (!token) return <Navigate to="/login" replace />;

    // Verified profile: only admins may continue.
    if (user && isAuthenticated) {
        if (user.role !== "admin") return <Navigate to="/student" replace />;
        return children;
    }

    // Transient verification failure: keep the session and offer a retry
    // rather than treating a temporary outage as a revoked session.
    if (verifyError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
                <p className="text-base-content/80">{verifyError}</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => dispatch(getMeAsync())}
                    >
                        Retry
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => dispatch(logout())}
                    >
                        Sign in again
                    </button>
                </div>
            </div>
        );
    }

    // Verification still in flight: fail closed with a spinner.
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <span className="loading loading-spinner loading-lg"></span>
        </div>
    );
}
