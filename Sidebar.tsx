import {
  LayoutDashboard,
  UserCheck,
  FileText,
  BarChart3,
  CreditCard,
  Upload,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { Page } from '../types';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sublabel?: string;
  requiresTaxpayer?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'taxpayer-master', label: 'Taxpayer Master', icon: UserCheck, sublabel: 'Register / Validate GSTIN' },
  { id: 'gstr1', label: 'GSTR-1', icon: FileText, sublabel: 'Outward Supply Details', requiresTaxpayer: true },
  { id: 'gstr3b', label: 'GSTR-3B', icon: BarChart3, sublabel: 'Summary Return', requiresTaxpayer: true },
  { id: 'credit-ledger', label: 'Credit Ledger', icon: CreditCard, sublabel: 'ITC / TDS / TCS', requiresTaxpayer: true },
  { id: 'filing-payment', label: 'File & Pay', icon: Upload, sublabel: 'Submit Returns', requiresTaxpayer: true },
  { id: 'compliance', label: 'Smart Insights', icon: TrendingUp, sublabel: 'Compliance Score', requiresTaxpayer: true },
];

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
  hasTaxpayer: boolean;
}

export default function Sidebar({ current, onNavigate, hasTaxpayer }: Props) {
  return (
    <aside className="w-56 bg-[#0f4c81] min-h-full flex-shrink-0">
      <div className="py-4">
        <div className="px-4 pb-3 border-b border-blue-800">
          <p className="text-blue-300 text-xs uppercase tracking-widest font-medium">Services Menu</p>
        </div>

        <nav className="mt-2">
          {NAV_ITEMS.map((item) => {
            const disabled = item.requiresTaxpayer && !hasTaxpayer;
            const active = current === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => !disabled && onNavigate(item.id)}
                disabled={disabled}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all relative group
                  ${active
                    ? 'bg-[#0f766e] text-white border-r-4 border-white'
                    : disabled
                    ? 'text-blue-400 opacity-40 cursor-not-allowed'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white cursor-pointer'
                  }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-xs opacity-60 truncate mt-0.5">{item.sublabel}</div>
                  )}
                </div>
                {active && <ChevronRight className="w-4 h-4 opacity-60 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="mx-4 mt-6 p-3 bg-blue-900 rounded-lg border border-blue-700">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-1">Help Desk</p>
          <p className="text-blue-200 text-xs">1800-103-4786</p>
          <p className="text-blue-300 text-xs mt-1">helpdesk@gst.gov.in</p>
        </div>
      </div>
    </aside>
  );
}
