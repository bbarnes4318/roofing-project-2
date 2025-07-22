import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`shadow-sm rounded-2xl bg-white dark:bg-gray-800 p-6 mb-6 ${className}`}>
    {children}
  </div>
); 