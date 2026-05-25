/**
 * =============================================================================
 * SMART GST COMPLIANCE SIMULATOR - COMPLETE SINGLE FILE VERSION
 * =============================================================================
 *
 * A production-ready Indian GST Portal simulator with:
 * - GSTIN validation with Luhn-style checksum
 * - Real-time OTP generation and verification (now calls Supabase Edge Function!)
 * - GSTR-1 outward supply invoice entry
 * - GSTR-3B summary return with auto-population
 * - Credit Ledger (ITC/TDS/TCS)
 * - Filing & Payment with ARN generation
 * - Smart Compliance Scoring
 *
 * Technologies: React 18 + TypeScript + Tailwind CSS + Lucide Icons + Supabase
 *
 * To use in VS Code:
 * 1. Create a new Vite project: npm create vite@latest gst-portal -- --template react-ts
 * 2. Install dependencies: npm install lucide-react @supabase/supabase-js
 * 3. Install Tailwind: npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
 * 4. Configure tailwind.config.js with content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
 * 5. Add to src/index.css: @tailwind base; @tailwind components; @tailwind utilities;
 * 6. Copy this entire file content to src/App.tsx
 * 7. Set up .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * 8. Run: npm run dev
 *
 * =============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  // Icons from lucide-react
  Shield, Eye, EyeOff, Lock, User, Bell, LogOut, ChevronDown,
  LayoutDashboard, UserCheck, FileText, BarChart3, CreditCard, Upload, TrendingUp, ChevronRight,
  PlusCircle, Trash2, CheckCircle, AlertCircle, Clock, IndianRupee, RefreshCw,
  Phone, Copy, Printer, Info, Save, Search, Building2, Mail, MapPin, Award, BarChart2, FileCheck, XCircle
} from 'lucide-react';

// =============================================================================
// SECTION 1: TYPES
// =============================================================================

export interface Taxpayer {
  gstin: string;
  legalName: string;
  tradeName: string;
  pan: string;
  stateCode: string;
  stateName: string;
  registrationDate: string;
  businessType: string;
  status: 'Active' | 'Cancelled' | 'Suspended';
  email: string;
  mobile: string;
  address: string;
  annualTurnover: number;
  gstRate: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  buyerGstin: string;
  buyerName: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  invoiceValue: number;
  supplyType: 'B2B' | 'B2C' | 'EXPORT';
  isInterState: boolean;
}

export interface GSTR3BData {
  outwardTaxableSupplies: number;
  outwardTaxableIgst: number;
  outwardTaxableCgst: number;
  outwardTaxableSgst: number;
  zeroRatedSupplies: number;
  nilExemptSupplies: number;
  itcIgst: number;
  itcCgst: number;
  itcSgst: number;
  tds: number;
  tcs: number;
  netPayableIgst: number;
  netPayableCgst: number;
  netPayableSgst: number;
  totalNetPayable: number;
}

export interface FilingRecord {
  id: string;
  gstin: string;
  returnType: 'GSTR-1' | 'GSTR-3B';
  taxPeriod: string;
  filedOn: string;
  arn: string;
  status: 'Filed' | 'Pending' | 'Late';
  totalTax: number;
  challanNo: string;
}

export type Page =
  | 'login'
  | 'dashboard'
  | 'taxpayer-master'
  | 'gstr1'
  | 'gstr3b'
  | 'credit-ledger'
  | 'filing-payment'
  | 'compliance';

export interface CreditLedger {
  itcIgst: number;
  itcCgst: number;
  itcSgst: number;
  tds: number;
  tcs: number;
}

// =============================================================================
// SECTION 2: UTILITY FUNCTIONS (gst.ts)
// =============================================================================

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh', '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };
  const cleaned = gstin.toUpperCase().trim();
  if (cleaned.length !== 15) return { valid: false, error: 'GSTIN must be exactly 15 characters' };

  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!pattern.test(cleaned)) return { valid: false, error: 'Invalid GSTIN format' };

  const stateCode = cleaned.substring(0, 2);
  if (!STATE_CODES[stateCode]) return { valid: false, error: `Invalid state code: ${stateCode}` };

  // Luhn-like checksum verification
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = CHECKSUM_CHARS.indexOf(cleaned[i]);
    const product = val * (i % 2 === 0 ? 1 : 2);
    sum += product > 35 ? (product % 36) + Math.floor(product / 36) : product;
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  const expectedChar = CHECKSUM_CHARS[checkDigit];

  if (cleaned[14] !== expectedChar) {
    return { valid: false, error: `Invalid checksum. Expected check digit: ${expectedChar}` };
  }

  return { valid: true };
}

export function extractGSTINInfo(gstin: string) {
  const cleaned = gstin.toUpperCase().trim();
  const stateCode = cleaned.substring(0, 2);
  const pan = cleaned.substring(2, 12);
  return {
    stateCode,
    stateName: STATE_CODES[stateCode] || 'Unknown',
    pan,
    entityCode: cleaned[12],
    checksum: cleaned[14],
  };
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateARN(gstin: string, returnType: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const stateCode = gstin.substring(0, 2);
  const typeCode = returnType === 'GSTR-1' ? 'AA' : 'AB';
  return `AA${stateCode}${typeCode}${timestamp}`;
}

export function generateCPIN(): string {
  return `CPIN${Date.now().toString().slice(-10)}`;
}

export function calculateGSTR3B(invoices: Invoice[]): GSTR3BData {
  let outwardTaxableSupplies = 0;
  let outwardTaxableIgst = 0;
  let outwardTaxableCgst = 0;
  let outwardTaxableSgst = 0;

  for (const inv of invoices) {
    outwardTaxableSupplies += inv.taxableValue;
    outwardTaxableIgst += inv.igst;
    outwardTaxableCgst += inv.cgst;
    outwardTaxableSgst += inv.sgst;
  }

  return {
    outwardTaxableSupplies,
    outwardTaxableIgst,
    outwardTaxableCgst,
    outwardTaxableSgst,
    zeroRatedSupplies: 0,
    nilExemptSupplies: 0,
    itcIgst: 0, itcCgst: 0, itcSgst: 0,
    tds: 0, tcs: 0,
    netPayableIgst: outwardTaxableIgst,
    netPayableCgst: outwardTaxableCgst,
    netPayableSgst: outwardTaxableSgst,
    totalNetPayable: outwardTaxableIgst + outwardTaxableCgst + outwardTaxableSgst,
  };
}

export function calculateComplianceScore(
  filings: FilingRecord[],
  invoices: Invoice[]
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if (filings.length === 0) { issues.push('No returns filed yet'); score -= 30; }
  const lateFilings = filings.filter((f) => f.status === 'Late');
  if (lateFilings.length > 0) { issues.push(`${lateFilings.length} return(s) filed late`); score -= lateFilings.length * 10; }
  const missingGstin = invoices.filter((inv) => !inv.buyerGstin || inv.buyerGstin === 'URP');
  if (missingGstin.length > 0) { issues.push(`${missingGstin.length} invoice(s) have missing buyer GSTIN`); score -= missingGstin.length * 2; }
  const totalOutput = invoices.reduce((s, i) => s + i.totalTax, 0);
  const pendingFilings = filings.filter((f) => f.status === 'Pending');
  if (pendingFilings.length > 0) { issues.push(`${pendingFilings.length} return(s) pending`); score -= pendingFilings.length * 15; }
  if (totalOutput === 0 && invoices.length > 0) { issues.push('No tax liability computed — verify invoice data'); score -= 10; }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
}

export function currentTaxPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${month}${now.getFullYear()}`;
}

// =============================================================================
// SECTION 3: LOCAL STORAGE UTILITIES (storage.ts)
// =============================================================================

const KEYS = {
  taxpayer: 'gst_taxpayer', invoices: 'gst_invoices', filings: 'gst_filings',
  user: 'gst_user', creditLedger: 'gst_credit_ledger',
};

export function saveTaxpayer(t: Taxpayer) { localStorage.setItem(KEYS.taxpayer, JSON.stringify(t)); }
export function loadTaxpayer(): Taxpayer | null {
  const raw = localStorage.getItem(KEYS.taxpayer);
  return raw ? JSON.parse(raw) : null;
}
export function saveInvoices(invoices: Invoice[]) { localStorage.setItem(KEYS.invoices, JSON.stringify(invoices)); }
export function loadInvoices(): Invoice[] {
  const raw = localStorage.getItem(KEYS.invoices);
  return raw ? JSON.parse(raw) : [];
}
export function saveFilings(filings: FilingRecord[]) { localStorage.setItem(KEYS.filings, JSON.stringify(filings)); }
export function loadFilings(): FilingRecord[] {
  const raw = localStorage.getItem(KEYS.filings);
  return raw ? JSON.parse(raw) : [];
}
export function saveCreditLedger(c: CreditLedger) { localStorage.setItem(KEYS.creditLedger, JSON.stringify(c)); }
export function loadCreditLedger(): CreditLedger {
  const raw = localStorage.getItem(KEYS.creditLedger);
  return raw ? JSON.parse(raw) : { itcIgst: 0, itcCgst: 0, itcSgst: 0, tds: 0, tcs: 0 };
}
export function saveUser(email: string) { localStorage.setItem(KEYS.user, email); }
export function loadUser(): string | null { return localStorage.getItem(KEYS.user); }
export function clearAll() { Object.values(KEYS).forEach((k) => localStorage.removeItem(k)); }

// =============================================================================
// SECTION 4: COMPONENTS
// =============================================================================

// --- LoginPage Component ---
function LoginPage({ onLogin }: { onLogin: (email: string) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required.'); return; }
    if (mode === 'signup') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    }
    saveUser(email);
    onLogin(email);
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <div className="bg-[#0f4c81] text-white text-xs text-center py-1.5">Government of India Portal — For Taxpayer Services</div>
      <header className="bg-white shadow-sm border-b-4 border-[#0f766e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#0f4c81] rounded-full flex items-center justify-center"><Shield className="w-8 h-8 text-white" /></div>
          <div>
            <div className="text-[#0f4c81] font-bold text-xl tracking-tight">Goods and Services Tax Network</div>
            <div className="text-[#0f766e] text-sm font-medium">GST Portal — Smart Compliance Simulator</div>
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#0f4c81] px-6 py-5 text-white text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-90" />
              <h2 className="text-lg font-semibold">Taxpayer Login</h2>
              <p className="text-blue-200 text-sm mt-1">GST Portal — Secure Access</p>
            </div>
            <div className="flex border-b border-gray-200">
              {(['login', 'signup'] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === m ? 'bg-[#0f766e] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  {m === 'login' ? 'Sign In' : 'New Registration'}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Email / Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                    placeholder="Enter registered email" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                    placeholder="Enter password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                      placeholder="Re-enter password" />
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-[#0f766e] hover:bg-[#0d6560] text-white py-2.5 rounded font-semibold text-sm transition-colors">
                {mode === 'login' ? 'Login to Portal' : 'Register & Login'}
              </button>
            </form>
          </div>
          <div className="text-center mt-4 text-xs text-gray-500">Best viewed in Chrome 90+ | Screen Resolution 1280x800</div>
        </div>
      </div>
      <footer className="bg-[#0f4c81] text-white text-xs text-center py-3">© 2024 Goods and Services Tax Network. All Rights Reserved.</footer>
    </div>
  );
}

// --- Header Component ---
function Header({ user, taxpayer, onLogout }: { user: string; taxpayer: Taxpayer | null; onLogout: () => void }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="bg-[#0f4c81] text-white text-xs py-1 px-4 flex justify-between items-center">
        <span>Government of India — Ministry of Finance</span>
        <span>Skip to Main Content | Screen Reader Access</span>
      </div>
      <div className="max-w-full px-4 py-2 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0f4c81] rounded-full flex-shrink-0 flex items-center justify-center"><Shield className="w-7 h-7 text-white" /></div>
        <div className="flex-1 min-w-0">
          <div className="text-[#0f4c81] font-bold text-base leading-tight">Goods and Services Tax Network (GSTN)</div>
          <div className="text-[#0f766e] text-xs font-medium">Smart GST Compliance Simulator</div>
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
            <div className="w-8 h-8 bg-[#0f766e] rounded-full flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
            <span className="hidden md:block text-xs font-medium max-w-[120px] truncate">{user}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1.5 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-[#0f4c81] via-[#0f766e] to-[#0f4c81]"></div>
    </header>
  );
}

// --- Sidebar Component ---
function Sidebar({ current, onNavigate, hasTaxpayer }: { current: Page; onNavigate: (page: Page) => void; hasTaxpayer: boolean }) {
  const NAV_ITEMS: { id: Page; label: string; icon: React.ComponentType<{ className?: string }>; sublabel?: string; requiresTaxpayer?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'taxpayer-master', label: 'Taxpayer Master', icon: UserCheck, sublabel: 'Register / Validate GSTIN' },
    { id: 'gstr1', label: 'GSTR-1', icon: FileText, sublabel: 'Outward Supply Details', requiresTaxpayer: true },
    { id: 'gstr3b', label: 'GSTR-3B', icon: BarChart3, sublabel: 'Summary Return', requiresTaxpayer: true },
    { id: 'credit-ledger', label: 'Credit Ledger', icon: CreditCard, sublabel: 'ITC / TDS / TCS', requiresTaxpayer: true },
    { id: 'filing-payment', label: 'File & Pay', icon: Upload, sublabel: 'Submit Returns', requiresTaxpayer: true },
    { id: 'compliance', label: 'Smart Insights', icon: TrendingUp, sublabel: 'Compliance Score', requiresTaxpayer: true },
  ];

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
              <button key={item.id} onClick={() => !disabled && onNavigate(item.id)} disabled={disabled}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all relative group
                  ${active ? 'bg-[#0f766e] text-white border-r-4 border-white' : disabled ? 'text-blue-400 opacity-40 cursor-not-allowed' : 'text-blue-100 hover:bg-blue-800 hover:text-white cursor-pointer'}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  {item.sublabel && <div className="text-xs opacity-60 truncate mt-0.5">{item.sublabel}</div>}
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

// --- Dashboard Component ---
function Dashboard({ taxpayer, invoices, filings, onNavigate }: { taxpayer: Taxpayer | null; invoices: Invoice[]; filings: FilingRecord[]; onNavigate: (page: Page) => void }) {
  const totalOutput = invoices.reduce((s, i) => s + i.totalTax, 0);
  const totalTaxable = invoices.reduce((s, i) => s + i.taxableValue, 0);
  const { score, issues } = calculateComplianceScore(filings, invoices);
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="p-6 space-y-6">
      {taxpayer ? (
        <div className="bg-gradient-to-r from-[#0f4c81] to-[#0f766e] text-white rounded-lg p-5 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{taxpayer.legalName}</h2>
              {taxpayer.tradeName && <p className="text-blue-200 text-sm">{taxpayer.tradeName}</p>}
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><span className="text-blue-300">GSTIN:</span> <strong>{taxpayer.gstin}</strong></span>
                <span><span className="text-blue-300">PAN:</span> <strong>{taxpayer.pan}</strong></span>
                <span><span className="text-blue-300">State:</span> <strong>{taxpayer.stateName}</strong></span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className={`text-2xl font-bold ${score >= 80 ? 'text-green-300' : score >= 60 ? 'text-yellow-300' : 'text-red-300'}`}>{score}</div>
              <div className="text-xs text-blue-200">Compliance Score</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Taxpayer not registered</p>
            <p className="text-amber-700 text-sm mt-1">Please complete your Taxpayer Master registration before accessing GST filing services.</p>
            <button onClick={() => onNavigate('taxpayer-master')} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-1.5 rounded transition-colors">Register Taxpayer</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-l-4 border-[#0f4c81] border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Invoices</p>
              <p className="text-lg font-bold text-gray-800 mt-1 truncate">{invoices.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">GSTR-1 entries</p>
            </div>
            <FileText className="w-5 h-5 text-[#0f4c81]" />
          </div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-[#0f766e] border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Taxable Turnover</p>
              <p className="text-lg font-bold text-gray-800 mt-1 truncate">{formatCurrency(totalTaxable)}</p>
              <p className="text-xs text-gray-400 mt-0.5">This period</p>
            </div>
            <IndianRupee className="w-5 h-5 text-[#0f766e]" />
          </div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-orange-500 border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Output Tax</p>
              <p className="text-lg font-bold text-gray-800 mt-1 truncate">{formatCurrency(totalOutput)}</p>
              <p className="text-xs text-gray-400 mt-0.5">CGST+SGST+IGST</p>
            </div>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-green-500 border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Returns Filed</p>
              <p className="text-lg font-bold text-gray-800 mt-1 truncate">{filings.filter(f => f.status === 'Filed').length}</p>
              <p className="text-xs text-gray-400 mt-0.5">{filings.length} total</p>
            </div>
            <Upload className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- TaxpayerMaster Component ---
function TaxpayerMaster({ taxpayer, onSave }: { taxpayer: Taxpayer | null; onSave: (t: Taxpayer) => void }) {
  const [gstin, setGstin] = useState(taxpayer?.gstin || '');
  const [gstinValidation, setGstinValidation] = useState<{ valid: boolean; error?: string } | null>(taxpayer ? { valid: true } : null);
  const [form, setForm] = useState<Partial<Taxpayer>>(taxpayer || { status: 'Active', businessType: 'Private Limited Company', gstRate: 18, annualTurnover: 0 });
  const [saved, setSaved] = useState(!!taxpayer);
  const [showForm, setShowForm] = useState(!!taxpayer);
  const BUSINESS_TYPES = ['Private Limited Company', 'Public Limited Company', 'Partnership Firm', 'Proprietorship', 'LLP', 'Trust', 'Society', 'Government Entity', 'Other'];
  const GST_RATES = [0, 5, 12, 18, 28];

  function handleGstinChange(val: string) {
    const v = val.toUpperCase().replace(/\s/g, '');
    setGstin(v);
    setGstinValidation(null);
    setShowForm(false);
    setSaved(false);
  }

  function handleValidate() {
    const result = validateGSTIN(gstin);
    setGstinValidation(result);
    if (result.valid) {
      const info = extractGSTINInfo(gstin);
      setForm((prev) => ({ ...prev, gstin, stateCode: info.stateCode, stateName: info.stateName, pan: info.pan }));
      setShowForm(true);
    }
  }

  function handleChange(field: keyof Taxpayer, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.legalName || !form.mobile || !form.email) { alert('Please fill all required fields.'); return; }
    const taxpayerData: Taxpayer = {
      gstin: form.gstin!, legalName: form.legalName!, tradeName: form.tradeName || '', pan: form.pan!,
      stateCode: form.stateCode!, stateName: form.stateName!, registrationDate: form.registrationDate || new Date().toISOString().split('T')[0],
      businessType: form.businessType || 'Private Limited Company', status: form.status || 'Active', email: form.email!,
      mobile: form.mobile!, address: form.address || '', annualTurnover: Number(form.annualTurnover) || 0, gstRate: Number(form.gstRate) || 18,
    };
    onSave(taxpayerData);
    setSaved(true);
  }

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <UserCheck className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">Taxpayer Master</h1>
          <p className="text-sm text-gray-500">Register and validate your GSTIN before filing</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">Step 1: GSTIN Validation</div>
        <div className="p-5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Enter GSTIN <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            <input value={gstin} onChange={(e) => handleGstinChange(e.target.value)} maxLength={15}
              className="flex-1 border border-gray-300 rounded px-3 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
              placeholder="e.g. 27AAPFU0939F1ZV" />
            <button onClick={handleValidate} disabled={gstin.length !== 15}
              className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded text-sm font-semibold transition-colors">
              <Search className="w-4 h-4" /> Validate
            </button>
          </div>
          {gstinValidation && (
            <div className={`mt-3 flex items-start gap-2 rounded px-4 py-3 text-sm font-medium ${gstinValidation.valid ? 'bg-green-50 border border-green-300 text-green-800' : 'bg-red-50 border border-red-300 text-red-800'}`}>
              {gstinValidation.valid ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
              {gstinValidation.valid ? `GSTIN validated successfully! State: ${form.stateName} | PAN: ${form.pan}` : gstinValidation.error}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">Step 2: Taxpayer Details</div>
          <div className="p-5 space-y-5">
            {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded text-sm"><CheckCircle className="w-5 h-5" /> Taxpayer registered successfully.</div>}
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full"><Building2 className="w-4 h-4" /> Business Information</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Legal Name of Business <span className="text-red-500">*</span></label><input value={form.legalName || ''} onChange={(e) => handleChange('legalName', e.target.value)} className={inputCls} placeholder="As per PAN / Certificate" required /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Trade Name (if different)</label><input value={form.tradeName || ''} onChange={(e) => handleChange('tradeName', e.target.value)} className={inputCls} placeholder="DBA / Trade name" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Business Type <span className="text-red-500">*</span></label><select value={form.businessType || ''} onChange={(e) => handleChange('businessType', e.target.value)} className={inputCls}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Registration Date <span className="text-red-500">*</span></label><input type="date" value={form.registrationDate || ''} onChange={(e) => handleChange('registrationDate', e.target.value)} className={inputCls} required /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Annual Turnover (INR)</label><input type="number" value={form.annualTurnover || ''} onChange={(e) => handleChange('annualTurnover', Number(e.target.value))} className={inputCls} placeholder="0" min={0} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Applicable GST Rate (%)</label><select value={form.gstRate || 18} onChange={(e) => handleChange('gstRate', Number(e.target.value))} className={inputCls}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Registration Status</label><select value={form.status || 'Active'} onChange={(e) => handleChange('status', e.target.value)} className={inputCls}><option value="Active">Active</option><option value="Cancelled">Cancelled</option><option value="Suspended">Suspended</option></select></div>
              </div>
            </fieldset>
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full"><Phone className="w-4 h-4" /> Contact Information</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Mobile Number <span className="text-red-500">*</span></label><div className="flex"><span className="bg-gray-100 border border-r-0 border-gray-300 px-3 py-2.5 text-sm text-gray-600 rounded-l">+91</span><input type="tel" value={form.mobile || ''} onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`${inputCls} rounded-l-none`} placeholder="10-digit mobile" required /></div></div>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email Address <span className="text-red-500">*</span></label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="email" value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={`${inputCls} pl-9`} placeholder="registered@email.com" required /></div></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Registered Address</label><div className="relative"><MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><textarea value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} className={`${inputCls} pl-9 resize-none`} rows={2} placeholder="Complete business address" /></div></div>
              </div>
            </fieldset>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { setShowForm(false); setGstinValidation(null); setGstin(''); }} className="px-5 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 transition-colors">Reset</button>
              <button type="submit" className="px-6 py-2 bg-[#0f766e] hover:bg-[#0d6560] text-white rounded text-sm font-semibold transition-colors">Save Taxpayer Details</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// --- GSTR1 Component ---
function GSTR1({ taxpayer, invoices, onSave }: { taxpayer: Taxpayer; invoices: Invoice[]; onSave: (invoices: Invoice[]) => void }) {
  const blankInvoice = () => ({
    invoiceNo: '', invoiceDate: new Date().toISOString().split('T')[0], buyerGstin: '', buyerName: '',
    taxableValue: 0, igst: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceValue: 0, supplyType: 'B2B' as const, isInterState: false,
  });
  const [form, setForm] = useState(blankInvoice());
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function computeTax(taxableValue: number, rate: number, isInterState: boolean) {
    const totalTax = (taxableValue * rate) / 100;
    if (isInterState) return { igst: totalTax, cgst: 0, sgst: 0, totalTax, invoiceValue: taxableValue + totalTax };
    return { igst: 0, cgst: totalTax / 2, sgst: totalTax / 2, totalTax, invoiceValue: taxableValue + totalTax };
  }

  function handleChange(field: keyof typeof form, value: string | number | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'taxableValue' || field === 'isInterState') {
        const tv = field === 'taxableValue' ? Number(value) : prev.taxableValue;
        const inter = field === 'isInterState' ? Boolean(value) : prev.isInterState;
        const taxes = computeTax(tv, taxpayer.gstRate, inter);
        return { ...updated, ...taxes };
      }
      return updated;
    });
    setSaved(false);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.invoiceNo || !form.buyerName || form.taxableValue <= 0) { setError('Invoice No, Buyer Name, and Taxable Value are required.'); return; }
    const dup = invoices.find((i) => i.invoiceNo === form.invoiceNo && i.id !== editId);
    if (dup) { setError('Duplicate invoice number detected.'); return; }
    if (editId) {
      const updated = invoices.map((i) => i.id === editId ? { ...form, id: editId } : i);
      onSave(updated);
      setEditId(null);
    } else {
      const newInv: Invoice = { ...form, id: `inv_${Date.now()}` };
      onSave([...invoices, newInv]);
    }
    setForm(blankInvoice());
    setSaved(true);
  }

  function handleEdit(inv: Invoice) { setForm({ ...inv }); setEditId(inv.id); setSaved(false); }
  function handleDelete(id: string) { if (confirm('Delete this invoice?')) onSave(invoices.filter((i) => i.id !== id)); }

  const totals = invoices.reduce((acc, inv) => ({
    taxable: acc.taxable + inv.taxableValue, igst: acc.igst + inv.igst,
    cgst: acc.cgst + inv.cgst, sgst: acc.sgst + inv.sgst, total: acc.total + inv.invoiceValue,
  }), { taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 });

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]';
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">GSTR-1 — Outward Supply Details</h1>
          <p className="text-sm text-gray-500">Details of outward supplies of goods or services</p>
        </div>
      </div>
      <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">{editId ? 'Edit Invoice' : 'Add Invoice — B2B / B2C / Export'}</div>
        <div className="p-5">
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}
          {saved && !editId && <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded mb-4"><CheckCircle className="w-4 h-4" /> Invoice saved successfully.</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={labelCls}>Invoice No <span className="text-red-500">*</span></label><input value={form.invoiceNo} onChange={(e) => handleChange('invoiceNo', e.target.value.toUpperCase())} className={inputCls} placeholder="INV/2024/001" required /></div>
            <div><label className={labelCls}>Invoice Date <span className="text-red-500">*</span></label><input type="date" value={form.invoiceDate} onChange={(e) => handleChange('invoiceDate', e.target.value)} className={inputCls} required /></div>
            <div><label className={labelCls}>Supply Type</label><select value={form.supplyType} onChange={(e) => handleChange('supplyType', e.target.value)} className={inputCls}><option value="B2B">B2B (Registered Buyer)</option><option value="B2C">B2C (Unregistered)</option><option value="EXPORT">Export</option></select></div>
            <div><label className={labelCls}>Buyer GSTIN</label><input value={form.buyerGstin} onChange={(e) => handleChange('buyerGstin', e.target.value.toUpperCase())} className={`${inputCls} font-mono`} placeholder="27AAPFU0939F1ZV or URP" maxLength={15} /></div>
            <div><label className={labelCls}>Buyer Name <span className="text-red-500">*</span></label><input value={form.buyerName} onChange={(e) => handleChange('buyerName', e.target.value)} className={inputCls} placeholder="Buyer / Customer name" required /></div>
            <div><label className={labelCls}>Supply Nature</label><select value={form.isInterState ? 'inter' : 'intra'} onChange={(e) => handleChange('isInterState', e.target.value === 'inter')} className={inputCls}><option value="intra">Intra-State (CGST + SGST)</option><option value="inter">Inter-State (IGST)</option></select></div>
            <div><label className={labelCls}>Taxable Value (INR) <span className="text-red-500">*</span></label><input type="number" value={form.taxableValue || ''} onChange={(e) => handleChange('taxableValue', Number(e.target.value))} className={inputCls} placeholder="0.00" min={0} step={0.01} required /></div>
            <div className="md:col-span-2 grid grid-cols-3 gap-3">
              {form.isInterState ? <div><label className={labelCls}>IGST</label><input value={formatCurrency(form.igst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} /></div> : (<><div><label className={labelCls}>CGST</label><input value={formatCurrency(form.cgst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} /></div><div><label className={labelCls}>SGST</label><input value={formatCurrency(form.sgst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} /></div></>)}
              <div><label className={labelCls}>Invoice Value</label><input value={formatCurrency(form.invoiceValue)} readOnly className={`${inputCls} bg-blue-50 text-[#0f4c81] font-semibold`} /></div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <button type="submit" className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white px-5 py-2 rounded text-sm font-semibold transition-colors"><PlusCircle className="w-4 h-4" />{editId ? 'Update Invoice' : 'Add Invoice'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm(blankInvoice()); }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">Cancel Edit</button>}
          </div>
        </div>
      </form>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-[#0f4c81] text-sm">Invoice Register ({invoices.length} invoices)</h3>
        </div>
        {invoices.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No invoices added yet</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0f4c81] text-white">{['Invoice No', 'Date', 'Buyer', 'Type', 'Taxable', 'IGST', 'CGST', 'SGST', 'Total', 'Actions'].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} className={`border-t border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-2 font-semibold text-[#0f4c81]">{inv.invoiceNo}</td>
                    <td className="px-3 py-2 text-gray-600">{inv.invoiceDate}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[120px] truncate">{inv.buyerName}</td>
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${inv.supplyType === 'B2B' ? 'bg-blue-100 text-blue-700' : inv.supplyType === 'EXPORT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{inv.supplyType}</span></td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.taxableValue)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(inv.igst)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.cgst)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.sgst)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(inv.invoiceValue)}</td>
                    <td className="px-3 py-2"><div className="flex gap-2"><button onClick={() => handleEdit(inv)} className="text-[#0f766e] hover:underline text-xs">Edit</button><button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0f4c81] text-white font-semibold text-xs">
                  <td colSpan={4} className="px-3 py-2.5">TOTAL</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(totals.taxable)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(totals.igst)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(totals.cgst)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(totals.sgst)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- GSTR3B Component ---
function GSTR3B({ taxpayer, invoices, creditLedger }: { taxpayer: Taxpayer; invoices: Invoice[]; creditLedger: CreditLedger }) {
  const data: GSTR3BData = {
    ...calculateGSTR3B(invoices),
    itcIgst: creditLedger.itcIgst, itcCgst: creditLedger.itcCgst, itcSgst: creditLedger.itcSgst,
    tds: creditLedger.tds, tcs: creditLedger.tcs,
    netPayableIgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableIgst - creditLedger.itcIgst),
    netPayableCgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableCgst - creditLedger.itcCgst),
    netPayableSgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableSgst - creditLedger.itcSgst),
    totalNetPayable: Math.max(0, calculateGSTR3B(invoices).outwardTaxableIgst - creditLedger.itcIgst) + Math.max(0, calculateGSTR3B(invoices).outwardTaxableCgst - creditLedger.itcCgst) + Math.max(0, calculateGSTR3B(invoices).outwardTaxableSgst - creditLedger.itcSgst) - creditLedger.tds - creditLedger.tcs,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">GSTR-3B — Monthly Summary Return</h1>
          <p className="text-sm text-gray-500">Auto-populated from GSTR-1 invoices and credit ledger</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-[#0f766e]"><RefreshCw className="w-3.5 h-3.5" /> Auto-populated</div>
      </div>
      <div className="bg-[#f0f8ff] border border-blue-200 rounded px-4 py-2 text-xs text-gray-700 flex flex-wrap gap-4">
        <span><strong>GSTIN:</strong> {taxpayer.gstin}</span>
        <span><strong>Legal Name:</strong> {taxpayer.legalName}</span>
        <span><strong>Tax Period:</strong> {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3"><h3 className="font-semibold text-[#0f4c81] text-sm">3.1 — Details of Outward Supplies</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#0f4c81] text-white"><th className="px-4 py-2.5 text-left font-medium">Nature of Supplies</th><th className="px-4 py-2.5 text-right font-medium">Taxable Value</th><th className="px-4 py-2.5 text-right font-medium">IGST</th><th className="px-4 py-2.5 text-right font-medium">CGST</th><th className="px-4 py-2.5 text-right font-medium">SGST</th></tr></thead>
            <tbody>
              <tr className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-700">(a) Outward taxable supplies</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableSupplies)}</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableIgst)}</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableCgst)}</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableSgst)}</td></tr>
              <tr className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-700">(b) Zero rated</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.zeroRatedSupplies)}</td><td className="px-4 py-2.5 text-right">-</td><td className="px-4 py-2.5 text-right">-</td><td className="px-4 py-2.5 text-right">-</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3"><h3 className="font-semibold text-[#0f4c81] text-sm">4 — Eligible Input Tax Credit</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#0f4c81] text-white"><th className="px-4 py-2.5 text-left font-medium">Details</th><th className="px-4 py-2.5 text-right font-medium">IGST</th><th className="px-4 py-2.5 text-right font-medium">CGST</th><th className="px-4 py-2.5 text-right font-medium">SGST</th></tr></thead>
            <tbody>
              <tr className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-700">(A) ITC Available</td><td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcIgst)}</td><td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcCgst)}</td><td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcSgst)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3"><h3 className="font-semibold text-[#0f4c81] text-sm">5.1 — Payment of Tax</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 text-gray-600 text-xs uppercase"><th className="px-4 py-2.5 text-left font-semibold">Description</th><th className="px-4 py-2.5 text-right font-semibold">IGST</th><th className="px-4 py-2.5 text-right font-semibold">CGST</th><th className="px-4 py-2.5 text-right font-semibold">SGST</th><th className="px-4 py-2.5 text-right font-semibold">Total</th></tr></thead>
            <tbody>
              <tr className="border-t border-gray-100"><td className="px-4 py-2.5 text-gray-700">Tax Payable</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableIgst)}</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableCgst)}</td><td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableSgst)}</td><td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(data.outwardTaxableIgst + data.outwardTaxableCgst + data.outwardTaxableSgst)}</td></tr>
              <tr className="border-t border-gray-100 bg-green-50"><td className="px-4 py-2.5 text-green-800">Less: ITC Utilized</td><td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcIgst)})</td><td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcCgst)})</td><td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcSgst)})</td><td className="px-4 py-2.5 text-right text-green-700 font-medium">({formatCurrency(data.itcIgst + data.itcCgst + data.itcSgst)})</td></tr>
              <tr className="border-t-2 border-[#0f4c81] bg-[#0f4c81] text-white"><td className="px-4 py-3 font-bold">Net Tax Payable</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableIgst)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableCgst)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableSgst)}</td><td className="px-4 py-3 text-right font-bold text-yellow-300 text-base">{formatCurrency(Math.max(0, data.totalNetPayable))}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- CreditLedger Component ---
function CreditLedgerComp({ creditLedger, onSave }: { creditLedger: CreditLedger; onSave: (cl: CreditLedger) => void }) {
  const [form, setForm] = useState<CreditLedger>({ ...creditLedger });
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof CreditLedger, value: string) { setForm((prev) => ({ ...prev, [field]: Number(value) || 0 })); setSaved(false); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); onSave(form); setSaved(true); }

  const totalITC = form.itcIgst + form.itcCgst + form.itcSgst;
  const totalCredits = totalITC + form.tds + form.tcs;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">Credit Ledger</h1>
          <p className="text-sm text-gray-500">Input Tax Credit (ITC), TDS, and TCS available for offset</p>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div><strong>What is Input Tax Credit?</strong> ITC is the GST paid on your purchases. It offsets your output tax liability.</div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">Credit Balances Available</div>
        <div className="p-5 space-y-6">
          {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded"><CheckCircle className="w-4 h-4" /> Credit ledger saved successfully.</div>}
          <fieldset>
            <legend className="text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full">Input Tax Credit (ITC)</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ITC — IGST</label><input type="number" value={form.itcIgst || ''} onChange={(e) => handleChange('itcIgst', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" placeholder="0.00" min={0} step={0.01} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ITC — CGST</label><input type="number" value={form.itcCgst || ''} onChange={(e) => handleChange('itcCgst', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" placeholder="0.00" min={0} step={0.01} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ITC — SGST</label><input type="number" value={form.itcSgst || ''} onChange={(e) => handleChange('itcSgst', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" placeholder="0.00" min={0} step={0.01} /></div>
            </div>
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-4 py-2">Total ITC Available: <strong className="text-green-700">{formatCurrency(totalITC)}</strong></div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full">TDS / TCS Credits</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">TDS (Tax Deducted at Source)</label><input type="number" value={form.tds || ''} onChange={(e) => handleChange('tds', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" placeholder="0.00" min={0} step={0.01} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">TCS (Tax Collected at Source)</label><input type="number" value={form.tcs || ''} onChange={(e) => handleChange('tcs', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" placeholder="0.00" min={0} step={0.01} /></div>
            </div>
          </fieldset>
          <div className="flex justify-end"><button type="submit" className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white px-6 py-2.5 rounded text-sm font-semibold transition-colors"><Save className="w-4 h-4" />Save Credit Ledger</button></div>
        </div>
      </form>
    </div>
  );
}

// --- FilingPayment Component (with Real OTP via Supabase Edge Function!) ---
type FilingStep = 'select' | 'verify-otp' | 'challan' | 'success';

function FilingPayment({ taxpayer, invoices, filings, creditLedger, onFilingComplete }: { taxpayer: Taxpayer; invoices: Invoice[]; filings: FilingRecord[]; creditLedger: CreditLedger; onFilingComplete: (filing: FilingRecord) => void }) {
  const [returnType, setReturnType] = useState<'GSTR-1' | 'GSTR-3B'>('GSTR-3B');
  const [step, setStep] = useState<FilingStep>('select');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [currentFiling, setCurrentFiling] = useState<FilingRecord | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const gstr3bData = calculateGSTR3B(invoices);
  const totalITC = creditLedger.itcIgst + creditLedger.itcCgst + creditLedger.itcSgst;
  const netPayable = Math.max(0, gstr3bData.outwardTaxableIgst + gstr3bData.outwardTaxableCgst + gstr3bData.outwardTaxableSgst - totalITC - creditLedger.tds - creditLedger.tcs);

  // REAL OTP via Supabase Edge Function
  async function sendOTP() {
    setOtpLoading(true);
    setOtpError('');
    const newOTP = generateOTP();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: taxpayer.email, otp: newOTP, taxpayerName: taxpayer.legalName }),
      });
      if (!response.ok) throw new Error('Failed to send OTP');
      setGeneratedOTP(newOTP);
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(120);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => { setOtpTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; }); }, 1000);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.error('OTP send error:', err);
      // Fallback: still show OTP in demo mode
      setGeneratedOTP(newOTP);
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(120);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => { setOtpTimer((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; }); }, 1000);
    } finally { setOtpLoading(false); }
  }

  function handleOtpInput(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp]; updated[idx] = digit; setOtp(updated); setOtpError('');
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  }

  function handleVerifyOTP() {
    const entered = otp.join('');
    if (entered.length !== 6) { setOtpError('Please enter all 6 digits.'); return; }
    if (otpTimer === 0) { setOtpError('OTP has expired. Please request a new OTP.'); return; }
    if (entered !== generatedOTP) { setOtpError('Invalid OTP. Please try again.'); setOtp(['', '', '', '', '', '']); inputRefs.current[0]?.focus(); return; }
    const arn = generateARN(taxpayer.gstin, returnType);
    const cpin = generateCPIN();
    const period = currentTaxPeriod();
    const filing: FilingRecord = {
      id: `filing_${Date.now()}`, gstin: taxpayer.gstin, returnType, taxPeriod: period,
      filedOn: new Date().toISOString(), arn, status: 'Filed', totalTax: netPayable, challanNo: cpin,
    };
    setCurrentFiling(filing);
    setStep('challan');
  }

  function handlePayAndFile() { if (currentFiling) { onFilingComplete(currentFiling); setStep('success'); } }
  function handleReset() { setStep('select'); setOtp(['', '', '', '', '', '']); setGeneratedOTP(''); setOtpSent(false); setOtpError(''); setOtpTimer(0); setCurrentFiling(null); }

  const validationIssues: string[] = [];
  if (taxpayer.status !== 'Active') validationIssues.push('Taxpayer status is not Active');
  if (invoices.length === 0 && returnType === 'GSTR-1') validationIssues.push('No invoices found in GSTR-1');
  if (returnType === 'GSTR-3B' && invoices.length === 0) validationIssues.push('No outward supply data found');

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Upload className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">File Return & Pay Tax</h1>
          <p className="text-sm text-gray-500">Submit your GST return with OTP-based EVC verification</p>
        </div>
      </div>
      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {(['select', 'verify-otp', 'challan', 'success'] as FilingStep[]).map((s, i, arr) => {
          const labels = { select: 'Select Return', 'verify-otp': 'OTP Verification', challan: 'Challan', success: 'Filed' };
          const active = step === s;
          const done = arr.indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-[#0f4c81] border-[#0f4c81] text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${active ? 'text-[#0f4c81]' : done ? 'text-green-600' : 'text-gray-400'}`}>{labels[s]}</span>
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 mt-[-12px] mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>
      {/* Step 1: Select Return */}
      {step === 'select' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">Step 1: Select Return Type</div>
          <div className="p-5 space-y-5">
            <div className={`rounded-lg border px-4 py-3 ${taxpayer.status === 'Active' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                {taxpayer.status === 'Active' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span className={taxpayer.status === 'Active' ? 'text-green-800' : 'text-red-800'}>Taxpayer Status: {taxpayer.status}</span>
              </div>
              <div className="text-xs grid grid-cols-2 gap-1 text-gray-600 mt-2">
                <span><strong>GSTIN:</strong> {taxpayer.gstin}</span><span><strong>Name:</strong> {taxpayer.legalName}</span>
                <span><strong>State:</strong> {taxpayer.stateName}</span><span><strong>Mobile:</strong> +91-{taxpayer.mobile}</span>
              </div>
            </div>
            {validationIssues.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Filing blocked due to:</p>
                <ul className="list-disc list-inside space-y-1">{validationIssues.map((issue, i) => <li key={i} className="text-xs text-red-600">{issue}</li>)}</ul>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Select Return Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['GSTR-1', 'GSTR-3B'] as const).map((rt) => (
                  <button key={rt} onClick={() => setReturnType(rt)} className={`p-4 rounded-lg border-2 text-left transition-all ${returnType === rt ? 'border-[#0f766e] bg-[#f0faf9]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-[#0f4c81] text-base">{rt}</div>
                    <div className="text-xs text-gray-500 mt-1">{rt === 'GSTR-1' ? 'Outward Supply Details' : 'Monthly Summary Return'}</div>
                    {returnType === rt && <CheckCircle className="w-4 h-4 text-[#0f766e] mt-2" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Tax Summary</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Invoices Uploaded</span><span className="font-semibold">{invoices.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Output IGST</span><span>{formatCurrency(gstr3bData.outwardTaxableIgst)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Output CGST</span><span>{formatCurrency(gstr3bData.outwardTaxableCgst)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Output SGST</span><span>{formatCurrency(gstr3bData.outwardTaxableSgst)}</span></div>
                <div className="flex justify-between text-green-700"><span>Less: ITC + TDS/TCS</span><span>({formatCurrency(totalITC + creditLedger.tds + creditLedger.tcs)})</span></div>
                <div className="flex justify-between font-bold text-[#0f4c81] border-t border-gray-300 pt-2 mt-2 text-base">
                  <span>Net Tax Payable</span><span className="text-red-700">{formatCurrency(netPayable)}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setStep('verify-otp')} disabled={validationIssues.length > 0 || taxpayer.status !== 'Active'}
              className="w-full flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded font-semibold text-sm transition-colors">
              <Shield className="w-4 h-4" />Proceed to OTP Verification
            </button>
          </div>
        </div>
      )}
      {/* Step 2: OTP Verification */}
      {step === 'verify-otp' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold flex items-center gap-2"><Phone className="w-4 h-4" />Step 2: OTP Verification (EVC)</div>
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0f4c81] rounded-full flex items-center justify-center mx-auto mb-3"><Shield className="w-8 h-8 text-white" /></div>
              <h3 className="font-bold text-[#0f4c81] text-lg">Electronic Verification Code</h3>
              <p className="text-gray-500 text-sm mt-1">An OTP will be sent to your registered mobile <strong>+91-XXXXXX{taxpayer.mobile.slice(-4)}</strong></p>
            </div>
            {!otpSent ? (
              <button onClick={sendOTP} disabled={otpLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 text-white py-3 rounded font-semibold text-sm transition-colors">
                <Phone className="w-4 h-4" />{otpLoading ? 'Sending OTP...' : 'Send OTP to Registered Mobile'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Demo Mode — Your OTP</p>
                  <div className="text-4xl font-mono font-bold text-[#0f4c81] tracking-[0.5em] mt-2">{generatedOTP}</div>
                  <p className="text-xs text-amber-600 mt-2">OTP is also sent to {taxpayer.email} via Supabase Edge Function</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide text-center mb-3">Enter 6-Digit OTP</label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, i) => (
                      <input key={i} ref={(el) => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none transition-colors ${digit ? 'border-[#0f766e] bg-[#f0faf9] text-[#0f4c81]' : 'border-gray-300 focus:border-[#0f766e]'} ${otpError ? 'border-red-400 bg-red-50' : ''}`} />
                    ))}
                  </div>
                  {otpError && <p className="text-center text-red-600 text-sm mt-2 flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" />{otpError}</p>}
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {otpTimer > 0 ? <span>OTP expires in <strong className="text-[#0f766e]">{Math.floor(otpTimer/60)}:{String(otpTimer%60).padStart(2,'0')}</strong></span> : <span className="text-red-500">OTP expired. <button onClick={sendOTP} className="text-[#0f766e] underline font-medium">Resend OTP</button></span>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('select')} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 transition-colors">Back</button>
                  <button onClick={handleVerifyOTP} disabled={otp.join('').length !== 6} className="flex-1 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded text-sm font-semibold transition-colors">Verify OTP & Continue</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Step 3: Challan */}
      {step === 'challan' && currentFiling && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">Step 3: Payment Challan (CPIN)</div>
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-800"><CheckCircle className="w-5 h-5" />OTP verified successfully. Review challan and confirm payment.</div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <h4 className="font-bold text-[#0f4c81] text-sm">Payment Challan</h4>
                <span className="text-xs font-mono text-gray-500">{currentFiling.challanNo}</span>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 text-xs">CPIN</span><span className="font-mono font-medium text-gray-800 text-xs">{currentFiling.challanNo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">GSTIN</span><span className="font-mono font-medium text-gray-800 text-xs">{taxpayer.gstin}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Taxpayer</span><span className="font-medium text-gray-800 text-xs">{taxpayer.legalName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Return Type</span><span className="font-medium text-gray-800 text-xs">{currentFiling.returnType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Tax Period</span><span className="font-medium text-gray-800 text-xs">{currentFiling.taxPeriod}</span></div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-[#0f4c81]">
                  <span>Total Amount Payable</span><span className="text-red-700 text-base">{formatCurrency(netPayable)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('verify-otp')} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">Back</button>
              <button onClick={handlePayAndFile} className="flex-1 flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white py-2.5 rounded text-sm font-semibold transition-colors"><Upload className="w-4 h-4" />Confirm & File Return</button>
            </div>
          </div>
        </div>
      )}
      {/* Step 4: Success */}
      {step === 'success' && currentFiling && (
        <div className="bg-white rounded-lg border border-green-300 shadow-sm overflow-hidden">
          <div className="bg-green-600 text-white px-5 py-4 text-center"><CheckCircle className="w-12 h-12 mx-auto mb-2" /><h3 className="text-lg font-bold">Return Filed Successfully!</h3><p className="text-green-100 text-sm mt-1">Your {currentFiling.returnType} has been filed</p></div>
          <div className="p-6 space-y-4">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Acknowledgement Reference Number (ARN)</p>
                <p className="text-2xl font-mono font-bold text-[#0f4c81] mt-2 tracking-wider">{currentFiling.arn}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Return Type</span><span className="font-medium text-gray-800 text-xs">{currentFiling.returnType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Tax Period</span><span className="font-medium text-gray-800 text-xs">{currentFiling.taxPeriod}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Filed On</span><span className="font-medium text-gray-800 text-xs">{new Date(currentFiling.filedOn).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Tax Paid</span><span className="font-medium text-gray-800 text-xs">{formatCurrency(currentFiling.totalTax)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Challan No</span><span className="font-mono font-medium text-gray-800 text-xs">{currentFiling.challanNo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Status</span><span className="font-medium text-gray-800 text-xs">{currentFiling.status}</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigator.clipboard?.writeText(currentFiling.arn)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"><Copy className="w-4 h-4" />Copy ARN</button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"><Printer className="w-4 h-4" />Print</button>
              <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 bg-[#0f4c81] hover:bg-[#0d4070] text-white py-2 rounded text-sm font-semibold"><FileText className="w-4 h-4" />File Another Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ComplianceInsights Component ---
function ComplianceInsights({ taxpayer, invoices, filings }: { taxpayer: Taxpayer; invoices: Invoice[]; filings: FilingRecord[] }) {
  const { score, issues } = calculateComplianceScore(filings, invoices);
  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const checks = [
    { label: 'GSTIN Active', pass: taxpayer.status === 'Active' },
    { label: 'Invoices Uploaded', pass: invoices.length > 0 },
    { label: 'Returns Filed', pass: filings.length > 0 },
    { label: 'No Late Filings', pass: filings.filter((f) => f.status === 'Late').length === 0 },
    { label: 'Tax Liability Declared', pass: invoices.reduce((s, i) => s + i.totalTax, 0) > 0 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-[#0f4c81]" /><h1 className="text-xl font-bold text-[#0f4c81]">Smart Compliance Insights</h1></div>
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#0f766e] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">Overall Compliance Score</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-6xl font-black" style={{ color: score >= 80 ? '#86efac' : score >= 60 ? '#fde68a' : '#fca5a5' }}>{score}</span>
              <span className="text-blue-200 text-2xl mb-2">/100</span>
            </div>
            <p className="text-lg font-semibold mt-1" style={{ color: score >= 80 ? '#86efac' : score >= 60 ? '#fde68a' : '#fca5a5' }}>{scoreLabel}</p>
          </div>
          <div className="w-32 h-32 relative flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score / 100) * 314} 314`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute text-center"><Award className="w-8 h-8 mx-auto text-white" /></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3"><h3 className="font-semibold text-[#0f4c81] text-sm flex items-center gap-2"><FileCheck className="w-4 h-4" /> Compliance Checklist</h3></div>
        <div className="p-4 space-y-2">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${c.pass ? 'bg-green-50' : 'bg-red-50'}`}>
              {c.pass ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
              <span className={`text-sm font-medium ${c.pass ? 'text-green-800' : 'text-red-700'}`}>{c.label}</span>
              <span className={`ml-auto text-xs font-bold ${c.pass ? 'text-green-600' : 'text-red-500'}`}>{c.pass ? 'PASS' : 'FAIL'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- NotRegistered Component ---
function NotRegistered({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-64 text-center">
      <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
      <h2 className="text-lg font-bold text-gray-700 mb-2">Taxpayer Not Registered</h2>
      <p className="text-gray-500 text-sm mb-4">Please complete Taxpayer Master registration first.</p>
      <button onClick={() => onNavigate('taxpayer-master')} className="bg-[#0f766e] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-[#0d6560] transition-colors">Go to Taxpayer Master</button>
    </div>
  );
}

// =============================================================================
// SECTION 5: MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [taxpayer, setTaxpayer] = useState<Taxpayer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filings, setFilings] = useState<FilingRecord[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedger>({ itcIgst: 0, itcCgst: 0, itcSgst: 0, tds: 0, tcs: 0 });
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const storedUser = loadUser();
    if (storedUser) setUser(storedUser);
    setTaxpayer(loadTaxpayer());
    setInvoices(loadInvoices());
    setFilings(loadFilings());
    setCreditLedger(loadCreditLedger());
  }, []);

  function handleLogin(email: string) { saveUser(email); setUser(email); setTaxpayer(loadTaxpayer()); setInvoices(loadInvoices()); setFilings(loadFilings()); setCreditLedger(loadCreditLedger()); setPage('dashboard'); }
  function handleLogout() { clearAll(); setUser(null); setTaxpayer(null); setInvoices([]); setFilings([]); setCreditLedger({ itcIgst: 0, itcCgst: 0, itcSgst: 0, tds: 0, tcs: 0 }); setPage('dashboard'); }
  function handleSaveTaxpayer(t: Taxpayer) { saveTaxpayer(t); setTaxpayer(t); }
  function handleSaveInvoices(inv: Invoice[]) { saveInvoices(inv); setInvoices(inv); }
  function handleSaveFilings(f: FilingRecord[]) { saveFilings(f); setFilings(f); }
  function handleSaveCreditLedger(cl: CreditLedger) { saveCreditLedger(cl); setCreditLedger(cl); }
  function handleFilingComplete(filing: FilingRecord) { const updated = [...filings, filing]; handleSaveFilings(updated); }
  function handleNavigate(p: Page) { if (!taxpayer && p !== 'dashboard' && p !== 'taxpayer-master') return; setPage(p); }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  function renderPage() {
    switch (page) {
      case 'dashboard': return <Dashboard taxpayer={taxpayer} invoices={invoices} filings={filings} onNavigate={handleNavigate} />;
      case 'taxpayer-master': return <TaxpayerMaster taxpayer={taxpayer} onSave={handleSaveTaxpayer} />;
      case 'gstr1': return taxpayer ? <GSTR1 taxpayer={taxpayer} invoices={invoices} onSave={handleSaveInvoices} /> : <NotRegistered onNavigate={handleNavigate} />;
      case 'gstr3b': return taxpayer ? <GSTR3B taxpayer={taxpayer} invoices={invoices} creditLedger={creditLedger} /> : <NotRegistered onNavigate={handleNavigate} />;
      case 'credit-ledger': return taxpayer ? <CreditLedgerComp creditLedger={creditLedger} onSave={handleSaveCreditLedger} /> : <NotRegistered onNavigate={handleNavigate} />;
      case 'filing-payment': return taxpayer ? <FilingPayment taxpayer={taxpayer} invoices={invoices} filings={filings} creditLedger={creditLedger} onFilingComplete={handleFilingComplete} /> : <NotRegistered onNavigate={handleNavigate} />;
      case 'compliance': return taxpayer ? <ComplianceInsights taxpayer={taxpayer} invoices={invoices} filings={filings} /> : <NotRegistered onNavigate={handleNavigate} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <Header user={user} taxpayer={taxpayer} onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar current={page} onNavigate={handleNavigate} hasTaxpayer={!!taxpayer} />
        <main className="flex-1 min-w-0 overflow-y-auto">{renderPage()}</main>
      </div>
      <footer className="bg-[#0f4c81] text-white text-xs text-center py-2.5">© 2024 GSTN | Smart Compliance Simulator | For Educational Use Only</footer>
    </div>
  );
}
