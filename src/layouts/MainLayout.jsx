import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { getMeAsync } from "../store/slices/authSlice";
import { fetchMyEnrollments } from "../store/slices/enrollmentSlice";

export default function MainLayout() {
    const dispatch = useDispatch();
    const { token, user, isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        // `isAuthenticated` is initialised from the stored token, so it is
        // already true after a reload while `user` is still null. Key the
        // re-hydration off `user` instead, otherwise the profile is never
        // fetched and role-dependent UI stays hidden.
        if (token && !user) {
            dispatch(getMeAsync());
        }
    }, [token, user, dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchMyEnrollments());
        }
    }, [isAuthenticated, dispatch]);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-4">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}
