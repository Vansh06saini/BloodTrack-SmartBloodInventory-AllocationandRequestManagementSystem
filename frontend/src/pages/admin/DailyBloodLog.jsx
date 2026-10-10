import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function DailyBloodLog() {
    const navigate = useNavigate();

    const getTodayDate = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [date, setDate] = useState(getTodayDate());
    const [typeFilter, setTypeFilter] = useState("All");
    const [bloodGroupFilter, setBloodGroupFilter] = useState("All");
    const [limit, setLimit] = useState("15");

    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError("");

            const params = new URLSearchParams();
            if (date) params.append("date", date);
            if (typeFilter !== "All") params.append("type", typeFilter);
            if (bloodGroupFilter !== "All") params.append("bloodGroup", bloodGroupFilter);
            if (limit) params.append("limit", limit);

            const queryString = params.toString() ? `?${params.toString()}` : "";
            const response = await fetch(`http://localhost:5000/api/blood-units/daily-logs${queryString}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch blood logs.");
            }

            setLogs(Array.isArray(data.logs) ? data.logs : []);
        } catch (err) {
            console.error("Error fetching daily blood logs:", err);
            setError("Unable to connect to the server or load real blood log data.");
        } finally {
            setIsLoading(false);
        }
    }, [date, typeFilter, bloodGroupFilter, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const incomingUnits = logs
        .filter((log) => log.type === "Incoming")
        .reduce((total, log) => total + Number(log.quantity || 0), 0);

    const outgoingUnits = logs
        .filter((log) => log.type === "Outgoing")
        .reduce((total, log) => total + Number(log.quantity || 0), 0);

    return (
        <div className="daily-log-page">
            <header className="daily-log-header">
                <div>
                    <button
                        type="button"
                        className="admin-back-button"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        Back to Dashboard
                    </button>

                    <h1>Daily Blood Log</h1>
                    <p>Real-time view of recent incoming and outgoing blood unit movements.</p>
                </div>

                <button
                    type="button"
                    className="admin-primary-button"
                    onClick={fetchLogs}
                    disabled={isLoading}
                    style={{ padding: "8px 16px", fontSize: "14px" }}
                >
                    {isLoading ? "Refreshing..." : "Refresh Logs"}
                </button>
            </header>

            <main className="daily-log-container">
                {error && (
                    <div className="admin-form-message error" style={{ marginBottom: "1.5rem" }}>
                        {error}
                    </div>
                )}

                <section className="daily-log-summary">
                    <div className="daily-log-summary-card">
                        <span>Incoming Units</span>
                        <strong>{isLoading ? "..." : incomingUnits}</strong>
                    </div>

                    <div className="daily-log-summary-card">
                        <span>Outgoing Units</span>
                        <strong>{isLoading ? "..." : outgoingUnits}</strong>
                    </div>

                    <div className="daily-log-summary-card">
                        <span>Recent Movements</span>
                        <strong>{isLoading ? "..." : logs.length}</strong>
                    </div>
                </section>

                <section className="daily-log-card">
                    <div className="daily-log-filters">
                        <div className="daily-log-filter">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <label htmlFor="log-date">Date</label>
                                {date && (
                                    <button
                                        type="button"
                                        onClick={() => setDate("")}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#8f1d2c",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            padding: "0 0 4px 0"
                                        }}
                                    >
                                        Show All Dates
                                    </button>
                                )}
                            </div>

                            <input
                                id="log-date"
                                type="date"
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                            />
                        </div>

                        <div className="daily-log-filter">
                            <label htmlFor="log-type">Movement Type</label>

                            <select
                                id="log-type"
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                            >
                                <option value="All">All Movements</option>
                                <option value="Incoming">Incoming</option>
                                <option value="Outgoing">Outgoing</option>
                            </select>
                        </div>

                        <div className="daily-log-filter">
                            <label htmlFor="log-blood-group">Blood Group</label>

                            <select
                                id="log-blood-group"
                                value={bloodGroupFilter}
                                onChange={(event) =>
                                    setBloodGroupFilter(event.target.value)
                                }
                            >
                                <option value="All">All Groups</option>
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

                        <div className="daily-log-filter">
                            <label htmlFor="log-limit">Show Recent</label>

                            <select
                                id="log-limit"
                                value={limit}
                                onChange={(event) => setLimit(event.target.value)}
                            >
                                <option value="10">10 Logs</option>
                                <option value="15">15 Logs</option>
                                <option value="25">25 Logs</option>
                                <option value="50">50 Logs</option>
                            </select>
                        </div>
                    </div>

                    <div className="daily-log-table-wrapper">
                        <table className="daily-log-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Unit ID</th>
                                    <th>Blood Group</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Reference</th>
                                    <th>Details</th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="daily-log-empty">
                                            Loading real-time logs from database...
                                        </td>
                                    </tr>
                                ) : logs.length > 0 ? (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: "#111827" }}>{log.time}</div>
                                                {log.date && (
                                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{log.date}</div>
                                                )}
                                            </td>
                                            <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{log.unitId}</td>
                                            <td className="daily-log-blood-group">
                                                {log.bloodGroup}
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        log.type === "Incoming"
                                                            ? "daily-log-type incoming"
                                                            : "daily-log-type outgoing"
                                                    }
                                                >
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{log.quantity}</td>
                                            <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#4b5563" }}>
                                                {log.reference}
                                            </td>
                                            <td>{log.details}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="daily-log-empty">
                                            No blood movements found for the selected criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default DailyBloodLog;