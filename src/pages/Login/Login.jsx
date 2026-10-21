import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    Sparkles,
    ShieldCheck,
    UserRound,
    GraduationCap,
    Crown,
} from "lucide-react";

import { loginUser } from "../../services/auth.api";
import { saveToken } from "../../utils/auth";
import { getLoginErrorMessage } from "../../utils/loginError";

const DEMO_CREDENTIALS = {
    admin: {
        email: import.meta.env.VITE_DEMO_ADMIN_EMAIL || "",
        password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "",
    },
    student: {
        email:
            import.meta.env.VITE_DEMO_STUDENT_EMAIL ||
            "student@coursemaster.com",
        password:
            import.meta.env.VITE_DEMO_STUDENT_PASSWORD || "student123",
    },
};

export default function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingRole, setLoadingRole] = useState(null);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));

        if (error) setError(null);
    };

    // Fill demo credentials without submitting.
    const fillCredentials = (role) => {
        const credentials = DEMO_CREDENTIALS[role];

        if (!credentials.email || !credentials.password) {
            setError(
                `${role === "admin" ? "Admin" : "Student"} demo credentials are not configured.`
            );
            return;
        }

        setForm({ ...credentials });
        setShowPassword(false);
        setError(null);
    };

    // Authenticate using the existing backend API.
    const performLogin = async (credentials, role = null) => {
        if (loading) return;

        try {
            setLoading(true);
            setLoadingRole(role);
            setError(null);

            const res = await loginUser({
                email: credentials.email.trim(),
                password: credentials.password,
            });

            if (!res?.data?.token) {
                throw new Error("Authentication token was not returned.");
            }

            saveToken(res.data.token);

            navigate("/", { replace: true });
            window.location.reload();
        } catch (err) {
            setError(getLoginErrorMessage(err));
        } finally {
            setLoading(false);
            setLoadingRole(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await performLogin(form);
    };

    // Portal buttons perform actual login requests.
    const handlePortalLogin = async (role) => {
        const credentials = DEMO_CREDENTIALS[role];

        if (!credentials.email || !credentials.password) {
            setError(
                `${role === "admin" ? "Admin" : "Student"} demo credentials are not configured.`
            );
            return;
        }

        setForm({ ...credentials });
        await performLogin(credentials, role);
    };

    const inputClass =
        "input input-bordered w-full pl-4 pr-4 focus:input-primary";

    const demoButtonClass =
        "btn btn-sm min-h-9 h-auto rounded-full border border-base-300 bg-base-200 text-base-content hover:bg-base-300 gap-1.5 px-3 text-xs font-bold disabled:opacity-50";

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-10">
            <div className="w-full max-w-lg mx-auto">
                <div className="card bg-base-100/90 backdrop-blur border border-base-300 shadow-2xl relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="card-body p-5 sm:p-8 md:p-10 relative z-10">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                                <Sparkles className="w-3.5 h-3.5" />
                                Welcome Back
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                                <span className="gradient-text">
                                    Sign In to CourseMaster
                                </span>
                            </h1>

                            <p className="text-sm text-base-content/70 mt-2 leading-6">
                                Enter your credentials to access your courses
                                {" & "}dashboard
                            </p>
                        </div>

                        {/* Quick Demo Credentials */}
                        <section className="rounded-2xl border border-base-300 bg-base-200/50 p-3.5 sm:p-4 mb-6">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Quick Demo Credentials:
                                </h2>

                                <span className="badge badge-outline badge-sm text-[10px]">
                                    Testing Helper
                                </span>
                            </div>

                            {/* Fill credentials */}
                            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => fillCredentials("admin")}
                                    className={`${demoButtonClass} border-primary/40 bg-primary/10 hover:bg-primary/20`}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Admin Fill
                                </button>

                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => fillCredentials("student")}
                                    className={`${demoButtonClass} border-secondary/40 bg-secondary/10 hover:bg-secondary/20`}
                                >
                                    <UserRound className="w-3.5 h-3.5" />
                                    Student Fill
                                </button>
                            </div>

                            <div className="divider my-2 before:bg-base-content/15 after:bg-base-content/15 text-base-content/50 text-[10px]">
                                OR
                            </div>

                            <p className="text-[11px] font-semibold text-base-content/70 mb-2">
                                🔓 Direct Login & Inspect Routes (Dev Bypass):
                            </p>

                            {/* Direct login */}
                            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() =>
                                        handlePortalLogin("student")
                                    }
                                    className={`${demoButtonClass} bg-gradient-to-r from-primary/15 to-secondary/15 border-primary/30`}
                                >
                                    {loadingRole === "student" ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                        <GraduationCap className="w-3.5 h-3.5" />
                                    )}

                                    {loadingRole === "student"
                                        ? "Signing in..."
                                        : "Student Portal"}
                                </button>

                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() =>
                                        handlePortalLogin("admin")
                                    }
                                    className={`${demoButtonClass} bg-gradient-to-r from-secondary/15 to-primary/15 border-secondary/30`}
                                >
                                    {loadingRole === "admin" ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                        <Crown className="w-3.5 h-3.5" />
                                    )}

                                    {loadingRole === "admin"
                                        ? "Signing in..."
                                        : "Admin Portal"}
                                </button>
                            </div>
                        </section>

                        {/* Error message */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="alert alert-error shadow-md text-sm p-3 mb-4 rounded-xl"
                            >
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Login form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-control">
                                <label
                                    htmlFor="login-email"
                                    className="label"
                                >
                                    <span className="label-text font-semibold flex items-center gap-1.5">
                                        <Mail className="w-4 h-4 text-primary" />
                                        Email Address
                                    </span>
                                </label>

                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className={inputClass}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-control">
                                <label
                                    htmlFor="login-password"
                                    className="label"
                                >
                                    <span className="label-text font-semibold flex items-center gap-1.5">
                                        <Lock className="w-4 h-4 text-primary" />
                                        Password
                                    </span>
                                </label>

                                <div className="relative flex items-center">
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`${inputClass} pr-10`}
                                        required
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        className="absolute right-3 text-base-content/50 hover:text-base-content transition"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className="btn btn-primary w-full btn-lg shadow-lg hover:shadow-xl mt-6 gap-2 font-bold"
                            >
                                {loading && !loadingRole ? (
                                    <>
                                        <span className="loading loading-spinner loading-md" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Sign In
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="text-center mt-6 pt-4 border-t border-base-300">
                            <p className="text-sm text-base-content/70">
                                Don&apos;t have an account?{" "}
                                <Link
                                    className="link link-primary font-bold ml-1"
                                    to="/register"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}