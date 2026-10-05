import { useNavigate } from "react-router-dom";

function AdminDashboard() {
    const navigate = useNavigate();

    const stock = [
        { bloodGroup: "A+", units: 24 },
        { bloodGroup: "A-", units: 8 },
        { bloodGroup: "B+", units: 19 },
        { bloodGroup: "B-", units: 6 },
        { bloodGroup: "AB+", units: 12 },
        { bloodGroup: "AB-", units: 4 },
        { bloodGroup: "O+", units: 31 },
        { bloodGroup: "O-", units: 9 },
    ];

    const totalUnits = stock.reduce((total, item) => total + item.units, 0);

    const incomingToday = 18;
    const outgoingToday = 11;
    const lowStockGroups = stock.filter((item) => item.units < 10).length;

    return (
        <div className="admin-dashboard-page">
            <header className="admin-dashboard-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Manage and monitor blood bank inventory.</p>
                </div>

                <button
                    type="button"
                    className="admin-logout-button"
                    onClick={() => navigate("/login")}
                >
                    Logout
                </button>
            </header>

            <main className="admin-dashboard-container">
                <section className="admin-summary-grid">
                    <div className="admin-summary-card">
                        <span>Total Available Units</span>
                        <strong>{totalUnits}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Today's Incoming</span>
                        <strong>{incomingToday}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Today's Outgoing</span>
                        <strong>{outgoingToday}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Low Stock Groups</span>
                        <strong>{lowStockGroups}</strong>
                    </div>
                </section>

                <section className="admin-stock-section">
                    <div className="admin-section-header">
                        <div>
                            <h2>Current Blood Stock</h2>
                            <p>Available blood units by blood group.</p>
                        </div>

                        <button
                            type="button"
                            className="admin-primary-button"
                            onClick={() => navigate("/admin/add-blood")}
                        >
                            Add Blood Units
                        </button>
                    </div>

                    <div className="admin-stock-grid">
                        {stock.map((item) => (
                            <div className="admin-stock-card" key={item.bloodGroup}>
                                <div className="admin-blood-group">
                                    {item.bloodGroup}
                                </div>

                                <div className="admin-stock-count">
                                    {item.units}
                                </div>

                                <span
                                    className={
                                        item.units < 10
                                            ? "admin-stock-status low"
                                            : "admin-stock-status available"
                                    }
                                >
                                    {item.units < 10 ? "Low Stock" : "Available"}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-actions-section">
                    <h2>Inventory Management</h2>

                    <div className="admin-action-grid">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/add-blood")}
                        >
                            Add Blood Units
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/admin/daily-log")}
                        >
                            View Daily Blood Log
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default AdminDashboard;