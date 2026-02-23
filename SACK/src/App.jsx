import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";
import TicketsPage from "./pages/TicketsPage";
import TeamPerformancePage from "./pages/TeamPerformancePage";

function App() {
  return (
    <Routes>
      <Route path="/"           element={<Login />} />
      <Route path="/teamlead"   element={<TeamLeadDashboard />} />
      <Route path="/teammember" element={<TeamMemberDashboard />} />
      <Route path="/tickets"    element={<TicketsPage />} />
      <Route path="/team-performance" element={<TeamPerformancePage />} />
    </Routes>
  );
}

export default App;