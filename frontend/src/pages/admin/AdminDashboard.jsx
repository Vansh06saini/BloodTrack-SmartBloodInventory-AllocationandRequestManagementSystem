import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
    const navigate = useNavigate();

    const [stock, setStock] = useState([
        { bloodGroup: "A+", units: 0 },
        { bloodGroup: "A-", units: 0 },
        { bloodGroup: "B+", units: 0 },
        { bloodGroup: "B-", units: 0 },
        { bloodGroup: "AB+", units: 0 },
        { bloodGroup: "AB-", units: 0 },
        { bloodGroup: "O+", units: 0 },
        { bloodGroup: "O-", units: 0 },
    ]);

    const [summary, setSummary] = useState({
        totalUnits: 0,
        incomingToday: 0,
        outgoingToday: 0,
        lowStockGroups: 0,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            setError("");
            const response = await fetch("http://localhost:5000/api/blood-units/dashboard-summary");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load dashboard data");
            }

            if (data.stock) setStock(data.stock);
            if (data.summary) setSummary(data.summary);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError("Unable to connect to server for live inventory data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

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
                    onClick={() => {
                        sessionStorage.removeItem("token");
                        sessionStorage.removeItem("user");
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/login");
                    }}
                >
                    Logout
                </button>
            </header>

            <main className="admin-dashboard-container">
                {error && (
                    <div className="admin-form-message error" style={{ marginBottom: "1.5rem" }}>
                        {error}
                    </div>
                )}

                <section className="admin-summary-grid">
                    <div className="admin-summary-card">
                        <span>Total Available Units</span>
                        <strong>{isLoading ? "..." : summary.totalUnits}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Today's Incoming</span>
                        <strong>{isLoading ? "..." : summary.incomingToday}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Today's Outgoing</span>
                        <strong>{isLoading ? "..." : summary.outgoingToday}</strong>
                    </div>

                    <div className="admin-summary-card">
                        <span>Low Stock Groups</span>
                        <strong>{isLoading ? "..." : summary.lowStockGroups}</strong>
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
                            onClick={() => navigate("/admin/addblood")}
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
                            onClick={() => navigate("/admin/addblood")}
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