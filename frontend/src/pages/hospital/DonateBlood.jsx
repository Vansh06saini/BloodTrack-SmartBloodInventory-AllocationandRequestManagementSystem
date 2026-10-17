import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const BLOOD_CENTRES = [
  {
    id: "1",
    name: "IMA Blood Bank of Uttarakhand",
    address: "47, Ballupur Road, Alakapuri",
    phone: "+911352755010",
    description: "Specifically advertises voluntary blood donation. Listed donation hours: 9 AM–6 PM.",
    website: "https://imabbua.org.in/",
    websiteDisplay: "imabbua.org.in"
  },
  {
    id: "2",
    name: "Uttarakhand Blood Centre",
    address: "First Floor, 100, Haridwar Rd, near Swami Dayanand Saraswati Setu, Pragati Vihar, Ajabpur Kalan, Dehradun, Uttarakhand 248001, India",
    phone: "+919084311316",
    description: "Advertises voluntary blood donation services.",
    website: "https://www.bloodbankdehradun.com/",
    websiteDisplay: "bloodbankdehradun.com"
  },
  {
    id: "3",
    name: "City Blood Bank",
    address: "90, Model Colony, Araghar, chowk, Dehradun, Uttarakhand 248001, India",
    phone: "+918791437707",
    description: "Contact the centre to confirm its current voluntary donor procedure.",
    website: null,
    websiteDisplay: null
  },
  {
    id: "4",
    name: "Devbhoomi Blood Bank",
    address: "94, Haridwar Rd, Saket Colony, Dharampur, Dehradun, Uttarakhand 248001, India",
    phone: "+919720172822",
    description: "Call to confirm donor eligibility screening and walk-in availability.",
    website: null,
    websiteDisplay: null
  },
  {
    id: "5",
    name: "Dehradun Charitable Blood Centre",
    address: "Laxmi Rd, Old Nehru Colony, Dalanwala, Dehradun, Uttarakhand 248001, India",
    phone: "+919027576959",
    description: "Contact the centre to verify voluntary donation arrangements.",
    website: null,
    websiteDisplay: null
  },
  {
    id: "6",
    name: "Pulse Blood Center",
    address: "2nd Floor, NV Tower, Haridwar Bypass Rd, Kalagaon, Dehradun, Chakbanjarewala, Uttarakhand 248121, India",
    phone: "+919389918694",
    description: "Call before visiting to confirm that voluntary donors are accepted.",
    website: null,
    websiteDisplay: null
  },
  {
    id: "7",
    name: "Manya Charitable Blood Centre",
    address: "above Punjab National Bank, Tyagi Market, Prem Nagar, Dehradun, Uttarakhand 248007, India",
    phone: "+919219291334",
    description: "Confirm donor acceptance and timings by phone.",
    website: null,
    websiteDisplay: null
  },
  {
    id: "8",
    name: "Aashirwad Blood Centre",
    address: "Turner Rd, Morowala, Subhash Nagar, Dehradun, Uttarakhand 248002, India",
    phone: null,
    description: "A further blood centre to contact about voluntary donation.",
    website: null,
    websiteDisplay: null
  }
];

export const TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM"
];

