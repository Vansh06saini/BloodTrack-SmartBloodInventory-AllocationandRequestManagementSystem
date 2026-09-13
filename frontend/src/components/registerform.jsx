import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RegisterForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        hospitalName: "",
        email: "",
        password: "",
        confirmPassword: "",
        contactNumber: "",
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
        if (!formData.hospitalName.trim()) {
            return "Please enter your hospital or full name.";
        }

        if (!formData.email.trim()) {
            return "Please enter your email address.";
        }

        if (!formData.email.includes("@")) {
            return "Please enter a valid email address.";
        }

        if (!formData.contactNumber.trim()) {
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
            alert("Registration successful! Redirecting to login...");
            navigate("/login");
        }, 1000);
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
                        name="hospitalName"
                        type="text"
                        value={formData.hospitalName}
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
                        name="contactNumber"
                        type="tel"
                        value={formData.contactNumber}
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