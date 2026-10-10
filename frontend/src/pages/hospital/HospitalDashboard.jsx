import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function HospitalDashboard() {
  const navigate = useNavigate();

  const [storedUser, setStoredUser] = useState(() => {
    try {
      const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const hospitalId = storedUser?.id;
  const hospitalName = storedUser?.name || "Hospital Staff";

  const [summary, setSummary] = useState({
    total_requests: 0,
    waiting_requests: 0,
    processing_requests: 0,
    allocated_requests: 0,
    completed_requests: 0,
    rejected_requests: 0,
    emergency_requests: 0,
  });

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    if (!hospitalId) {
      setIsLoading(false);
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/hospital/dashboard?hospitalId=${hospitalId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load dashboard data");
      }

      if (data.requestsSummary) {
        setSummary({
          total_requests: Number(data.requestsSummary.total_requests || 0),
          waiting_requests: Number(data.requestsSummary.waiting_requests || 0),
          processing_requests: Number(data.requestsSummary.processing_requests || 0),
          allocated_requests: Number(data.requestsSummary.allocated_requests || 0),
          completed_requests: Number(data.requestsSummary.completed_requests || 0),
          rejected_requests: Number(data.requestsSummary.rejected_requests || 0),
          emergency_requests: Number(data.requestsSummary.emergency_requests || 0),
        });
      }

      if (data.recentRequests) {
        setRequests(data.recentRequests);
      }
    } catch (err) {
      console.error("Error fetching hospital dashboard data:", err);
      setError("Unable to connect to server for live hospital data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [hospitalId]);

  function getStatusClass(status) {
    return (status || "waiting").toLowerCase();
  }

  function getPriorityClass(priority) {
    return (priority || "routine").toLowerCase();
  }

  function getInitials(name) {
    if (!name) return "H";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  }

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="hospital-dashboard">
      <aside className="hospital-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">SB</div>

          <div>
            <h2>Smart Blood</h2>
            <p>Portal</p>
          </div>
        </div>

        <nav className="sidebar-navigation">
          <button
            type="button"
            className="sidebar-link active"
            onClick={() => navigate("/hospital/dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/hospital/request")}
          >
            New Blood Request
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/hospital/requests")}
          >
            My Requests
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/hospital/dashboard")}
          >
            Profile
          </button>
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
        >
          Sign out
        </button>
      </aside>

      <main className="hospital-main">
        <header className="hospital-header">
          <div>
            <p className="header-label">USER PORTAL</p>
            <h1>User Dashboard</h1>
          </div>

          <div className="hospital-user">
            <div className="user-avatar">{getInitials(hospitalName)}</div>

            <div>
              <strong>{hospitalName}</strong>

            </div>
          </div>
        </header>

        {error && (
          <div
            className="admin-form-message error"
            style={{ marginTop: "20px" }}
          >
            {error}
          </div>
        )}

        <section className="dashboard-welcome">
          <div>
            <h2>Welcome back, {hospitalName}</h2>

            <p>
              Monitor your blood requests and keep track of their
              current status from one place.
            </p>
          </div>

          <button
            type="button"
            className="primary-dashboard-button"
            onClick={() => navigate("/hospital/request")}
          >
            Create Blood Request
          </button>
        </section>

        <section className="dashboard-statistics">
          <div className="dashboard-stat-card">
            <div>
              <p>Total Requests</p>
              <h3>{isLoading ? "..." : summary.total_requests}</h3>
            </div>

            <span className="stat-label">All requests</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Pending</p>
              <h3>{isLoading ? "..." : summary.waiting_requests}</h3>
            </div>

            <span className="stat-label">Awaiting allocation</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Allocated</p>
              <h3>{isLoading ? "..." : summary.allocated_requests}</h3>
            </div>

            <span className="stat-label">Blood allocated</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Emergency</p>
              <h3>{isLoading ? "..." : summary.emergency_requests}</h3>
            </div>

            <span className="stat-label">Emergency requests</span>
          </div>
        </section>

        <section className="dashboard-content-grid">
          <div className="recent-requests-card">
            <div className="section-heading">
              <div>
                <p className="section-label">REQUEST ACTIVITY</p>
                <h2>Recent Blood Requests</h2>
              </div>

              <button
                type="button"
                className="view-all-button"
                onClick={() => navigate("/hospital/requests")}
              >
                View all
              </button>
            </div>

            <div className="request-table-wrapper">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Request Code</th>
                    <th>Blood Group</th>
                    <th>Quantity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#858b91" }}>
                        Loading requests...
                      </td>
                    </tr>
                  ) : requests.length > 0 ? (
                    requests.map((request) => (
                      <tr key={request.request_id || request.request_code}>
                        <td>
                          <strong>{request.request_code}</strong>
                        </td>

                        <td>
                          <span className="blood-group">
                            {request.blood_group}
                          </span>
                        </td>

                        <td>{request.quantity} units</td>

                        <td>
                          <span
                            className={`priority-badge ${getPriorityClass(
                              request.priority
                            )}`}
                          >
                            {request.priority}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td>{formatDate(request.created_at || request.required_date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          textAlign: "center",
                          padding: "36px",
                          color: "#858b91",
                          fontStyle: "italic",
                        }}
                      >
                        No blood requests found. Click &quot;Create Blood Request&quot; to submit one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-side-card">
            <div className="section-heading">
              <div>
                <p className="section-label">SUMMARY</p>
                <h2>Request Overview</h2>
              </div>
            </div>

            <div className="overview-item">
              <div>
                <span className="overview-title">
                  Pending requests
                </span>

                <span className="overview-description">
                  Waiting for blood allocation
                </span>
              </div>

              <strong>{isLoading ? "..." : summary.waiting_requests}</strong>
            </div>

            <div className="overview-item">
              <div>
                <span className="overview-title">
                  Processing requests
                </span>

                <span className="overview-description">
                  Currently in progress
                </span>
              </div>

              <strong>{isLoading ? "..." : summary.processing_requests}</strong>
            </div>

            <div className="overview-item">
              <div>
                <span className="overview-title">
                  Allocated requests
                </span>

                <span className="overview-description">
                  Blood has been assigned
                </span>
              </div>

              <strong>{isLoading ? "..." : summary.allocated_requests}</strong>
            </div>

            <div className="overview-item">
              <div>
                <span className="overview-title">
                  Emergency requests
                </span>

                <span className="overview-description">
                  High priority requests
                </span>
              </div>

              <strong>{isLoading ? "..." : summary.emergency_requests}</strong>
            </div>

            <div className="overview-item">
              <div>
                <span className="overview-title">
                  Completed requests
                </span>

                <span className="overview-description">
                  Successfully completed
                </span>
              </div>

              <strong>{isLoading ? "..." : summary.completed_requests}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HospitalDashboard;