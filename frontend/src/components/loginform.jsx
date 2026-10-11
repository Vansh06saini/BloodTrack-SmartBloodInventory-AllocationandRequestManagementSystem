import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { homePathForRole, saveSession } from "../utils/auth";
import {
    validateContact,
    validateEmail,
    validateName,
    validateNewPassword,
} from "../utils/validation";

function LoginForm() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "hospital",
        // only used when the email has no account yet (mode === "signup")
        name: "",
        contact: "",
        confirmPassword: "",
    });

    // "login": normal sign in. "signup": the email was not found and we are
    // offering to create a (Hospital) account with the details below.
    const [mode, setMode] = useState("login");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    }

    function validateForm() {
        if (!formData.email.trim()) {
            return "Please enter your email address.";
        }

        if (!formData.email.includes("@")) {
            return "Please enter a valid email address.";
        }

        if (!formData.password.trim()) {
            return "Please enter your password.";
        }

        if (formData.password.length < 6) {
            return "Password must contain at least 6 characters.";
        }

        return "";
    }

    function validateSignup() {
        return (
            validateName(formData.name) ||
            validateEmail(formData.email) ||
            validateContact(formData.contact) ||
            validateNewPassword(formData.password) ||
            (formData.password !== formData.confirmPassword
                ? "Passwords do not match."
                : "")
        );
    }

    function startSession(data) {
        // Store session token and user info (sessionStorage isolates tabs)
        saveSession(data.token, data.user);

        // Role-based redirection
        navigate(homePathForRole(data.user?.role || formData.role));
    }

    function backToLogin(message = "") {
        setMode("login");
        setError(message);
        setFormData((previousData) => ({ ...previousData, confirmPassword: "" }));
    }

    async function handleLogin() {
        const response = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                role: formData.role,
            }),
        });

        const data = await response.json();

        // Unknown email: offer to create an account instead of failing
        if (response.status === 404 && data.code === "ACCOUNT_NOT_FOUND") {
            if (data.canRegister) {
                setMode("signup");
                setShowPassword(false);
                setError("");
            } else {
                setError(data.error);
            }
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || "Login failed");
        }

        startSession(data);
    }

    async function handleSignup() {
        const validationError = validateSignup();

        if (validationError) {
            setError(validationError);
            return;
        }

        const response = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                contact: formData.contact,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            }),
        });

        const data = await response.json();

        // Someone created this account in the meantime: just sign in instead
        if (response.status === 409 && data.code === "EMAIL_EXISTS") {
            backToLogin("An account already exists for this email. Please sign in.");
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || "Registration failed");
        }

        // The server returns a session for the new account: user is logged in
        startSession(data);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (mode === "login") {
            const validationError = validateForm();

            if (validationError) {
                setError(validationError);
                return;
            }
        }

        setIsLoading(true);
        setError("");

        try {
            if (mode === "signup") {
                await handleSignup();
            } else {
                await handleLogin();
            }
        } catch (error) {
            console.error("Login error:", error);
            setError(error.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    const isSignup = mode === "signup";

    return (
        <div className="login-form-wrapper">
            <div className="login-heading">
                <p className="small-heading">
                    {isSignup ? "CREATE ACCOUNT" : "ACCOUNT LOGIN"}
                </p>
                <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
                <p>
                    {isSignup
                        ? "Review your details and create a hospital account. You will be signed in right away."
                        : "Sign in to continue to the Smart Blood Management System."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
                {isSignup && (
                    <div className="form-info" role="status">
                        We couldn't find an account for <strong>{formData.email.trim()}</strong>.
                        Would you like to create one? Fill in the details below to continue.
                    </div>
                )}

                {!isSignup && (
                    <div className="form-group">
                        <label htmlFor="role">Login as</label>

                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="hospital">Hospital</option>
                            <option value="admin">Blood Bank Admin</option>
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Email address</label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        autoComplete="email"
                        readOnly={isSignup}
                    />
                </div>

                {isSignup && (
                    <>
                        <div className="form-group">
                            <label htmlFor="name">Name of hospital / person</label>

                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter the name of your hospital or your full name"
                                autoComplete="name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contact">Contact number</label>

                            <input
                                id="contact"
                                name="contact"
                                type="tel"
                                value={formData.contact}
                                onChange={handleChange}
                                placeholder="Enter your contact number"
                                autoComplete="tel"
                            />
                        </div>
                    </>
                )}

                <div className="form-group">
                    <div className="label-row">
                        <label htmlFor="password">Password</label>
                        {!isSignup && (
                            <button
                                type="button"
                                className="forgot-button"
                                onClick={() => alert("Password recovery will be added later.")}
                            >
                                Forgot password?
                            </button>
                        )}
                    </div>

                    <div className="password-input">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={
                                isSignup
                                    ? "Create a password (min 8 chars, letters + numbers)"
                                    : "Enter your password"
                            }
                            autoComplete={isSignup ? "new-password" : "current-password"}
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword((previous) => !previous)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {isSignup && (
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>

                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                        />
                    </div>
                )}

                {error && <div className="form-error">{error}</div>}

                <button
                    type="submit"
                    className="login-button"
                    disabled={isLoading}
                >
                    {isSignup
                        ? isLoading
                            ? "Creating account..."
                            : "Create account & sign in"
                        : isLoading
                            ? "Signing in..."
                            : "Sign in"}
                </button>
            </form>

            <div className="login-footer">
                {isSignup ? (
                    <p>
                        Wrong email?
                        <button type="button" onClick={() => backToLogin()}>
                            Back to sign in
                        </button>
                    </p>
                ) : (
                    <p>
                        Don't have an account?
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                        >
                            Create an account
                        </button>
                    </p>
                )}
            </div>

        </div>
    );
}

export default LoginForm;
