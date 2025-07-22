import React, { useEffect, useState } from 'react';

export const Badge = ({ status }) => {
  const [prev, setPrev] = useState(status);
  useEffect(() => { setPrev(status); }, [status]);
  let color = 'bg-[var(--color-primary)]';
  if (status === 'Pending') color = 'bg-[var(--color-pending)]';
  if (status === 'Overdue') color = 'bg-[var(--color-overdue)]';
  return (
    <span
      className={`inline-block px-3 py-1 text-[14px] rounded-full text-white transition-colors duration-300 ${color} ${prev !== status ? 'animate-pulse' : ''}`}
      aria-live="polite"
    >
      {status}
    </span>
  );
}; 