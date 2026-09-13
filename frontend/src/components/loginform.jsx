import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginForm() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "hospital",
    });

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

    function handleSubmit(event) {
        event.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError("");

        setTimeout(() => {
            setIsLoading(false);

            console.log("Login information:", {
                email: formData.email,
                role: formData.role,
            });

            alert(
                `Demo login successful. Selected role: ${formData.role}`
            );
        }, 1000);
    }

    return (
        <div className="login-form-wrapper">
            <div className="login-heading">
                <p className="small-heading">ACCOUNT LOGIN</p>
                <h2>Welcome back</h2>
                <p>
                    Sign in to continue to the Smart Blood Management System.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
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
                    />
                </div>

                <div className="form-group">
                    <div className="label-row">
                        <label htmlFor="password">Password</label>
                        <button
                            type="button"
                            className="forgot-button"
                            onClick={() => alert("Password recovery will be added later.")}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <div className="password-input">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            autoComplete="current-password"
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

                {error && <div className="form-error">{error}</div>}

                <button
                    type="submit"
                    className="login-button"
                    disabled={isLoading}
                >
                    {isLoading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="login-footer">
                <p>
                    Don't have an account?
                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                    >
                        Create an account
                    </button>
                </p>
            </div>

        </div>
    );
}

export default LoginForm;