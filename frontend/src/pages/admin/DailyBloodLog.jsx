import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DailyBloodLog() {
    const navigate = useNavigate();

    const [date, setDate] = useState("2026-09-25");
    const [typeFilter, setTypeFilter] = useState("All");
    const [bloodGroupFilter, setBloodGroupFilter] = useState("All");

    const logs = [
        {
            id: "LOG-001",
            time: "09:15 AM",
            unitId: "BU-101",
            bloodGroup: "O+",
            type: "Incoming",
            quantity: 5,
            reference: "BATCH-101",
            details: "New blood units received",
        },
        {
            id: "LOG-002",
            time: "10:05 AM",
            unitId: "BU-106",
            bloodGroup: "A+",
            type: "Incoming",
            quantity: 3,
            reference: "BATCH-102",
            details: "New blood units received",
        },
        {
            id: "LOG-003",
            time: "11:20 AM",
            unitId: "BU-045",
            bloodGroup: "O+",
            type: "Outgoing",
            quantity: 1,
            reference: "REQ-1001",
            details: "Allocated to hospital request",
        },
        {
            id: "LOG-004",
            time: "11:21 AM",
            unitId: "BU-046",
            bloodGroup: "O+",
            type: "Outgoing",
            quantity: 1,
            reference: "REQ-1001",
            details: "Allocated to hospital request",
        },
        {
            id: "LOG-005",
            time: "11:22 AM",
            unitId: "BU-047",
            bloodGroup: "O+",
            type: "Outgoing",
            quantity: 1,
            reference: "REQ-1001",
            details: "Allocated to hospital request",
        },
        {
            id: "LOG-006",
            time: "02:30 PM",
            unitId: "BU-109",
            bloodGroup: "B+",
            type: "Incoming",
            quantity: 4,
            reference: "BATCH-103",
            details: "New blood units received",
        },
    ];

    const filteredLogs = logs.filter((log) => {
        const matchesType =
            typeFilter === "All" || log.type === typeFilter;

        const matchesBloodGroup =
            bloodGroupFilter === "All" ||
            log.bloodGroup === bloodGroupFilter;

        return matchesType && matchesBloodGroup;
    });

    const incomingUnits = filteredLogs
        .filter((log) => log.type === "Incoming")
        .reduce((total, log) => total + log.quantity, 0);

    const outgoingUnits = filteredLogs
        .filter((log) => log.type === "Outgoing")
        .reduce((total, log) => total + log.quantity, 0);

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
                    <p>View incoming and outgoing blood unit movements.</p>
                </div>
            </header>

            <main className="daily-log-container">
                <section className="daily-log-summary">
                    <div className="daily-log-summary-card">
                        <span>Incoming Units</span>
                        <strong>{incomingUnits}</strong>
                    </div>

                    <div className="daily-log-summary-card">
                        <span>Outgoing Units</span>
                        <strong>{outgoingUnits}</strong>
                    </div>

                    <div className="daily-log-summary-card">
                        <span>Total Movements</span>
                        <strong>{filteredLogs.length}</strong>
                    </div>
                </section>

                <section className="daily-log-card">
                    <div className="daily-log-filters">
                        <div className="daily-log-filter">
                            <label htmlFor="log-date">Date</label>

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
                                <option value="All">All</option>
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
                                <option value="All">All</option>
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
                    </div>

                    <div className="daily-log-table-wrapper">
                        <table className="daily-log-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Unit ID</th>
                                    <th>Blood Group</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Reference</th>
                                    <th>Details</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{log.time}</td>
                                            <td>{log.unitId}</td>
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
                                            <td>{log.quantity}</td>
                                            <td>{log.reference}</td>
                                            <td>{log.details}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="daily-log-empty">
                                            No blood movements found.
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