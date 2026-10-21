import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getMeAsync, logout } from "../store/slices/authSlice";

export default function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated, verifyError } = useSelector(
    (state) => state.auth
  );

  // No stored session at all: send the visitor to login.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Verified session: render the protected screen.
  if (user && isAuthenticated) {
    return children;
  }

  // Transient verification failure (offline, timeout, 5xx): the token was
  // kept, so offer a retry instead of destroying the session. This guard
  // fails closed — the child is never rendered without a verified profile.
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

  // Verification still in flight: spinner while the single shared
  // /auth/me request (dispatched by MainLayout) resolves.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );
}
