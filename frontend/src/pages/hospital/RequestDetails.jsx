import { useNavigate, useParams } from "react-router-dom";

function RequestDetails() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const request = {
    id: requestId || "REQ-1001",
    bloodGroup: "O+",
    quantity: 3,
    priority: "Emergency",
    requiredDate: "2026-09-22",
    status: "Allocated",
    createdDate: "2026-09-21",
    hospital: "City Care Hospital",
  };

  const allocation = {
    allocatedUnits: 3,
    bloodBank: "Central Blood Bank",
    allocationDate: "2026-09-21",
    method: "FEFO",
  };

  const statusSteps = [
    {
      title: "Request Submitted",
      description: "The blood request was submitted by the hospital.",
      completed: true,
    },
    {
      title: "Request Reviewed",
      description: "The request was checked according to its priority.",
      completed: true,
    },
    {
      title: "Blood Allocated",
      description: "Required blood units were allocated from available stock.",
      completed: true,
    },
    {
      title: "Request Completed",
      description: "The request will be completed after blood issue confirmation.",
      completed: false,
    },
  ];

  return (
    <div className="request-details-page">
      <div className="request-details-container">
        <div className="details-header">
          <div>
            <p className="request-label">Hospital Portal</p>
            <h1>Request Details</h1>
            <p>View the complete information and processing status.</p>
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
              <span className="request-detail-label">Request ID</span>
              <h2>{request.id}</h2>
            </div>

            <span
              className={`request-status ${request.status.toLowerCase()}`}
            >
              {request.status}
            </span>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span>Blood Group</span>
              <strong>{request.bloodGroup}</strong>
            </div>

            <div className="detail-item">
              <span>Quantity</span>
              <strong>{request.quantity} units</strong>
            </div>

            <div className="detail-item">
              <span>Priority</span>
              <strong>
                <span
                  className={`request-priority ${request.priority.toLowerCase()}`}
                >
                  {request.priority}
                </span>
              </strong>
            </div>

            <div className="detail-item">
              <span>Required Date</span>
              <strong>{request.requiredDate}</strong>
            </div>

            <div className="detail-item">
              <span>Created Date</span>
              <strong>{request.createdDate}</strong>
            </div>

            <div className="detail-item">
              <span>Hospital</span>
              <strong>{request.hospital}</strong>
            </div>
          </div>
        </div>

        <div className="details-two-column">
          <div className="allocation-card">
            <div className="section-heading">
              <h2>Allocation Information</h2>
              <p>Details about the blood units allocated to this request.</p>
            </div>

            <div className="allocation-grid">
              <div className="detail-item">
                <span>Allocated Units</span>
                <strong>{allocation.allocatedUnits} units</strong>
              </div>

              <div className="detail-item">
                <span>Blood Bank</span>
                <strong>{allocation.bloodBank}</strong>
              </div>

              <div className="detail-item">
                <span>Allocation Date</span>
                <strong>{allocation.allocationDate}</strong>
              </div>

              <div className="detail-item">
                <span>Allocation Method</span>
                <strong>{allocation.method}</strong>
              </div>
            </div>
          </div>

          <div className="timeline-card">
            <div className="section-heading">
              <h2>Request Progress</h2>
              <p>Current processing history of this request.</p>
            </div>

            <div className="request-timeline">
              {statusSteps.map((step, index) => (
                <div
                  className={`timeline-item ${step.completed ? "completed" : ""
                    }`}
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