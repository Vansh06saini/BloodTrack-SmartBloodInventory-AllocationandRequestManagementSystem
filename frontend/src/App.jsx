import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import HospitalDashboard from "./pages/hospital/HospitalDashboard.jsx";
import CreateRequest from "./pages/hospital/CreateRequest.jsx";
import MyRequests from "./pages/hospital/MyRequests.jsx";
import RequestDetails from "./pages/hospital/RequestDetails.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AddBloodUnits from "./pages/admin/AddBloodUnits.jsx";
import DailyBloodLog from "./pages/admin/DailyBloodLog.jsx";


function App() {
  return (
    <Routes>
      {/* Default redirect to Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Hospital Portal */}
      <Route path="/hospital" element={<Navigate to="/hospital/dashboard" />} />
      <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
      <Route path="/login/hospital/dashboard" element={<Navigate to="/hospital/dashboard" replace />} />

      {/* Create Blood Request */}
      <Route path="/hospital/request" element={<CreateRequest />} />
      <Route path="/hospital/create-request" element={<Navigate to="/hospital/request" replace />} />

      {/* My Requests (supports both /requests and /myrequests) */}
      <Route path="/hospital/requests" element={<MyRequests />} />
      <Route path="/hospital/myrequests" element={<MyRequests />} />

      {/* Request Details (supports both singular and plural paths) */}
      <Route path="/hospital/requests/:requestId" element={<RequestDetails />} />
      <Route path="/hospital/request/:requestId" element={<RequestDetails />} />

      {/* Blood Bank Admin Portal */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/login/admin/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

      {/* add blood unit */}
      <Route path="/admin/addblood" element={<AddBloodUnits />} />
      <Route path="/admin/addbloodunits" element={<Navigate to="/admin/addblood" replace />} />

      {/* daily blood log */}
      <Route path="/admin/daily-log" element={<DailyBloodLog />} />
      <Route path="/admin/dailylog" element={<Navigate to="/admin/daily-log" replace />} />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;