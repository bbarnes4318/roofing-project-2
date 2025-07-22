import React from "react";

export default function SummaryStrip({ summary, colorMode }) {
  return (
    <div className={`flex-1 ${colorMode ? 'bg-[#232b4d]/80 text-blue-100' : 'bg-white'} rounded-xl shadow p-4 flex flex-col items-center justify-center`}>
      {summary.map((item) => (
        <div
          key={item.label}
          className="flex-1 bg-white dark:bg-[#22304a] rounded-xl shadow p-4 flex flex-col items-center justify-center"
        >
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{item.label}</span>
          <span className="text-2xl font-bold text-[var(--brand-blue)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}