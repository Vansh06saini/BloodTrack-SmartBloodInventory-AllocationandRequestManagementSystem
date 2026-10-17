import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function MyRequests() {
  const navigate = useNavigate();

  const [storedUser] = useState(() => {
    try {
      const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const hospitalId = storedUser?.id;

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    if (!hospitalId) {
      setIsLoading(false);
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/hospital/requests?hospitalId=${hospitalId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load blood requests");
      }

      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message || "Failed to load live requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [hospitalId]);

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter(
        (request) => (request.status || "").toUpperCase() === filter.toUpperCase()
      );

  const getStatusClass = (status) => {
    return `request-status ${(status || "waiting").toLowerCase()}`;
  };

  const getPriorityClass = (priority) => {
    return `request-priority ${(priority || "routine").toLowerCase()}`;
  };

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

  // Summary counts
  const totalCount = requests.length;
  const waitingCount = requests.filter((r) => (r.status || "").toUpperCase() === "WAITING").length;
  const pausedCount = requests.filter((r) => (r.status || "").toUpperCase() === "PAUSED").length;
  const allocatedCount = requests.filter((r) => (r.status || "").toUpperCase() === "ALLOCATED").length;
  const completedCount = requests.filter((r) => (r.status || "").toUpperCase() === "COMPLETED").length;

  return (
    <div className="my-requests-page">
      <div className="my-requests-container">
        <div className="my-requests-header">
          <div>
            <p className="request-label">Hospital Portal</p>
            <h1>My Blood Requests</h1>
            <p>
              View and track real-time blood requests submitted by your hospital.
            </p>
          </div>

          <button
            type="button"
            className="new-request-button"
            onClick={() => navigate("/hospital/request")}
          >
            New Blood Request
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              borderRadius: "6px",
              border: "1px solid #fca5a5"
            }}
          >
            {error}
          </div>
        )}

        <div className="request-summary">
          <div className="summary-box">
            <span>Total Requests</span>
            <strong>{isLoading ? "..." : totalCount}</strong>
          </div>

          <div className="summary-box">
            <span>Waiting</span>
            <strong>{isLoading ? "..." : waitingCount}</strong>
          </div>

          <div className="summary-box">
            <span>Paused (Preempted)</span>
            <strong>{isLoading ? "..." : pausedCount}</strong>
          </div>

          <div className="summary-box">
            <span>Allocated</span>
            <strong>{isLoading ? "..." : allocatedCount}</strong>
          </div>

          <div className="summary-box">
            <span>Completed</span>
            <strong>{isLoading ? "..." : completedCount}</strong>
          </div>
        </div>

        <div className="requests-table-card">
          <div className="requests-table-top">
            <div>
              <h2>Request History</h2>
              <p>Track live allocation status and updates for your requests.</p>
            </div>

            <select
              className="request-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Requests</option>
              <option value="WAITING">Waiting</option>
              <option value="PAUSED">Paused</option>
              <option value="PROCESSING">Processing</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="requests-table-wrapper">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Required Date</th>
                  <th>Created Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                      Loading live requests from database...
                    </td>
                  </tr>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request.request_id || request.request_code}>
                      <td>
                        <button
                          type="button"
                          className="request-id-button"
                          onClick={() => navigate(`/hospital/requests/${request.request_id || request.request_code}`)}
                        >
                          {request.request_code || `REQ-${request.request_id}`}
                        </button>
                      </td>
                      <td>
                        <span className="blood-group">
                          {request.blood_group}
                        </span>
                      </td>
                      <td>{request.quantity} units</td>
                      <td>
                        <span className={getPriorityClass(request.priority)}>
                          {request.priority}
                        </span>
                      </td>
                      <td>{formatDate(request.required_date)}</td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <span className={getStatusClass(request.status)}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-requests" style={{ textAlign: "center", padding: "32px" }}>
                      No blood requests found for the selected status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-link-button"
          onClick={() => navigate("/hospital/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default MyRequests;