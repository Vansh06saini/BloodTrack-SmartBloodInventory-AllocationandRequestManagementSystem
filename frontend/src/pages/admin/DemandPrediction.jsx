import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend
} from "recharts";

function DemandPrediction() {
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("ALL");
    const [modelInfo, setModelInfo] = useState(null);

    const fetchForecast = async () => {
        try {
            setIsLoading(true);
            setError("");

            const res = await fetch("http://localhost:5000/api/predictions/demand-forecast");
            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.message || "Failed to load forecast data");
            }

            setData(result);
        } catch (err) {
            console.error("Forecast fetch error:", err);
            setError("Unable to connect to AI demand forecasting service.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchModelInfo = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/predictions/model-info");
            const result = await res.json();
            if (result.success && result.metadata) {
                setModelInfo(result.metadata);
            }
        } catch (err) {
            console.log("Model info not loaded:", err);
        }
    };

    useEffect(() => {
        fetchForecast();
        fetchModelInfo();
    }, []);

    // Format chart data based on selected blood group filter
    const prepareChartData = () => {
        if (!data || !data.forecastWindow || !data.rawForecast) return [];

        const dates = data.forecastWindow.forecastDates;

        return dates.map((dateStr, idx) => {
            const dayNum = idx + 1;
            const item = {
                date: dateStr.slice(5), // MM-DD
                fullDate: dateStr,
            };

            if (selectedGroup === "ALL") {
                // Total demand across all groups for this day
                let dayTotal = 0;
                Object.values(data.rawForecast.predictions).forEach((bgData) => {
                    const dayPred = bgData.daily.find((d) => d.day_number === dayNum);
                    if (dayPred) dayTotal += dayPred.predicted_units;
                });
                item["Predicted Demand"] = dayTotal;
            } else {
                const bgData = data.rawForecast.predictions[selectedGroup];
                const dayPred = bgData?.daily.find((d) => d.day_number === dayNum);
                item["Predicted Demand"] = dayPred ? dayPred.predicted_units : 0;
            }

            return item;
        });
    };

    const chartData = prepareChartData();

    // Prepare Comparison Chart Data: Current Stock vs. 7-Day Demand
    const comparisonChartData = data?.inventoryComparison?.map((item) => ({
        bloodGroup: item.bloodGroup,
        "Current Stock": item.currentStock,
        "7-Day Demand": item.predicted7DayDemand,
    })) || [];

    const bloodGroups = ["ALL", "O+", "B+", "A+", "AB+", "O-", "A-", "B-", "AB-"];

    return (
        <div className="admin-dashboard-page">
            <header className="admin-dashboard-header">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h1>AI Blood Demand Forecasting</h1>
                        <span className="ai-status-badge">
                            <span className="ai-status-dot"></span> ML Active
                        </span>
                    </div>
                    <p>7-Day Multi-Output Machine Learning Model predicting future hospital demand & deficit risks.</p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        type="button"
                        className="admin-logout-button"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        ← Back to Dashboard
                    </button>
                    <button
                        type="button"
                        className="admin-primary-button"
                        onClick={fetchForecast}
                        disabled={isLoading}
                    >
                        {isLoading ? "Analyzing..." : "Refresh Forecast"}
                    </button>
                </div>
            </header>

            <main className="admin-dashboard-container">
                {error && (
                    <div className="admin-form-message error" style={{ marginBottom: "1.5rem" }}>
                        {error}
                    </div>
                )}

                {/* AI Data Source Indicator Banner */}
                {data?.dataSource && (
                    <div
                        className={`ai-source-banner ${
                            data.dataSource.type === "database_real_orders" ? "real" : "baseline"
                        }`}
                        style={{ marginBottom: "1.5rem" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "22px" }}>
                                {data.dataSource.type === "database_real_orders" ? "🟢" : "ℹ️"}
                            </span>
                            <div>
                                <strong style={{ fontSize: "14px" }}>
                                    {data.dataSource.type === "database_real_orders"
                                        ? "Live Database Driven Prediction"
                                        : "Pre-trained Clinical Baseline Model"}
                                </strong>
                                <p style={{ margin: "3px 0 0", fontSize: "13px" }}>
                                    {data.dataSource.description}
                                </p>
                            </div>
                        </div>

                        {data.dataSource.type === "database_real_orders" && (
                            <div className="ai-source-meta-tag">
                                ⚡ {data.dataSource.orders_analyzed} requests • {data.dataSource.unique_days_analyzed} day(s) analyzed
                            </div>
                        )}
                    </div>
                )}

                {/* KPI Metric Summary Cards */}
                <section className="admin-summary-grid">
                    <div className="admin-summary-card">
                        <span>Predicted 7-Day Demand</span>
                        <strong style={{ color: "#2563eb" }}>
                            {isLoading ? "..." : `${data?.summary?.totalPredictedDemand || 0} units`}
                        </strong>
                        <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
                            Across all 8 blood groups
                        </small>
                    </div>

                    <div className="admin-summary-card">
                        <span>Current Available Stock</span>
                        <strong>
                            {isLoading ? "..." : `${data?.summary?.totalCurrentStock || 0} units`}
                        </strong>
                        <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
                            Live in inventory
                        </small>
                    </div>

                    <div className="admin-summary-card">
                        <span>Net System Balance</span>
                        <strong
                            style={{
                                color: (data?.summary?.netSystemBalance || 0) < 0 ? "#dc2626" : "#16a34a"
                            }}
                        >
                            {isLoading ? "..." : `${data?.summary?.netSystemBalance || 0} units`}
                        </strong>
                        <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
                            {(data?.summary?.netSystemBalance || 0) < 0 ? "System-wide deficit" : "System-wide surplus"}
                        </small>
                    </div>

                    <div className="admin-summary-card">
                        <span>Critical Deficit Groups</span>
                        <strong style={{ color: (data?.summary?.criticalShortageGroupsCount || 0) > 0 ? "#dc2626" : "#16a34a" }}>
                            {isLoading ? "..." : data?.summary?.criticalShortageGroupsCount || 0}
                        </strong>
                        <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
                            Need immediate donor drives
                        </small>
                    </div>
                </section>

                {/* AI Forecast Chart Section */}
                <section className="admin-stock-section" style={{ marginBottom: "28px" }}>
                    <div className="admin-section-header">
                        <div>
                            <h2>7-Day Daily Demand Projection</h2>
                            <p>
                                Forecast window:{" "}
                                <strong>{data?.forecastWindow?.forecastDates?.[0] || "..."}</strong> to{" "}
                                <strong>{data?.forecastWindow?.forecastDates?.[6] || "..."}</strong>
                            </p>
                        </div>

                        {/* Blood Group Filter Pill Buttons */}
                        <div className="ai-group-pills">
                            {bloodGroups.map((bg) => (
                                <button
                                    key={bg}
                                    type="button"
                                    className={`ai-pill-btn ${selectedGroup === bg ? "active" : ""}`}
                                    onClick={() => setSelectedGroup(bg)}
                                >
                                    {bg}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                        {isLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                                Loading AI predictions...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" stroke="#64748b" />
                                    <YAxis stroke="#64748b" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#1e293b",
                                            border: "none",
                                            borderRadius: "8px",
                                            color: "#ffffff"
                                        }}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="Predicted Demand"
                                        fill={selectedGroup === "ALL" ? "#3b82f6" : "#ef4444"}
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* Inventory vs. 7-Day Demand Comparison Chart */}
                <section className="admin-stock-section" style={{ marginBottom: "28px" }}>
                    <div className="admin-section-header">
                        <div>
                            <h2>Current Stock vs. Predicted 7-Day Demand</h2>
                            <p>Visual comparison identifying which blood groups will be exhausted without replenishment.</p>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: 300, marginTop: "16px" }}>
                        {isLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#6b7280" }}>
                                Loading comparison data...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="bloodGroup" stroke="#64748b" />
                                    <YAxis stroke="#64748b" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#1e293b",
                                            border: "none",
                                            borderRadius: "8px",
                                            color: "#ffffff"
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Current Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="7-Day Demand" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* Stock Health & Actionable Intelligence Matrix */}
                <section className="admin-stock-section">
                    <div className="admin-section-header">
                        <div>
                            <h2>Inventory Deficit Matrix & AI Recommendations</h2>
                            <p>Actionable alerts prioritized by risk level to prevent blood shortages.</p>
                        </div>
                    </div>

                    <div className="ai-matrix-table-container">
                        <table className="ai-matrix-table">
                            <thead>
                                <tr>
                                    <th>Blood Group</th>
                                    <th>Current Stock</th>
                                    <th>7-Day Demand</th>
                                    <th>Daily Avg</th>
                                    <th>Net Balance</th>
                                    <th>Risk Status</th>
                                    <th>AI Recommended Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                                            Calculating stock risk assessments...
                                        </td>
                                    </tr>
                                ) : (
                                    data?.inventoryComparison?.map((row) => (
                                        <tr key={row.bloodGroup}>
                                            <td>
                                                <strong className="ai-bg-badge">{row.bloodGroup}</strong>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{row.currentStock} units</span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{row.predicted7DayDemand} units</span>
                                            </td>
                                            <td>{row.dailyAvgDemand} / day</td>
                                            <td>
                                                <span
                                                    className={`ai-balance-pill ${
                                                        row.netBalance < 0 ? "negative" : "positive"
                                                    }`}
                                                >
                                                    {row.netBalance > 0 ? `+${row.netBalance}` : row.netBalance} units
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`ai-risk-badge ${row.statusSeverity}`}>
                                                    {row.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "13px", color: "#374151" }}>
                                                {row.recommendedAction}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Model Metadata Footer */}
                {modelInfo && (
                    <footer className="ai-model-footer">
                        <div>
                            <strong>Engine:</strong> {modelInfo.model_type} |{" "}
                            <strong>Validation MAE:</strong> {modelInfo.metrics?.overall_mae} units |{" "}
                            <strong>Trained At:</strong> {modelInfo.trained_at}
                        </div>
                    </footer>
                )}
            </main>
        </div>
    );
}

export default DemandPrediction;