function DonateBlood() {
  const navigate = useNavigate();

  const [storedUser] = useState(() => {
    try {
      const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const [selectedHospitalId, setSelectedHospitalId] = useState(BLOOD_CENTRES[0].id);
  const [formData, setFormData] = useState({
    donorName: storedUser?.name || "",
    donorEmail: storedUser?.email || "",
    donorPhone: storedUser?.contact || "",
    bloodGroup: "O+",
    donationDate: new Date().toISOString().split("T")[0],
    donationTimeSlot: TIME_SLOTS[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const selectedHospital = BLOOD_CENTRES.find((c) => c.id === selectedHospitalId) || BLOOD_CENTRES[0];

  const fetchAppointments = async () => {
    try {
      setIsLoadingAppointments(true);
      const res = await fetch(`http://localhost:5000/api/donations?userId=${storedUser?.id || ""}`);
      const data = await res.json();
      if (res.ok && data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [storedUser?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: "", text: "" });

    if (!formData.donorName.trim()) {
      setStatusMessage({ type: "error", text: "Please enter donor name." });
      return;
    }

    if (!formData.donorPhone.trim()) {
      setStatusMessage({ type: "error", text: "Please enter contact phone number." });
      return;
    }

    if (!formData.donationDate) {
      setStatusMessage({ type: "error", text: "Please select a donation date." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: storedUser?.id || null,
          donorName: formData.donorName,
          donorEmail: formData.donorEmail,
          donorPhone: formData.donorPhone,
          bloodGroup: formData.bloodGroup,
          hospitalName: selectedHospital.name,
          hospitalAddress: selectedHospital.address,
          hospitalPhone: selectedHospital.phone,
          hospitalWebsite: selectedHospital.website,
          donationDate: formData.donationDate,
          donationTimeSlot: formData.donationTimeSlot
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to schedule appointment");
      }

      setStatusMessage({
        type: "success",
        text: `Blood donation appointment booked at ${selectedHospital.name} for ${formData.donationDate} (${formData.donationTimeSlot})!`
      });

      fetchAppointments();
    } catch (err) {
      console.error("Booking error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to schedule appointment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login");
  };

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
            className="sidebar-link"
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
            className="sidebar-link active"
            onClick={() => navigate("/hospital/donate")}
          >
            Donate Blood
          </button>
        </nav>

        <button type="button" className="sidebar-logout" onClick={logout}>
          Sign out
        </button>
      </aside>

      <main className="hospital-main">
        <header className="hospital-header">
          <div>
            <p className="header-label">DONOR PORTAL</p>
            <h1>Schedule Blood Donation</h1>
          </div>
        </header>

        <div className="dashboard-content" style={{ padding: "24px 0" }}>
          {statusMessage.text && (
            <div
              style={{
                padding: "14px 18px",
                marginBottom: "20px",
                borderRadius: "8px",
                backgroundColor: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`
              }}
            >
              {statusMessage.text}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            {/* Left: Hospital Selection & Details */}
            <div className="recent-requests-card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#111827" }}>
                1. Select Blood Bank / Hospital
              </h2>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                Choose an accredited blood centre in Dehradun / Uttarakhand to schedule your voluntary blood donation.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "460px", overflowY: "auto", paddingRight: "6px" }}>
                {BLOOD_CENTRES.map((centre) => {
                  const isSelected = centre.id === selectedHospitalId;
                  return (
                    <div
                      key={centre.id}
                      onClick={() => setSelectedHospitalId(centre.id)}
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #b91c1c" : "1px solid #e5e7eb",
                        backgroundColor: isSelected ? "#fff5f5" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: isSelected ? "#991b1b" : "#1f2937", margin: 0 }}>
                          {centre.id}. {centre.name}
                        </h3>
                        {isSelected && (
                          <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", backgroundColor: "#b91c1c", color: "#fff", borderRadius: "12px" }}>
                            Selected
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: "13px", color: "#4b5563", margin: "4px 0" }}>
                        Address: {centre.address}
                      </p>

                      {centre.phone && (
                        <p style={{ fontSize: "13px", color: "#4b5563", margin: "4px 0" }}>
                          Phone: <a href={`tel:${centre.phone}`} style={{ color: "#b91c1c", fontWeight: "600", textDecoration: "none" }}>{centre.phone}</a>
                        </p>
                      )}

                      <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0", fontStyle: "italic" }}>
                        {centre.description}
                      </p>

                      {centre.website && (
                        <p style={{ fontSize: "12px", margin: "4px 0 0 0" }}>
                          Website: <a href={centre.website} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                            {centre.websiteDisplay || "Official Website"}
                          </a>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Booking Form */}
            <div className="recent-requests-card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#111827" }}>
                2. Select Date & Slot (9:00 AM – 4:00 PM)
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                    Selected Centre
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedHospital.name}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#f3f4f6",
                      color: "#111827",
                      fontWeight: "600"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                      Donor Full Name *
                    </label>
                    <input
                      type="text"
                      name="donorName"
                      required
                      value={formData.donorName}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                      Donor Phone *
                    </label>
                    <input
                      type="tel"
                      name="donorPhone"
                      required
                      value={formData.donorPhone}
                      onChange={handleChange}
                      placeholder="e.g. +91 9876543210"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                      Blood Group *
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "#fff"
                      }}
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                      Donation Date *
                    </label>
                    <input
                      type="date"
                      name="donationDate"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={formData.donationDate}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db"
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                    Select Time Slot (9:00 AM to 4:00 PM) *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {TIME_SLOTS.map((slot) => {
                      const isSlotSelected = formData.donationTimeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, donationTimeSlot: slot }))}
                          style={{
                            padding: "9px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: isSlotSelected ? "700" : "500",
                            border: isSlotSelected ? "2px solid #b91c1c" : "1px solid #e5e7eb",
                            backgroundColor: isSlotSelected ? "#fee2e2" : "#f9fafb",
                            color: isSlotSelected ? "#991b1b" : "#374151",
                            cursor: "pointer"
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-dashboard-button"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: isSubmitting ? "not-allowed" : "pointer"
                  }}
                >
                  {isSubmitting ? "Booking Appointment..." : "Confirm & Schedule Donation"}
                </button>
              </form>
            </div>
          </div>

          {/* Past Booked Donations Section */}
          <div className="recent-requests-card" style={{ marginTop: "24px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#111827" }}>
              My Scheduled Donation Appointments
            </h2>

            {isLoadingAppointments ? (
              <p style={{ color: "#6b7280" }}>Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No blood donation appointments booked yet.</p>
            ) : (
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Donor Name</th>
                    <th>Blood Group</th>
                    <th>Blood Centre</th>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((app) => (
                    <tr key={app.donation_id}>
                      <td><strong>{app.donor_name}</strong></td>
                      <td><span className="priority-badge urgent">{app.blood_group}</span></td>
                      <td>{app.hospital_name}</td>
                      <td>{app.donation_date?.split("T")[0] || app.donation_date}</td>
                      <td>⏰ {app.donation_time_slot}</td>
                      <td>
                        <span className="status-badge allocated">
                          {app.status || "SCHEDULED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DonateBlood;
