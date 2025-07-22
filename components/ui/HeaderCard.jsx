import React from 'react';

const HeaderCard = ({ title, value, subtext, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <span className="text-gray-500 text-sm font-medium">{title}</span>
      {icon}
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{subtext}</p>
  </div>
);

export default HeaderCard;
