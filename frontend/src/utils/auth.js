// Session helpers shared by the login form and the portal pages.
// (The app already keeps the session in both sessionStorage and localStorage.)

export function saveSession(token, user) {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

export function getToken() {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export function getStoredUser() {
    try {
        const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function homePathForRole(role) {
    return String(role || "").toUpperCase() === "ADMIN"
        ? "/admin/dashboard"
        : "/hospital/dashboard";
}

// fetch() that sends the signed-in user's token. If the server says the
// session is invalid/expired (401) the stored session is cleared and the user
// is sent back to the login page.
export async function authFetch(url, options = {}) {
    const token = getToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 401) {
        clearSession();
        window.location.assign("/login");
    }

    return response;
}
