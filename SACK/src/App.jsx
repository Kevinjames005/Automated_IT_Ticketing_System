import { Routes, Route } from "react-router-dom";
import TeamLeadDashboard   from "./pages/TeamLead/TeamLeadDashboard"
import TeamPerformancePage from "./pages/TeamLead/TeamPerformancePage"
import TicketsPage         from "./pages/TeamLead/TicketsPage"
import AnalyticsPage       from "./pages/TeamLead/AnalyticsPage"
import SettingsPage        from "./pages/TeamLead/SettingsPage"
import TeamMemberDashboard from "./pages/TeamMember/TeamMemberDashboard"
import Login               from "./pages/Login"


function App() {
  return (
    <Routes>
      <Route path="/"           element={<Login />} />
      <Route path="/teamlead"   element={<TeamLeadDashboard />} />
      <Route path="/teammember" element={<TeamMemberDashboard />} />
      <Route path="/tickets"    element={<TicketsPage />} />
      <Route path="/team-performance" element={<TeamPerformancePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;