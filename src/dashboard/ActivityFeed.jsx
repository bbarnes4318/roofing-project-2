import React from "react";

export default function ActivityFeed({ activity, colorMode }) {
  return (
    <section className={`rounded-xl shadow p-6 ${colorMode ? 'bg-[#232b4d]/80 text-blue-100' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Activity Feed</h2>
        <button
          className="px-4 py-2 bg-[var(--brand-blue)] text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          aria-label="New Message"
        >
          New Message
        </button>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {activity.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-4 py-3 group transition hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--brand-blue)] text-white flex items-center justify-center font-bold text-lg">
              {item.avatar}
            </div>
            <div className="flex-1">
              <a
                href="#"
                className="font-bold text-[var(--brand-blue)] group-hover:outline group-hover:outline-2 group-hover:outline-[var(--brand-blue)] px-2 py-1 rounded transition"
                tabIndex={0}
                aria-label={`View message: ${item.title}`}
              >
                {item.title}
              </a>
              <div className="text-sm text-gray-600 dark:text-gray-300">{item.detail}</div>
            </div>
            <div className="ml-auto text-xs text-gray-400">{item.time}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}