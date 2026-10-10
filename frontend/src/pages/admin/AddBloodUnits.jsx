import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddBloodUnits() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        bloodGroup: "",
        quantity: "",
        collectionDate: "",
        expiryDate: "",
        batchNumber: "",
    });

    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));

        setMessage("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !formData.bloodGroup ||
            !formData.quantity ||
            !formData.collectionDate ||
            !formData.expiryDate ||
            !formData.batchNumber
        ) {
            setMessage("Please fill in all fields.");
            return;
        }

        if (
            !Number.isInteger(Number(formData.quantity)) ||
            Number(formData.quantity) <= 0
        ) {
            setMessage("Quantity must be a positive number.");
            return;
        }

        if (formData.expiryDate <= formData.collectionDate) {
            setMessage("Expiry date must be after the collection date.");
            return;
        }

        try {
            setIsSubmitting(true);
            setMessage("");

            const response = await fetch(
                "http://localhost:5000/api/blood-units",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bloodGroup: formData.bloodGroup,
                        quantity: Number(formData.quantity),
                        collectionDate: formData.collectionDate,
                        expiryDate: formData.expiryDate,
                        batchNumber: formData.batchNumber,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Failed to add blood units.");
                return;
            }

            setMessage(data.message);

            setFormData({
                bloodGroup: "",
                quantity: "",
                collectionDate: "",
                expiryDate: "",
                batchNumber: "",
            });
        } catch (error) {
            console.error("Error adding blood units:", error);
            setMessage("Unable to connect to the server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-form-page">
            <header className="admin-form-header">
                <div>
                    <button
                        type="button"
                        className="admin-back-button"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        Back to Dashboard
                    </button>

                    <h1>Add Blood Units</h1>

                    <p>Enter details of newly received blood units.</p>
                </div>
            </header>

            <main className="admin-form-container">
                <section className="admin-form-card">
                    <form onSubmit={handleSubmit}>
                        <div className="admin-form-grid">

                            <div className="admin-form-group">
                                <label htmlFor="bloodGroup">
                                    Blood Group
                                </label>

                                <select
                                    id="bloodGroup"
                                    name="bloodGroup"
                                    value={formData.bloodGroup}
                                    onChange={handleChange}
                                >
                                    <option value="">
                                        Select blood group
                                    </option>

                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>

                            <div className="admin-form-group">
                                <label htmlFor="quantity">
                                    Number of Units
                                </label>

                                <input
                                    id="quantity"
                                    name="quantity"
                                    type="number"
                                    min="1"
                                    placeholder="Enter quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label htmlFor="collectionDate">
                                    Collection Date
                                </label>

                                <input
                                    id="collectionDate"
                                    name="collectionDate"
                                    type="date"
                                    value={formData.collectionDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="admin-form-group">
                                <label htmlFor="expiryDate">
                                    Expiry Date
                                </label>

                                <input
                                    id="expiryDate"
                                    name="expiryDate"
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="admin-form-group admin-form-full-width">
                                <label htmlFor="batchNumber">
                                    Batch Number
                                </label>

                                <input
                                    id="batchNumber"
                                    name="batchNumber"
                                    type="text"
                                    placeholder="Enter batch number"
                                    value={formData.batchNumber}
                                    onChange={handleChange}
                                />

                                <small>
                                    Use the blood bank batch or collection
                                    reference number.
                                </small>
                            </div>
                        </div>

                        {message && (
                            <div
                                className={
                                    message.includes("successfully")
                                        ? "admin-form-message success"
                                        : "admin-form-message error"
                                }
                            >
                                {message}
                            </div>
                        )}

                        <div className="admin-form-actions">
                            <button
                                type="button"
                                className="admin-cancel-button"
                                onClick={() =>
                                    navigate("/admin/dashboard")
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="admin-submit-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Adding..."
                                    : "Add Blood Units"}
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}

export default AddBloodUnits;