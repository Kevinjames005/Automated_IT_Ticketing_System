import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/teamlead" element={<TeamLeadDashboard />} />
      <Route path="/teammember" element={<TeamMemberDashboard />} />
    </Routes>
  );
}

export default App;
