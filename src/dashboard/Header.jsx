import React from "react";

export default function Header({ children, sidebarOpen, setSidebarOpen }) {
  return (
    <header className="relative bg-white dark:bg-[#22304a] shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-[var(--accent-light)]"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Good afternoon, Sarah!</h1>
        </div>
        {children}
      </div>
      {/* Brand accent bar */}
      <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: "var(--brand-blue)" }} />
    </header>
  );
}