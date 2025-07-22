import React from "react";
import {
  ChartPieIcon, BellIcon, SparklesIcon, CogIcon, RssIcon, ClipboardIcon, MenuIcon, XIcon, DocumentTextIcon, FolderIcon, ArchiveIcon
} from "@heroicons/react/outline"; // Use Heroicons or your own icons

const nav = [
  { label: "Dashboard", icon: <ChartPieIcon className="w-5 h-5" />, aria: "Go to Dashboard", enabled: true },
  { label: "My Current Projects", icon: <ClipboardIcon className="w-5 h-5" />, aria: "Go to My Current Projects", enabled: true },
  { label: "Archived Projects", icon: <ArchiveIcon className="w-5 h-5" />, aria: "Go to Archived Projects", enabled: true },
  { label: "Project Documents", icon: <FolderIcon className="w-5 h-5" />, aria: "Project Documents (Coming Soon)", enabled: false },
  { label: "My Project Alerts", icon: <BellIcon className="w-5 h-5" />, aria: "Go to My Project Alerts", enabled: true },
  { label: "My Messages", icon: <RssIcon className="w-5 h-5" />, aria: "Go to My Messages", enabled: true },
  { label: "AI Estimate", icon: <DocumentTextIcon className="w-5 h-5" />, aria: "Go to AI Estimate", enabled: true },
  { label: "AI Training Tools", icon: <SparklesIcon className="w-5 h-5" />, aria: "Go to AI Training Tools", enabled: true },
];

export default function Sidebar({ open, setOpen }) {
  return (
    <aside className={`flex flex-col h-screen transition-all duration-300 bg-gradient-to-b from-[#183a3a] via-[#145c58] to-[#0e2e2e] border-r border-gray-800 shadow-xl ${open ? 'w-72' : 'w-16'}`}>
      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-gray-700/50">
        <span className="font-bold text-lg tracking-wide text-white">KenStruction</span>
        <button aria-label="Toggle sidebar" className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <XIcon className="w-5 h-5 text-white hover:text-gray-300 transition-colors" /> : <MenuIcon className="w-5 h-5 text-white hover:text-gray-300 transition-colors" />}
        </button>
      </div>
      
      {/* AI-Powered Badge */}
      <div className={`flex items-center gap-2 px-4 py-3 flex-shrink-0 border-b border-gray-700/30 ${open ? 'justify-start' : 'justify-center'}`}>
        <span className="text-xs font-semibold text-gray-200 tracking-wide">AI-Powered</span>
        <div className="relative">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
            </div>
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-shrink-0">
          <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ${open ? 'px-2' : 'text-center'}`}>
            {open ? "Main Menu" : "Menu"}
          </div>
          {nav.map((item, index) => (
            <button
              key={item.label}
              aria-label={item.aria}
              disabled={!item.enabled}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap relative group ${
                item.enabled 
                  ? 'text-gray-100 hover:bg-[#1e4747] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1de9b6] cursor-pointer' 
                  : 'text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              <div className={`${item.enabled ? 'text-gray-300 group-hover:text-white' : 'text-gray-600'}`}>
                {item.icon}
              </div>
              {open && (
                <span className="truncate relative flex items-center gap-2">
                  {item.label}
                  {index === 0 && (
                    <span className="text-[9px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full border border-blue-400">
                      real-time
                    </span>
                  )}
                  {!item.enabled && (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded-full border border-gray-600">
                      soon
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        {/* AI Tools Section */}
        <div className="px-3 py-3 flex-shrink-0 border-t border-gray-700/30 mt-2">
          <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ${open ? 'px-2' : 'text-center'}`}>
            {open ? "AI Tools" : "AI"}
          </div>
          
          {/* Company Tools Subheader */}
          <div className={`text-[10px] font-semibold text-gray-500 mb-2 ${open ? 'px-2' : 'text-center'}`}>
            {open ? "Company Tools" : "CT"}
          </div>
          <div className="space-y-1 mb-4">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-gray-300 hover:bg-[#1e4747] hover:text-white w-full focus:outline-none focus:ring-1 focus:ring-[#1de9b6] transition-all duration-200">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
              {open && <span className="truncate">Training</span>}
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-gray-300 hover:bg-[#1e4747] hover:text-white w-full focus:outline-none focus:ring-1 focus:ring-[#1de9b6] transition-all duration-200">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
              {open && <span className="truncate">Knowledge Base</span>}
            </button>
          </div>
          
          {/* Company Profile Subheader */}
          <div className={`text-[10px] font-semibold text-gray-500 mb-2 ${open ? 'px-2' : 'text-center'}`}>
            {open ? "Company Profile" : "CP"}
          </div>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-gray-300 hover:bg-[#1e4747] hover:text-white w-full focus:outline-none focus:ring-1 focus:ring-[#1de9b6] transition-all duration-200">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            {open && <span className="truncate">Company Profile</span>}
          </button>
        </div>
        
        {/* AI Assistant Button */}
        <div className="px-4 py-3 mt-3 flex-shrink-0">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#11998e] to-[#38ef7d] shadow-lg text-white font-bold text-sm tracking-wide transition-all duration-200 hover:from-[#38ef7d] hover:to-[#11998e] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#38ef7d] transform hover:scale-105"
            style={{ boxShadow: '0 4px 20px 0 #11998e55' }}
          >
            <SparklesIcon className="w-5 h-5" />
            {open && <span>AI Assistant</span>}
          </button>
        </div>
        
        {/* Flexible spacer */}
        <div className="flex-1 min-h-[2rem]" />
      </div>
      
      {/* Footer - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-700/50">
        <div className="px-4 py-3">
          <button
            aria-label="Go to Settings"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#1e4747] hover:text-white w-full focus:outline-none focus:ring-2 focus:ring-[#1de9b6] transition-all duration-200"
          >
            <CogIcon className="w-5 h-5" />
            {open && <span className="truncate">Settings</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}