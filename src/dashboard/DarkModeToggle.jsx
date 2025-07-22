import React from "react";

export default function DarkModeToggle({ dark, setDark }) {
  return (
    <button
      aria-label="Toggle dark mode"
      className="ml-4 px-3 py-2 rounded bg-[var(--brand-blue)] text-white font-semibold hover:bg-blue-700 transition"
      onClick={() => setDark((d) => !d)}
    >
      {dark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}