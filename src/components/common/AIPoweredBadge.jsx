import React from "react";

const SparkleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle'}}>
    {/* Main sparkle */}
    <path d="M12 6.5L13.2 10.8L17.5 12L13.2 13.2L12 17.5L10.8 13.2L6.5 12L10.8 10.8L12 6.5Z" fill="#3b82f6"/>
    {/* Small top sparkle */}
    <rect x="17.5" y="4.5" width="2" height="2" rx="1" fill="#3b82f6"/>
    {/* Small bottom sparkle */}
    <rect x="17.5" y="17.5" width="2" height="2" rx="1" fill="#3b82f6"/>
  </svg>
);

const AIPoweredBadge = () => (
  <div className="flex items-center justify-center gap-1 mt-2 w-full">
    <span className="text-base font-semibold text-brand-500 tracking-wide">AI-Powered</span>
    <SparkleIcon />
  </div>
);

export default AIPoweredBadge; 