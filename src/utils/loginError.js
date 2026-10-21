/**
 * Maps a login failure to a safe, user-facing message.
 *
 * A missing response means the request never reached the server (offline,
 * DNS, CORS, timeout), so it must not be reported as a credential error.
 * 5xx responses are server failures. 400/401/403 keep the backend message
 * when it is available.
 */
export function getLoginErrorMessage(error) {
    if (!error?.response) {
        return "Unable to reach the server. Check your connection and try again.";
    }

    const status = error.response.status;
    const serverMessage = error.response.data?.message;

    if (status >= 500) {
        return serverMessage || "The server is unavailable right now. Please try again later.";
    }

    if (status === 400 || status === 401 || status === 403) {
        return serverMessage || "Invalid email or password.";
    }

    return serverMessage || "Login failed. Please try again.";
}
