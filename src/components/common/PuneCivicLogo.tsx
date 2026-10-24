import React from 'react';

interface PuneCivicLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  collapsed?: boolean;
}

export const PuneCivicLogo: React.FC<PuneCivicLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  collapsed = false,
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Pune Basalt Stone & Sahyadri Geometric Civic Emblem */}
      <div className={`relative flex-shrink-0 ${iconDimensions} rounded-lg bg-basalt-800 p-1.5 border border-basalt-600 shadow-sm flex items-center justify-center`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle basalt foundation lines */}
          <line x1="8" y1="40" x2="40" y2="40" stroke="#758097" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="36" x2="36" y2="36" stroke="#535D72" strokeWidth="1.5" strokeLinecap="round" />

          {/* Bastion Gateway Geometry (Inspired by Pune Basalt Fort Architecture) */}
          <path
            d="M10 36 L10 20 L16 16 L24 20 L32 16 L38 20 L38 36 Z"
            fill="#2C3240"
            stroke="#A4ADC0"
            strokeWidth="1.2"
          />

          {/* Central Arch Portal */}
          <path
            d="M20 36 L20 25 C20 22 28 22 28 25 L28 36 Z"
            fill="#151820"
            stroke="#D3832B"
            strokeWidth="1.2"
          />

          {/* Sahyadri Ridge Line (Muted Mountain Green Contour) */}
          <path
            d="M6 24 L14 14 L24 18 L34 10 L42 22"
            stroke="#4A8A5C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Shivrai / Saffron Pinnacle Node */}
          <circle cx="24" cy="11" r="2.5" fill="#D3832B" stroke="#FDF8F0" strokeWidth="1" />
          <circle cx="14" cy="14" r="1.8" fill="#4A8A5C" />
          <circle cx="34" cy="10" r="1.8" fill="#4A8A5C" />

          {/* Telemetry data connection lines */}
          <line x1="14" y1="14" x2="24" y2="11" stroke="#A4ADC0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <line x1="24" y1="11" x2="34" y2="10" stroke="#A4ADC0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <line x1="24" y1="11" x2="24" y2="22" stroke="#D3832B" strokeWidth="1" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-wide text-basalt-900 text-lg leading-tight font-sans">
              SANCHAYA
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
              Pune
            </span>
          </div>
          {showSubtitle && (
            <p className="text-[11px] text-basalt-500 font-medium truncate tracking-tight">
              Civic Waste Operations Directorate
            </p>
          )}
        </div>
      )}
    </div>
  );
};
