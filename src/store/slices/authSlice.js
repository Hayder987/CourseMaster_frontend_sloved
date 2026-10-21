import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginUser, registerUser, getMe } from "../../services/auth.api";
import { getToken, saveToken, clearToken } from "../../utils/auth";

export const loginAsync = createAsyncThunk(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            const res = await loginUser(credentials);
            saveToken(res.data.token);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed");
        }
    }
);

export const registerAsync = createAsyncThunk(
    "auth/register",
    async (data, { rejectWithValue }) => {
        try {
            const res = await registerUser(data);
            saveToken(res.data.token);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Registration failed");
        }
    }
);

export const getMeAsync = createAsyncThunk(
    "auth/getMe",
    async (_, { rejectWithValue }) => {
        const token = getToken();
        if (!token) {
            return rejectWithValue({ message: "No session token", isAuthError: true });
        }
        try {
            const res = await getMe();
            return res.data;
        } catch (err) {
            const status = err.response?.status;
            // 401/403 means the token itself was rejected. Anything else
            // (offline, timeout, CORS, 5xx) is a transient failure and must
            // not destroy the stored session.
            const isAuthError = status === 401 || status === 403;
            return rejectWithValue({
                message:
                    err.response?.data?.message ||
                    (err.response
                        ? "Unable to load your profile"
                        : "Unable to reach the server. Check your connection and try again."),
                isAuthError,
            });
        }
    }
);

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        token: getToken() || null,
        loading: false,
        error: null,
        isAuthenticated: !!getToken(),
        // Session-verification state. `checked` distinguishes "not verified
        // yet" from "verified and no profile"; `verifyError` holds a
        // transient failure message while the token is still kept.
        checked: false,
        verifyError: null,
    },
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            state.checked = false;
            state.verifyError = null;
            clearToken();
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Register
            .addCase(registerAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.checked = true;
                state.verifyError = null;
            })
            .addCase(registerAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            })
            // Login
            .addCase(loginAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.checked = true;
                state.verifyError = null;
            })
            .addCase(loginAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            })
            // GetMe
            .addCase(getMeAsync.pending, (state) => {
                state.loading = true;
                state.verifyError = null;
            })
            .addCase(getMeAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.checked = true;
                state.verifyError = null;
            })
            .addCase(getMeAsync.rejected, (state, action) => {
                state.loading = false;
                state.checked = true;
                const isAuthError = action.payload?.isAuthError === true;
                if (isAuthError) {
                    state.user = null;
                    state.token = null;
                    state.isAuthenticated = false;
                    state.verifyError = null;
                    clearToken();
                } else {
                    // Transient failure: keep the stored token so the user can
                    // retry instead of being silently logged out.
                    state.verifyError =
                        action.payload?.message || "Unable to verify your session.";
                }
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
