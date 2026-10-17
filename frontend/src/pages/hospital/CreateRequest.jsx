import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateRequest() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bloodGroup: "",
    quantity: "",
    priority: "",
    requiredDate: "",
  });

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    if (!formData.bloodGroup) {
      setMessage("Please select a blood group.");
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setMessage("Please enter a valid quantity.");
      return;
    }

    if (!formData.priority) {
      setMessage("Please select a priority.");
      return;
    }

    if (!formData.requiredDate) {
      setMessage("Please select the required date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const storedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      
      if (!storedUser?.id) {
        throw new Error("You must be logged in to submit a request. Please sign in again.");
      }

      const hospitalId = storedUser.id;

      const response = await fetch(
        "http://localhost:5000/api/hospital/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hospitalId,
            bloodGroup: formData.bloodGroup,
            quantity: Number(formData.quantity),
            priority: formData.priority,
            requiredDate: formData.requiredDate,
            reason: "Blood requirement submitted by hospital",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit blood request");
      }

      setMessage(
        "Blood request submitted successfully. The request is now waiting for processing."
      );

      setFormData({
        bloodGroup: "",
        quantity: "",
        priority: "",
        requiredDate: "",
      });
    } catch (error) {
      console.error("Error submitting blood request:", error);

      setMessage(
        error.message || "Failed to submit blood request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="request-page">
      <div className="request-container">

        <div className="request-header">
          <div>
            <p className="request-label">Hospital Portal</p>

            <h1>Create Blood Request</h1>

            <p>
              Enter the blood requirement details to submit a new request.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/hospital/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="request-card">
          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">
                <label htmlFor="bloodGroup">
                  Blood Group
                </label>

                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                >
                  <option value="">Select blood group</option>

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

              <div className="form-group">
                <label htmlFor="quantity">
                  Quantity
                </label>

                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  placeholder="Enter units required"
                  value={formData.quantity}
                  onChange={handleChange}
                />

                <span className="input-help">
                  Enter the number of blood units required.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="priority">
                  Priority
                </label>

                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="">Select priority</option>

                  <option value="EMERGENCY">
                    Emergency
                  </option>

                  <option value="URGENT">
                    Urgent
                  </option>

                  <option value="ROUTINE">
                    Routine
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="requiredDate">
                  Required Date
                </label>

                <input
                  type="date"
                  id="requiredDate"
                  name="requiredDate"
                  value={formData.requiredDate}
                  onChange={handleChange}
                />
              </div>

            </div>

            {message && (
              <div
                className={
                  message.includes("successfully")
                    ? "request-message success"
                    : "request-message error"
                }
              >
                {message}
              </div>
            )}

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate("/hospital/dashboard")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="submit-request-button"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Blood Request"}
              </button>

            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateRequest;