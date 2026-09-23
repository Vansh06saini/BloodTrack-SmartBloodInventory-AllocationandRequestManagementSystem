import { useState } from "react";
import { useNavigate } from "react-router-dom";

function MyRequests() {
  const navigate = useNavigate();

  const [requests] = useState([
    {
      id: "REQ-1001",
      bloodGroup: "O+",
      quantity: 3,
      priority: "Emergency",
      requiredDate: "2026-09-22",
      status: "Allocated",
    },
    {
      id: "REQ-1002",
      bloodGroup: "A+",
      quantity: 2,
      priority: "Urgent",
      requiredDate: "2026-09-23",
      status: "Waiting",
    },
    {
      id: "REQ-1003",
      bloodGroup: "B+",
      quantity: 4,
      priority: "Routine",
      requiredDate: "2026-09-25",
      status: "Completed",
    },
    {
      id: "REQ-1004",
      bloodGroup: "O-",
      quantity: 2,
      priority: "Emergency",
      requiredDate: "2026-09-22",
      status: "Waiting",
    },
  ]);

  const [filter, setFilter] = useState("All");

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter((request) => request.status === filter);

  const getStatusClass = (status) => {
    return `request-status ${status.toLowerCase()}`;
  };

  const getPriorityClass = (priority) => {
    return `request-priority ${priority.toLowerCase()}`;
  };

  return (
    <div className="my-requests-page">
      <div className="my-requests-container">
        <div className="my-requests-header">
          <div>
            <p className="request-label">Hospital Portal</p>
            <h1>My Blood Requests</h1>
            <p>
              View and track the blood requests submitted by your hospital.
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

        <div className="request-summary">
          <div className="summary-box">
            <span>Total Requests</span>
            <strong>{requests.length}</strong>
          </div>

          <div className="summary-box">
            <span>Waiting</span>
            <strong>
              {requests.filter((request) => request.status === "Waiting").length}
            </strong>
          </div>

          <div className="summary-box">
            <span>Allocated</span>
            <strong>
              {
                requests.filter(
                  (request) => request.status === "Allocated"
                ).length
              }
            </strong>
          </div>

          <div className="summary-box">
            <span>Completed</span>
            <strong>
              {
                requests.filter(
                  (request) => request.status === "Completed"
                ).length
              }
            </strong>
          </div>
        </div>

        <div className="requests-table-card">
          <div className="requests-table-top">
            <div>
              <h2>Request History</h2>
              <p>Track the current status of your blood requests.</p>
            </div>

            <select
              className="request-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Requests</option>
              <option value="Waiting">Waiting</option>
              <option value="Allocated">Allocated</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
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
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <button
                          type="button"
                          className="request-id-button"
                          onClick={() => navigate(`/hospital/requests/${request.id}`)}
                        >
                          {request.id}
                        </button>
                      </td>
                      <td>
                        <span className="blood-group">
                          {request.bloodGroup}
                        </span>
                      </td>
                      <td>{request.quantity} units</td>
                      <td>
                        <span className={getPriorityClass(request.priority)}>
                          {request.priority}
                        </span>
                      </td>
                      <td>{request.requiredDate}</td>
                      <td>
                        <span className={getStatusClass(request.status)}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-requests">
                      No requests found for the selected status.
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