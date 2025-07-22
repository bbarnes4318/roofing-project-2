import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const lightVars = {
  '--color-primary': '#2563eb',
  '--color-pending': '#f59e42',
  '--color-overdue': '#dc2626',
  '--color-bg': '#fff',
  '--color-text': '#222',
};
const darkVars = {
  '--color-primary': '#6366f1',
  '--color-pending': '#fbbf24',
  '--color-overdue': '#f87171',
  '--color-bg': '#18181b',
  '--color-text': '#fff',
};

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const vars = dark ? darkVars : lightVars;
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      <button
        onClick={() => setDark((d) => !d)}
        className="fixed top-4 right-4 z-50 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white shadow focus:ring-2 focus:ring-offset-2"
        aria-label="Toggle dark mode"
      >
        {dark ? 'Light Mode' : 'Dark Mode'}
      </button>
      {children}
    </ThemeContext.Provider>
  );
}; 