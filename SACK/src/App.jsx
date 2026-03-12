import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";
import TicketsPage from "./pages/TicketsPage";
import TeamPerformancePage from "./pages/TeamPerformancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LeadSettingsPage from "./pages/leadsettingspage";
import MemberSettingsPage from "./pages/membersettingspage";



function App() {
  return (
    <Routes>
      <Route path="/"           element={<Login />} />
      <Route path="/teamlead"   element={<TeamLeadDashboard />} />
      <Route path="/teammember" element={<TeamMemberDashboard />} />
      <Route path="/tickets"    element={<TicketsPage />} />
      <Route path="/team-performance" element={<TeamPerformancePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/settings" element={<LeadSettingsPage />} />
      <Route path="/member-settings" element={<MemberSettingsPage />} />
    </Routes>
  );
}

export default App;