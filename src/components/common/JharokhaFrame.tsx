import React from 'react';

export const JaaliDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 my-3 select-none ${className}`}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sand-300 to-sand-200" />
      {/* Central Rajput Diamond / Jharokha finial node */}
      <div className="flex items-center gap-1 text-terracotta-500">
        <span className="w-1.5 h-1.5 rotate-45 border border-terracotta-600 bg-sand-100" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-sand-300 to-sand-200" />
    </div>
  );
};

export const JharokhaCardHeader: React.FC<{
  title: string;
  hindiTitle?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, hindiTitle, subtitle, badge, action }) => {
  return (
    <div className="border-b border-sand-200 pb-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-charcoal-800 text-base tracking-tight font-sans">
              {title}
            </h3>
            {hindiTitle && (
              <span className="text-xs text-charcoal-500 font-normal">
                ({hindiTitle})
              </span>
            )}
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
};
