import React, { useState } from "react";
import { BellIcon } from "@heroicons/react/outline";

export default function RecentTasks({ tasks }) {
  const [checked, setChecked] = useState({});

  const handleCheck = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="bg-white dark:bg-[#22304a] rounded-xl shadow p-6">
      <h2 className="text-lg font-bold mb-4">Recent Tasks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => {
          const isDone = checked[task.id];
          return (
            <div
              key={task.id}
              className={`flex flex-col gap-2 p-4 rounded-lg border transition
                ${isDone ? 'bg-gray-100 dark:bg-gray-800 opacity-60 line-through' : 'bg-white dark:bg-[#22304a]'}
                hover:shadow-md`}
              aria-label={`Task: ${task.title}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!isDone}
                  onChange={() => handleCheck(task.id)}
                  className="form-checkbox h-5 w-5 text-[var(--brand-blue)]"
                  aria-label={`Mark ${task.title} as done`}
                />
                <span className="font-semibold text-base">{task.title}</span>
                <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold
                  ${task.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-700'}`}>
                  {task.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{task.desc}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <BellIcon className="w-4 h-4" aria-hidden="true" />
                Due {task.due}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}