import { Shield, Bell, LogOut, ChevronDown, User } from 'lucide-react';

interface Props {
  user: string;
  taxpayer: import('../types').Taxpayer | null;
  onLogout: () => void;
}

export default function Header({ user, taxpayer, onLogout }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      {/* Top strip */}
      <div className="bg-[#0f4c81] text-white text-xs py-1 px-4 flex justify-between items-center">
        <span>Government of India — Ministry of Finance</span>
        <span>Skip to Main Content | Screen Reader Access</span>
      </div>

      {/* Main header */}
      <div className="max-w-full px-4 py-2 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0f4c81] rounded-full flex-shrink-0 flex items-center justify-center">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#0f4c81] font-bold text-base leading-tight">
            Goods and Services Tax Network (GSTN)
          </div>
          <div className="text-[#0f766e] text-xs font-medium">
            Smart GST Compliance Simulator
          </div>
        </div>

        {taxpayer && (
          <div className="hidden lg:flex items-center gap-2 bg-[#f0faf9] border border-[#0f766e]/20 rounded px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <div className="text-xs">
              <span className="text-gray-500">GSTIN: </span>
              <span className="font-semibold text-[#0f4c81]">{taxpayer.gstin}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-gray-600">{taxpayer.legalName}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <button className="relative p-2 text-gray-500 hover:text-[#0f4c81] hover:bg-gray-100 rounded">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
            <div className="w-8 h-8 bg-[#0f766e] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="hidden md:block text-xs font-medium max-w-[120px] truncate">{user}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Bottom border accent */}
      <div className="h-1 bg-gradient-to-r from-[#0f4c81] via-[#0f766e] to-[#0f4c81]"></div>
    </header>
  );
}
