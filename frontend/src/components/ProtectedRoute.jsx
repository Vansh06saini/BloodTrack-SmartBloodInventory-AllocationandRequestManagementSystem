import { Navigate } from "react-router-dom";
import { getStoredUser, getToken, homePathForRole } from "../utils/auth";

// UX guard only: it keeps people out of the wrong portal. The real access
// control is enforced by the API (token + role checks on every request).
function ProtectedRoute({ role, children }) {
    const user = getStoredUser();

    if (!getToken() || !user) {
        return <Navigate to="/login" replace />;
    }

    if (String(user.role || "").toUpperCase() !== role) {
        return <Navigate to={homePathForRole(user.role)} replace />;
    }

    return children;
}

export default ProtectedRoute;
