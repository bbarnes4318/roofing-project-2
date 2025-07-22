import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SummaryStrip from "./SummaryStrip";
import ActivityFeed from "./ActivityFeed";
import RecentTasks from "./RecentTasks";
import ProjectTimeline from "./ProjectTimeline";
import DarkModeToggle from "./DarkModeToggle";
import "./theme.css"; // Import CSS variables

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Example data
  const summary = [
    { label: "Total Projects", value: 12 },
    { label: "Tasks Due Today", value: 4 },
    { label: "Unread Messages", value: 7 },
  ];

  const activity = [
    {
      id: 1,
      avatar: "S",
      title: "New project created",
      detail: "Sarah created 'Website Redesign'.",
      time: "2h ago",
    },
    {
      id: 2,
      avatar: "J",
      title: "Task assigned",
      detail: "John assigned you 'Update Docs'.",
      time: "3h ago",
    },
  ];

  const tasks = [
    {
      id: 1,
      title: "Update Docs",
      desc: "Revise onboarding documentation.",
      due: "2024-07-01",
      status: "Pending",
    },
    {
      id: 2,
      title: "Fix Login Bug",
      desc: "Resolve OAuth redirect issue.",
      due: "2024-06-30",
      status: "Overdue",
    },
    {
      id: 3,
      title: "Design Review",
      desc: "Review new dashboard mockups.",
      due: "2024-07-02",
      status: "Unknown",
    },
    {
      id: 4,
      title: "Deploy Update",
      desc: "Push v2.1 to production.",
      due: "2024-07-03",
      status: "Pending",
    },
  ];

  const timeline = [
    { date: "Jun 28", label: "Kickoff", detail: "Project started" },
    { date: "Jun 30", label: "Design", detail: "Design" },
    { date: "Jul 2", label: "Dev", detail: "Development" },
    { date: "Jul 5", label: "QA", detail: "Testing" },
    { date: "Jul 8", label: "Launch", detail: "Go live!" },
  ];

  // Dark mode toggle
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className={`flex min-h-screen bg-[var(--accent-light)] text-[var(--text-dark)] transition-colors duration-300`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <DarkModeToggle dark={darkMode} setDark={setDarkMode} />
        </Header>
        <div className="px-6 py-4 space-y-6">
          <SummaryStrip summary={summary} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <ActivityFeed activity={activity} />
              <RecentTasks tasks={tasks} />
            </div>
            <div className="xl:col-span-1">
              <ProjectTimeline timeline={timeline} currentStep={2} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}