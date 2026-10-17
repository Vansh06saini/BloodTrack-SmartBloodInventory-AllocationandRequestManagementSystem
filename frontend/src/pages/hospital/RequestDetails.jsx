import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

function RequestDetails() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [allocatedUnits, setAllocatedUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequestDetails = async () => {
    if (!requestId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/hospital/requests/${requestId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load request details");
      }

      setRequest(data.request);
      setAllocatedUnits(data.allocatedUnits || []);
    } catch (err) {
      console.error("Error loading request details:", err);
      setError(err.message || "Unable to fetch request details from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  };

  if (isLoading) {
    return (
      <div className="request-details-page" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading request details from database...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="request-details-page" style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ padding: "20px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "8px", maxWidth: "500px", margin: "0 auto" }}>
          <h2>Request Not Found</h2>
          <p>{error || "The requested blood requirement does not exist."}</p>
          <button
            type="button"
            className="back-button"
            style={{ marginTop: "16px" }}
            onClick={() => navigate("/hospital/requests")}
          >
            Back to My Requests
          </button>
        </div>
      </div>
    );
  }

  const isWaiting = request.status === "WAITING";
  const isPaused = request.status === "PAUSED";
  const isProcessing = request.status === "PROCESSING";
  const isAllocated = request.status === "ALLOCATED" || request.status === "COMPLETED";
  const isCompleted = request.status === "COMPLETED";

  const statusSteps = [
    {
      title: "Request Submitted",
      description: `Submitted on ${formatDate(request.created_at)} for ${request.quantity} unit(s) of ${request.blood_group}.`,
      completed: true,
    },
    {
      title: isPaused ? "Request Paused (Preempted)" : "Priority Queue & Processing",
      description: isPaused
        ? "Temporarily paused because an EMERGENCY request required higher priority stock. Will auto-resume first."
        : "Checked by automatic priority scheduler according to urgency level.",
      completed: isPaused || isProcessing || isAllocated,
    },
    {
      title: "Blood Units Allocated",
      description: isAllocated
        ? `${allocatedUnits.length} unit(s) allocated from available stock using FEFO inventory.`
        : "Awaiting inventory allocation.",
      completed: isAllocated,
    },
    {
      title: "Request Completed",
      description: isCompleted
        ? "Blood units have been confirmed and fulfilled."
        : "Pending hospital dispatch/issue confirmation.",
      completed: isCompleted,
    },
  ];

  return (
    <div className="request-details-page">
      <div className="request-details-container">
        <div className="details-header">
          <div>
            <p className="request-label">Hospital Portal</p>
            <h1>Request Details</h1>
            <p>View complete live information, allocated blood units, and allocation progress.</p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/hospital/requests")}
          >
            Back to My Requests
          </button>
        </div>

        <div className="request-main-card">
          <div className="request-title-row">
            <div>
              <span className="request-detail-label">Request Code</span>
              <h2>{request.request_code || `REQ-${request.request_id}`}</h2>
            </div>

            <span className={`request-status ${(request.status || "waiting").toLowerCase()}`}>
              {request.status}
            </span>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span>Blood Group</span>
              <strong>{request.blood_group}</strong>
            </div>

            <div className="detail-item">
              <span>Quantity</span>
              <strong>{request.quantity} units</strong>
            </div>

            <div className="detail-item">
              <span>Priority</span>
              <strong>
                <span className={`request-priority ${(request.priority || "routine").toLowerCase()}`}>
                  {request.priority}
                </span>
              </strong>
            </div>

            <div className="detail-item">
              <span>Required Date</span>
              <strong>{formatDate(request.required_date)}</strong>
            </div>

            <div className="detail-item">
              <span>Created Date</span>
              <strong>{formatDate(request.created_at)}</strong>
            </div>

            <div className="detail-item">
              <span>Hospital Name</span>
              <strong>{request.hospital_name || "Hospital"}</strong>
            </div>
          </div>
        </div>

        <div className="details-two-column">
          <div className="allocation-card">
            <div className="section-heading">
              <h2>Allocated Blood Units ({allocatedUnits.length})</h2>
              <p>Details about the physical units allocated to this request.</p>
            </div>

            {allocatedUnits.length === 0 ? (
              <p style={{ color: "#6b7280", padding: "16px 0" }}>
                {request.status === "PAUSED"
                  ? "Units were preempted for a higher-priority emergency request. Awaiting new stock allocation."
                  : "No units have been allocated yet. Request is in queue."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {allocatedUnits.map((unit) => (
                  <div
                    key={unit.allocation_id || unit.unit_id}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "6px",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong style={{ color: "#111827", fontSize: "14px" }}>
                        {unit.unit_code}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "10px" }}>
                        Batch: {unit.batch_number || "BATCH-STD"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="priority-badge urgent" style={{ fontSize: "11px" }}>
                        {unit.blood_group}
                      </span>
                      <p style={{ fontSize: "11px", color: "#4b5563", margin: "2px 0 0 0" }}>
                        Exp: {formatDate(unit.expiry_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="timeline-card">
            <div className="section-heading">
              <h2>Request Progress</h2>
              <p>Current processing history of this request.</p>
            </div>

            <div className="request-timeline">
              {statusSteps.map((step, index) => (
                <div
                  className={`timeline-item ${step.completed ? "completed" : ""}`}
                  key={step.title}
                >
                  <div className="timeline-marker">
                    {step.completed ? "✓" : index + 1}
                  </div>

                  <div className="timeline-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="details-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => navigate("/hospital/requests")}
          >
            View All Requests
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={() => navigate("/hospital/request")}
          >
            Create New Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestDetails;