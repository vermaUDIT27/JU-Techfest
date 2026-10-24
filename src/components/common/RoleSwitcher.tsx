import React from 'react';
import { UserRole } from '../../types';
import { Shield, MapPin, Truck, ChevronDown } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  className?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onSelectRole,
  className = '',
}) => {
  const roles: { id: UserRole; label: string; hindi: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    {
      id: 'ward_supervisor',
      label: 'Ward Supervisor',
      hindi: 'वार्ड सुपरवाइजर',
      icon: MapPin,
      desc: 'Operations map, dispatch & reassignment',
    },
    {
      id: 'municipal_head',
      label: 'Municipal Head',
      hindi: 'नगर निगम आयुक्त',
      icon: Shield,
      desc: 'Citywide metrics, progress & fleet utilization',
    },
    {
      id: 'driver',
      label: 'Truck Driver (Mobile)',
      hindi: 'वाहन चालक (मोबाइल)',
      icon: Truck,
      desc: 'Route stops, navigation & one-tap collection',
    },
  ];

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-sand-200/80 rounded-xl border border-sand-300 text-xs ${className}`}>
      <span className="hidden xl:inline text-[9.5px] uppercase font-bold text-charcoal-500 px-2 tracking-wider select-none">
        Role Views:
      </span>
      {roles.map((r) => {
        const Icon = r.icon;
        const isActive = currentRole === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRole(r.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-sand-50 text-terracotta-700 font-bold shadow-civic border border-sand-300'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-sand-100/60'
            }`}
            title={r.desc}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-terracotta-600' : 'text-charcoal-500'}`} />
            <span className="hidden sm:inline">{r.label}</span>
            <span className="sm:hidden">{r.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};
