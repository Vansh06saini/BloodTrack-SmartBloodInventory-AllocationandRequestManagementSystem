import { useState } from "react";

function HospitalDashboard() {
  const [requests] = useState([
    {
      id: "REQ-1001",
      bloodGroup: "O+",
      quantity: 3,
      priority: "Emergency",
      status: "Allocated",
      date: "20 Sep 2026",
    },
    {
      id: "REQ-1002",
      bloodGroup: "A+",
      quantity: 2,
      priority: "Urgent",
      status: "Waiting",
      date: "20 Sep 2026",
    },
    {
      id: "REQ-1003",
      bloodGroup: "B+",
      quantity: 4,
      priority: "Routine",
      status: "Completed",
      date: "19 Sep 2026",
    },
    {
      id: "REQ-1004",
      bloodGroup: "O-",
      quantity: 2,
      priority: "Emergency",
      status: "Waiting",
      date: "19 Sep 2026",
    },
  ]);

  const pendingRequests = requests.filter(
    (request) => request.status === "Waiting"
  ).length;

  const allocatedRequests = requests.filter(
    (request) => request.status === "Allocated"
  ).length;

  const emergencyRequests = requests.filter(
    (request) => request.priority === "Emergency"
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "Completed"
  ).length;

  function getStatusClass(status) {
    return status.toLowerCase();
  }

  function getPriorityClass(priority) {
    return priority.toLowerCase();
  }

  function goToRequestPage() {
    window.location.href = "/hospital/request";
  }

  function goToRequestsPage() {
    window.location.href = "/hospital/requests";
  }

  function logout() {
    window.location.href = "/login";
  }

  return (
    <div className="hospital-dashboard">
      <aside className="hospital-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">SB</div>

          <div>
            <h2>Smart Blood</h2>
            <p>Hospital Portal</p>
          </div>
        </div>

        <nav className="sidebar-navigation">
          <button className="sidebar-link active">
            Dashboard
          </button>

          <button
            className="sidebar-link"
            onClick={goToRequestPage}
          >
            New Blood Request
          </button>

          <button
            className="sidebar-link"
            onClick={goToRequestsPage}
          >
            My Requests
          </button>

          <button className="sidebar-link">
            Profile
          </button>
        </nav>

        <button
          className="sidebar-logout"
          onClick={logout}
        >
          Sign out
        </button>
      </aside>

      <main className="hospital-main">
        <header className="hospital-header">
          <div>
            <p className="header-label">HOSPITAL PORTAL</p>
            <h1>Hospital Dashboard</h1>
          </div>

          <div className="hospital-user">
            <div className="user-avatar">CC</div>

            <div>
              <strong>City Care Hospital</strong>
              <span>Hospital Staff</span>
            </div>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <h2>Welcome back, City Care Hospital</h2>

            <p>
              Monitor your blood requests and keep track of their
              current status from one place.
            </p>
          </div>

          <button
            className="primary-dashboard-button"
            onClick={goToRequestPage}
          >
            Create Blood Request
          </button>
        </section>

        <section className="dashboard-statistics">
          <div className="dashboard-stat-card">
            <div>
              <p>Total Requests</p>
              <h3>{requests.length}</h3>
            </div>

            <span className="stat-label">All requests</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Pending</p>
              <h3>{pendingRequests}</h3>
            </div>

            <span className="stat-label">Awaiting allocation</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Allocated</p>
              <h3>{allocatedRequests}</h3>
            </div>

            <span className="stat-label">Blood allocated</span>
          </div>

          <div className="dashboard-stat-card">
            <div>
              <p>Emergency</p>
              <h3>{emergencyRequests}</h3>
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
                className="view-all-button"
                onClick={goToRequestsPage}
              >
                View all
              </button>
            </div>

            <div className="request-table-wrapper">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Blood Group</th>
                    <th>Quantity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.id}</strong>
                      </td>

                      <td>
                        <span className="blood-group">
                          {request.bloodGroup}
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

                      <td>{request.date}</td>
                    </tr>
                  ))}
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

              <strong>{pendingRequests}</strong>
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

              <strong>{allocatedRequests}</strong>
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

              <strong>{emergencyRequests}</strong>
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

              <strong>{completedRequests}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HospitalDashboard;