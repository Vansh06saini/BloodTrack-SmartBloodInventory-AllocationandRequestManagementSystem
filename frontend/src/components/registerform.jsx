import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RegisterForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        contact: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
        if (!formData.name.trim()) {
            return "Please enter your hospital or full name.";
        }

        if (!formData.email.trim()) {
            return "Please enter your email address.";
        }

        if (!formData.email.includes("@")) {
            return "Please enter a valid email address.";
        }

        if (!formData.contact.trim()) {
            return "Please enter your contact number.";
        }

        if (!formData.password.trim()) {
            return "Please enter your password.";
        }

        if (formData.password.length < 6) {
            return "Password must contain at least 6 characters.";
        }

        if (formData.password !== formData.confirmPassword) {
            return "Passwords do not match.";
        }

        return "";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await
                fetch("http://localhost:5000/api/auth/register", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",

                    },
                    body: JSON.stringify(formData)
                });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Registration failed");
            }

            navigate("/login");

        } catch (error) {
            console.error("Registration error:", error);
            setError(error.message || "Registration failed.Please try again");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="register-form-wrapper">
            <div className="register-heading">
                <p className="small-heading">CREATE ACCOUNT</p>
                <h2>Join BloodTrack</h2>
                <p>
                    Create your account to manage blood inventory and requests
                    with confidence.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
                <div className="form-group">
                    <label htmlFor="hospital-name">Name of hospital / person</label>
                    <input
                        id="hospital-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter the name of your hospital or your full name"
                        autoComplete="name"
                    />
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
                    <label htmlFor="contact-number">Contact number</label>
                    <input
                        id="contact-number"
                        name="contact"
                        type="tel"
                        value={formData.contact}
                        onChange={handleChange}
                        placeholder="Enter your contact number"
                        autoComplete="tel"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password (min 6 chars)"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                    />
                </div>

                {error && <div className="form-error">{error}</div>}

                <button
                    type="submit"
                    className="register-button"
                    disabled={isLoading}
                >
                    {isLoading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <div className="register-footer">
                <p>
                    Already have an account?
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}

export default RegisterForm;