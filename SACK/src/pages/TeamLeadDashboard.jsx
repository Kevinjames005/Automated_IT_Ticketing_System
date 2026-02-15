import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Download,
  Filter,
  Calendar,
  Search,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  Bell,
  Settings,
  LayoutDashboard,
  Ticket,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const priorityData = [
  { name: "High", value: 14, color: "#ef4444" },
  { name: "Medium", value: 28, color: "#f97316" },
  { name: "Low", value: 10, color: "#22c55e" },
];

const responseData = [
  { name: "Mon", tickets: 12, resolved: 8, pending: 4 },
  { name: "Tue", tickets: 18, resolved: 12, pending: 6 },
  { name: "Wed", tickets: 10, resolved: 9, pending: 1 },
  { name: "Thu", tickets: 22, resolved: 15, pending: 7 },
  { name: "Fri", tickets: 15, resolved: 11, pending: 4 },
  { name: "Sat", tickets: 8, resolved: 6, pending: 2 },
  { name: "Sun", tickets: 5, resolved: 4, pending: 1 },
];

const categoryData = [
  { name: "Network", tickets: 24 },
  { name: "Hardware", tickets: 18 },
  { name: "Software", tickets: 32 },
  { name: "Account", tickets: 15 },
  { name: "Communication", tickets: 21 },
  { name: "Security", tickets: 12 },
];

const teamPerformance = [
  {
    id: 1,
    name: "John Doe",
    avatar: "JD",
    assigned: 18,
    resolved: 15,
    pending: 3,
    avgResponse: "1.2h",
    avgResolution: "4.5h",
    satisfaction: 4.8,
    status: "online",
  },
  {
    id: 2,
    name: "Sarah Smith",
    avatar: "SS",
    assigned: 22,
    resolved: 20,
    pending: 2,
    avgResponse: "0.8h",
    avgResolution: "3.2h",
    satisfaction: 4.9,
    status: "online",
  },
  {
    id: 3,
    name: "Mike Johnson",
    avatar: "MJ",
    assigned: 15,
    resolved: 12,
    pending: 3,
    avgResponse: "2.1h",
    avgResolution: "5.8h",
    satisfaction: 4.6,
    status: "away",
  },
  {
    id: 4,
    name: "Emily Chen",
    avatar: "EC",
    assigned: 20,
    resolved: 18,
    pending: 2,
    avgResponse: "1.5h",
    avgResolution: "4.0h",
    satisfaction: 4.7,
    status: "online",
  },
];

const recentTickets = [
  {
    id: "TCK-1045",
    title: "Email not syncing with mobile",
    priority: "high",
    category: "Communication",
    response: "45 mins",
    resolution: "3 hrs",
    assigned: "John Doe",
    status: "in-progress",
    created: "2 hours ago",
  },
  {
    id: "TCK-1044",
    title: "VPN connection timeout",
    priority: "high",
    category: "Network",
    response: "1 hr",
    resolution: "5 hrs",
    assigned: "Sarah Smith",
    status: "in-progress",
    created: "4 hours ago",
  },
  {
    id: "TCK-1043",
    title: "Password reset request",
    priority: "low",
    category: "Account",
    response: "15 mins",
    resolution: "1 hr",
    assigned: "Mike Johnson",
    status: "resolved",
    created: "5 hours ago",
  },
  {
    id: "TCK-1042",
    title: "Software installation needed",
    priority: "medium",
    category: "Software",
    response: "30 mins",
    resolution: "4 hrs",
    assigned: "Emily Chen",
    status: "in-progress",
    created: "6 hours ago",
  },
  {
    id: "TCK-1041",
    title: "Printer not responding",
    priority: "medium",
    category: "Hardware",
    response: "1.5 hrs",
    resolution: "6 hrs",
    assigned: "John Doe",
    status: "open",
    created: "8 hours ago",
  },
];

const COLORS = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

