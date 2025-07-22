import React from 'react';
const HeaderCard = ({ title, value, subtext, icon }) => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft border border-white/20 hover:shadow-medium transition-all duration-300 group min-h-[8.5rem] min-w-[15rem]">
        <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 text-sm font-semibold uppercase tracking-wide">{title}</span>
            <div className="p-2 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl group-hover:shadow-glow transition-all duration-300">
                {icon}
            </div>
        </div>
        <p className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">{value}</p>
        <p className="text-sm text-gray-500 font-medium">{subtext}</p>
    </div>
);
export default HeaderCard; 