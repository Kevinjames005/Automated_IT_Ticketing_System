import { useState } from "react";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Tag,
  Edit,
  Send,
  Star,
  TrendingUp,
  Activity,
  Award,
  Target,
} from "lucide-react";

export default function ImprovedTeamMemberDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [tickets, setTickets] = useState([
    {
      id: "TCK-1001",
      title: "VPN Connection Issues",
      description:
        "User unable to connect to company VPN from home network. Error code: 0x800704cf appears repeatedly.",
      status: "in-progress",
      priority: "high",
      category: "Network",
      requester: "Alice Johnson",
      requesterEmail: "alice.johnson@company.com",
      createdAt: "2024-02-14T10:30:00",
      updatedAt: "2024-02-15T09:15:00",
      dueDate: "2024-02-16T17:00:00",
      comments: [
        {
          id: 1,
          author: "You",
          text: "I've started investigating this issue. Checking VPN logs now.",
          timestamp: "2024-02-15T09:15:00",
          isAgent: true,
        },
        {
          id: 2,
          author: "Alice Johnson",
          text: "Thank you! I need this urgently for tomorrow's client meeting.",
          timestamp: "2024-02-15T09:30:00",
          isAgent: false,
        },
      ],
      attachments: [
        { id: 1, name: "vpn_error_screenshot.png", size: "2.4 MB" },
      ],
      timeSpent: "1h 45m",
      estimatedTime: "3h",
    },
    {
      id: "TCK-1002",
      title: "Printer Not Working on 3rd Floor",
      description:
        "Office printer HP LaserJet Pro on 3rd floor is not responding to print jobs. Display shows 'Ready' but nothing prints.",
      status: "open",
      priority: "medium",
      category: "Hardware",
      requester: "Bob Smith",
      requesterEmail: "bob.smith@company.com",
      createdAt: "2024-02-15T08:00:00",
      updatedAt: "2024-02-15T08:00:00",
      dueDate: "2024-02-17T17:00:00",
      comments: [],
      attachments: [],
      timeSpent: "0h",
      estimatedTime: "2h",
    },
    {
      id: "TCK-1003",
      title: "Email Sync Problem with Mobile",
      description:
        "Outlook not syncing emails with iPhone. Last sync was 2 days ago. Using Exchange server.",
      status: "in-progress",
      priority: "high",
      category: "Software",
      requester: "Carol Davis",
      requesterEmail: "carol.davis@company.com",
      createdAt: "2024-02-14T14:20:00",
      updatedAt: "2024-02-15T11:00:00",
      dueDate: "2024-02-16T12:00:00",
      comments: [
        {
          id: 1,
          author: "You",
          text: "Please try removing and re-adding your email account.",
          timestamp: "2024-02-15T11:00:00",
          isAgent: true,
        },
      ],
      attachments: [],
      timeSpent: "2h 15m",
      estimatedTime: "4h",
    },
    {
      id: "TCK-1004",
      title: "Software Installation - Adobe Suite",
      description:
        "Need Adobe Creative Cloud installed on new workstation for design team member.",
      status: "open",
      priority: "low",
      category: "Software",
      requester: "David Wilson",
      requesterEmail: "david.wilson@company.com",
      createdAt: "2024-02-15T09:45:00",
      updatedAt: "2024-02-15T09:45:00",
      dueDate: "2024-02-18T17:00:00",
      comments: [],
      attachments: [],
      timeSpent: "0h",
      estimatedTime: "1h",
    },
    {
      id: "TCK-1005",
      title: "Access Request to Finance Folder",
      description:
        "Request read access to the Finance shared folder on network drive for Q4 reports.",
      status: "pending-approval",
      priority: "medium",
      category: "Access",
      requester: "Emma Thompson",
      requesterEmail: "emma.thompson@company.com",
      createdAt: "2024-02-15T10:30:00",
      updatedAt: "2024-02-15T10:30:00",
      dueDate: "2024-02-17T17:00:00",
      comments: [],
      attachments: [],
      timeSpent: "0h 30m",
      estimatedTime: "1h",
    },
  ]);

  const [resolvedTickets] = useState([
    {
      id: "TCK-0998",
      title: "Password Reset Completed",
      status: "resolved",
      priority: "low",
      category: "Account",
      resolvedAt: "2024-02-14T16:30:00",
      timeSpent: "15m",
      rating: 5,
    },
    {
      id: "TCK-0997",
      title: "Laptop Screen Replacement",
      status: "resolved",
      priority: "high",
      category: "Hardware",
      resolvedAt: "2024-02-13T11:00:00",
      timeSpent: "3h 20m",
      rating: 4,
    },
    {
      id: "TCK-0996",
      title: "WiFi Connection Fixed",
      status: "resolved",
      priority: "medium",
      category: "Network",
      resolvedAt: "2024-02-12T14:45:00",
      timeSpent: "1h 10m",
      rating: 5,
    },
  ]);

  // Performance Stats
  const stats = {
    assigned: tickets.length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    pending: tickets.filter((t) => t.status === "open").length,
    resolvedToday: 3,
    resolvedThisWeek: resolvedTickets.length,
    avgResponseTime: "1.2h",
    avgResolutionTime: "4.5h",
    satisfactionRating: 4.8,
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;

    const matchesPriority =
      filterPriority === "all" || ticket.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      case "pending-approval":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in-progress":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending-approval":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(
      tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  const handleAddComment = (ticketId) => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      author: "You",
      text: newComment,
      timestamp: new Date().toISOString(),
      isAgent: true,
    };

    setTickets(
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, comments: [...ticket.comments, comment] }
          : ticket
      )
    );

    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({
        ...selectedTicket,
        comments: [...selectedTicket.comments, comment],
      });
    }

    setNewComment("");
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
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-lg p-6 flex flex-col z-50 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo & Close */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-bold text-orange-500">Team Member</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Your Rating</p>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-white" />
                <span className="text-xl font-bold">
                  {stats.satisfactionRating}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-2xl font-bold">{stats.resolvedThisWeek}</p>
              <p className="text-xs opacity-90">Resolved</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <p className="text-2xl font-bold">{stats.assigned}</p>
              <p className="text-xs opacity-90">Active</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab("my-tickets")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "my-tickets"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>My Tickets</span>
            <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {stats.assigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("resolved")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "resolved"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Resolved</span>
            <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {resolvedTickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("performance")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "performance"
                ? "bg-orange-50 text-orange-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Target className="w-5 h-5" />
            <span>Performance</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">John Doe</p>
              <p className="text-xs text-gray-500">Support Agent</p>
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
        {/* TOP HEADER */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-gray-600 hover:text-gray-800"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                  {activeTab === "my-tickets" && "My Assigned Tickets"}
                  {activeTab === "resolved" && "Resolved Tickets"}
                  {activeTab === "performance" && "My Performance"}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                  {activeTab === "my-tickets" &&
                    `${stats.assigned} active tickets`}
                  {activeTab === "resolved" &&
                    `${resolvedTickets.length} completed this week`}
                  {activeTab === "performance" && "Track your metrics"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                          New High Priority Ticket
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          TCK-1001 requires urgent attention
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          10 minutes ago
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm font-medium text-gray-800">
                          Comment Added
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Alice replied to TCK-1001
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          30 minutes ago
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-8">
          {/* MY TICKETS VIEW */}
          {activeTab === "my-tickets" && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Open</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.pending}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">In Progress</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.inProgress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Resolved Today</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.resolvedToday}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Response</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.avgResponseTime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending-approval">Pending Approval</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white cursor-pointer"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Tickets List */}
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left Side */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm font-semibold text-blue-600">
                                {ticket.id}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPriorityColor(
                                  ticket.priority
                                )}`}
                              >
                                {ticket.priority}
                              </span>
                              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {ticket.category}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                              {ticket.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {ticket.description}
                            </p>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {ticket.requester}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Created {formatDate(ticket.createdAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Due {formatDate(ticket.dueDate)}
                              </div>
                              {ticket.comments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {ticket.comments.length} comments
                                </div>
                              )}
                              {ticket.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="w-4 h-4" />
                                  {ticket.attachments.length} files
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Time Spent: {ticket.timeSpent}</span>
                            <span>Est: {ticket.estimatedTime}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  (parseFloat(ticket.timeSpent) /
                                    parseFloat(ticket.estimatedTime)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border flex items-center gap-1.5 whitespace-nowrap ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {getStatusIcon(ticket.status)}
                          {ticket.status.replace("-", " ")}
                        </span>

                        {ticket.status === "open" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(ticket.id, "in-progress");
                            }}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
                          >
                            Start Work
                          </button>
                        )}

                        {ticket.status === "in-progress" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(ticket.id, "resolved");
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTickets.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No tickets found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Try adjusting your filters
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* RESOLVED TICKETS VIEW */}
          {activeTab === "resolved" && (
            <div className="space-y-4">
              {resolvedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {ticket.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {ticket.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {ticket.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Resolved {formatDate(ticket.resolvedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Time spent: {ticket.timeSpent}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          Rating: {ticket.rating}/5
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border flex items-center gap-1.5 ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PERFORMANCE VIEW */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              {/* Performance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Response</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.avgResponseTime}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    15% better than last week
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Resolution</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.avgResolutionTime}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    10% faster than average
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.satisfactionRating}/5
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Excellent performance
                  </p>
                </div>
              </div>

              {/* Weekly Summary */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  This Week's Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.assigned}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tickets Assigned
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.resolvedThisWeek}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tickets Resolved
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-3xl font-bold text-amber-600">
                      {stats.inProgress}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">In Progress</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">
                      {stats.pending}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Pending</p>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Recent Achievements
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        Fast Responder
                      </p>
                      <p className="text-sm text-gray-600">
                        Responded to 10 tickets within 1 hour
                      </p>
                    </div>
                    <span className="text-xs text-orange-600 font-medium">
                      Today
                    </span>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        5-Star Rating
                      </p>
                      <p className="text-sm text-gray-600">
                        Maintained perfect satisfaction rating
                      </p>
                    </div>
                    <span className="text-xs text-green-600 font-medium">
                      This Week
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* TICKET DETAIL MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold text-blue-600">
                  {selectedTicket.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPriorityColor(
                    selectedTicket.priority
                  )}`}
                >
                  {selectedTicket.priority}
                </span>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {selectedTicket.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {selectedTicket.title}
              </h2>

              {/* Status */}
              <div className="flex items-center gap-4 mb-6">
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border flex items-center gap-1.5 ${getStatusColor(
                    selectedTicket.status
                  )}`}
                >
                  {getStatusIcon(selectedTicket.status)}
                  {selectedTicket.status.replace("-", " ")}
                </span>

                {selectedTicket.status === "open" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedTicket.id, "in-progress")
                    }
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    Start Work
                  </button>
                )}

                {selectedTicket.status === "in-progress" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedTicket.id, "resolved")
                    }
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requester</p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedTicket.requester}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedTicket.requesterEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Due Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(selectedTicket.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Time Tracking</p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedTicket.timeSpent} / {selectedTicket.estimatedTime}
                  </p>
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Attachments
                  </h3>
                  <div className="space-y-2">
                    {selectedTicket.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <Paperclip className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachment.size}
                          </p>
                        </div>
                        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Comments ({selectedTicket.comments.length})
                </h3>
                <div className="space-y-4">
                  {selectedTicket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${
                        comment.isAgent
                          ? "bg-orange-50 border border-orange-100"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {comment.author}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Comment */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Add Comment
                </h3>
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your comment..."
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    rows="3"
                  />
                  <button
                    onClick={() => handleAddComment(selectedTicket.id)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition self-end"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}