export default function ImprovedTeamLeadDashboard() {
  const [timeRange, setTimeRange] = useState("7days");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate trend percentages
  const calculateTrend = (current, previous) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
    };
  };

  const totalTicketsTrend = calculateTrend(142, 128);
  const responseTrend = calculateTrend(1.8, 2.3);
  const resolutionTrend = calculateTrend(6.2, 7.1);
  const pendingTrend = calculateTrend(23, 18);

  // Filter tickets based on search
  const filteredTickets = recentTickets.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.assigned.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700";
      case "in-progress":
        return "bg-amber-100 text-amber-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
        <aside
            className={`fixed md:relative md:translate-x-0 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg p-6 flex flex-col z-50 transform transition-transform duration-300 ${
             sidebarOpen ? "translate-x-0" : "-translate-x-full"
         }`}
        >

        {/* Logo & Close Button */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-bold text-orange-500">AI Ticketing</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "overview"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("tickets")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "tickets"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Ticket className="w-5 h-5" />
            Tickets
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "team"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users className="w-5 h-5" />
            Team Performance
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "analytics"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
              TL
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Team Lead</p>
              <p className="text-xs text-gray-500">admin@company.com</p>
            </div>
          </div>
          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Mobile Menu & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-gray-600 hover:text-gray-800"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                  Team Lead Dashboard
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  Monitor ticket flow and team productivity
                </p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Notifications
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <p className="text-sm font-medium text-gray-800">
                          High Priority Ticket
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          TCK-1045 requires immediate attention
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          2 minutes ago
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm font-medium text-gray-800">
                          Ticket Resolved
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Sarah resolved TCK-1040
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          15 minutes ago
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="px-4 py-6 md:px-8 md:py-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {/* Total Tickets */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Ticket className="w-6 h-6 text-blue-600" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    totalTicketsTrend.isPositive
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {totalTicketsTrend.isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {totalTicketsTrend.value}%
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Total Tickets</p>
              <h2 className="text-3xl font-bold text-gray-800">142</h2>
              <p className="text-xs text-gray-400 mt-2">+14 from last week</p>
            </div>

            {/* Avg Response Time */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <TrendingDown className="w-4 h-4" />
                  {responseTrend.value}%
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Avg Response Time</p>
              <h2 className="text-3xl font-bold text-orange-500">1.8h</h2>
              <p className="text-xs text-gray-400 mt-2">Better than target</p>
            </div>

            {/* Avg Resolution */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <TrendingDown className="w-4 h-4" />
                  {resolutionTrend.value}%
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Avg Resolution</p>
              <h2 className="text-3xl font-bold text-green-600">6.2h</h2>
              <p className="text-xs text-gray-400 mt-2">Improved efficiency</p>
            </div>

            {/* Pending Tickets */}
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <TrendingUp className="w-4 h-4" />
                  {pendingTrend.value}%
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Pending Tickets</p>
              <h2 className="text-3xl font-bold text-red-500">23</h2>
              <p className="text-xs text-gray-400 mt-2">Requires attention</p>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Weekly Ticket Volume - Enhanced */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Weekly Ticket Volume
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Tickets vs Resolved
                  </p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={responseData}>
                  <defs>
                    <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#ticketsGradient)"
                    name="Total Tickets"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#resolvedGradient)"
                    name="Resolved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Ticket Priority Distribution
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Current breakdown
                  </p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex-1 space-y-4">
                  {priorityData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          {item.value}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((item.value / 52) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY PERFORMANCE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Tickets by Category
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Distribution across departments
                </p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="tickets"
                  fill="#f97316"
                  radius={[0, 8, 8, 0]}
                  name="Tickets"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* TEAM PERFORMANCE TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Team Performance
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Individual agent metrics
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition">
                View All
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Agent
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Assigned
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Resolved
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Pending
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Avg Response
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Avg Resolution
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                            {member.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Support Agent
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            member.status === "online"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              member.status === "online"
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          ></span>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-gray-800">
                        {member.assigned}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-green-600 font-semibold">
                          {member.resolved}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-orange-600 font-semibold">
                          {member.pending}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700">
                        {member.avgResponse}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700">
                        {member.avgResolution}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold text-gray-800">
                            {member.satisfaction}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT TICKETS TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Recent Tickets
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Latest ticket activities
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Ticket ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Title
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">
                      Priority
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">
                      Category
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">
                      Response
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Assigned
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Created
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs font-semibold text-blue-600">
                          {ticket.id}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800 max-w-xs truncate">
                          {ticket.title}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {ticket.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-700">
                        {ticket.response}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                            {ticket.assigned
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span className="text-sm text-gray-700">
                            {ticket.assigned}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {ticket.created}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTickets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No tickets found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}