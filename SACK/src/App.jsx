import { Routes, Route } from "react-router-dom";
import { UserProvider } from "./UserContext";
import Login from "./pages/Login";
import TeamLeadDashboard from "./pages/TeamLead/TeamLeadDashboard";
import TeamMemberDashboard from "./pages/TeamMember/TeamMemberDashboard";
import TicketsPage from "./pages/TeamLead/TicketsPage";
import TeamPerformancePage from "./pages/TeamLead/TeamPerformancePage";
import AnalyticsPage from "./pages/TeamLead/AnalyticsPage";
import LeadSettingsPage from "./pages/TeamLead/LeadSettingsPage";
import MemberSettingsPage from "./pages/TeamMember/MemberSettingsPage";

function App() {
  return (
    <UserProvider>
      <Routes>
      <Route path="/"                  element={<Login />} />
      <Route path="/teamlead"          element={<TeamLeadDashboard />} />
      <Route path="/teammember"        element={<TeamMemberDashboard />} />
      <Route path="/tickets"           element={<TicketsPage />} />
      <Route path="/team-performance"  element={<TeamPerformancePage />} />
      <Route path="/analytics"         element={<AnalyticsPage />} />
      <Route path="/settings"          element={<LeadSettingsPage />} />
      <Route path="/member-settings"   element={<MemberSettingsPage />} />
      </Routes>
    </UserProvider>
  );
}

export default App;