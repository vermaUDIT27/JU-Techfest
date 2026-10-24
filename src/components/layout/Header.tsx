import React from 'react';
import { UserRole } from '../../types';
import { 
  Menu, 
  Shield, 
  User, 
  LogOut, 
  LogIn 
} from 'lucide-react';
import { ApiUser } from '../../services/api';

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: ApiUser | null;
  isDemoMode?: boolean;
  onSelectRole: (role: UserRole) => void;
  onOpenMobileSidebar: () => void;
  onResetDemo: () => void;
  onLogout?: () => void;
  onNavigateLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  isDemoMode = false,
  onSelectRole,
  onOpenMobileSidebar,
  onResetDemo,
  onLogout,
  onNavigateLogin,
}) => {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-monsoon-200 bg-monsoon-50/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8 py-2.5">
      {/* Left: Mobile trigger & Active Identity */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-basalt-600 hover:bg-monsoon-200 hover:text-basalt-900 focus:outline-none lg:hidden cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-basalt-900 tracking-wide font-sans">
              SANCHAYA <span className="text-saffron-600">Pune</span>
            </h1>
            {currentUser ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sahyadri-100 text-sahyadri-800 border border-sahyadri-300">
                {currentUser.role === 'municipal_head' ? 'MUNICIPAL HEAD' : currentUser.role === 'ward_supervisor' ? 'WARD SUPERVISOR' : 'FLEET DRIVER'}
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-monsoon-200 text-basalt-700 border border-monsoon-300">
                OPERATIONS SUITE
              </span>
            )}
          </div>
          <span className="text-[11px] text-basalt-500 hidden sm:block">
            {currentUser 
              ? `${currentUser.name} (${currentUser.assignedWardId ? currentUser.assignedWardId : 'PMC Operations Directorate'})`
              : 'Pune Municipal Solid Waste Operations Directorate • 15 Zones • 42 Wards'}
          </span>
        </div>
      </div>

      {/* Center / Right: Session Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {currentUser ? (
          // Authenticated User Identity & Logout Button
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-monsoon-100 border border-monsoon-300 text-xs">
              <User className="w-3.5 h-3.5 text-saffron-600" />
              <div className="text-left">
                <span className="font-bold text-basalt-900 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-basalt-500 block leading-tight">
                  {currentUser.role === 'municipal_head' ? 'Municipal Commissioner' : currentUser.role === 'ward_supervisor' ? 'Ward Supervisor' : 'Assigned Driver'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-civic cursor-pointer"
              title="Sign Out of session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onNavigateLogin && (
              <button
                type="button"
                onClick={onNavigateLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-basalt-900 hover:bg-black border border-basalt-950 transition-colors shadow-civic cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-saffron-400" />
                <span>Officer Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
