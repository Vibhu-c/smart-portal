import { useState, useEffect } from 'react';
import type { Taxpayer, Invoice, FilingRecord, Page } from './types';
import {
  loadUser, saveUser, clearAll,
  loadTaxpayer, saveTaxpayer,
  loadInvoices, saveInvoices,
  loadFilings, saveFilings,
  loadCreditLedger, saveCreditLedger,
} from './utils/storage';

import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TaxpayerMaster from './components/TaxpayerMaster';
import GSTR1 from './components/GSTR1';
import GSTR3B from './components/GSTR3B';
import CreditLedger from './components/CreditLedger';
import FilingPayment from './components/FilingPayment';
import ComplianceInsights from './components/ComplianceInsights';

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [taxpayer, setTaxpayer] = useState<Taxpayer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filings, setFilings] = useState<FilingRecord[]>([]);
  const [creditLedger, setCreditLedger] = useState(loadCreditLedger());
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const storedUser = loadUser();
    if (storedUser) setUser(storedUser);
    setTaxpayer(loadTaxpayer());
    setInvoices(loadInvoices());
    setFilings(loadFilings());
    setCreditLedger(loadCreditLedger());
  }, []);

  function handleLogin(email: string) {
    saveUser(email);
    setUser(email);
    setTaxpayer(loadTaxpayer());
    setInvoices(loadInvoices());
    setFilings(loadFilings());
    setCreditLedger(loadCreditLedger());
    setPage('dashboard');
  }

  function handleLogout() {
    clearAll();
    setUser(null);
    setTaxpayer(null);
    setInvoices([]);
    setFilings([]);
    setCreditLedger({ itcIgst: 0, itcCgst: 0, itcSgst: 0, tds: 0, tcs: 0 });
    setPage('dashboard');
  }

  function handleSaveTaxpayer(t: Taxpayer) {
    saveTaxpayer(t);
    setTaxpayer(t);
  }

  function handleSaveInvoices(inv: Invoice[]) {
    saveInvoices(inv);
    setInvoices(inv);
  }

  function handleSaveFilings(f: FilingRecord[]) {
    saveFilings(f);
    setFilings(f);
  }

  function handleSaveCreditLedger(cl: typeof creditLedger) {
    saveCreditLedger(cl);
    setCreditLedger(cl);
  }

  function handleFilingComplete(filing: FilingRecord) {
    const updated = [...filings, filing];
    handleSaveFilings(updated);
  }

  function handleNavigate(p: Page) {
    if (!taxpayer && p !== 'dashboard' && p !== 'taxpayer-master') return;
    setPage(p);
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            taxpayer={taxpayer}
            invoices={invoices}
            filings={filings}
            onNavigate={handleNavigate}
          />
        );
      case 'taxpayer-master':
        return (
          <TaxpayerMaster
            taxpayer={taxpayer}
            onSave={handleSaveTaxpayer}
          />
        );
      case 'gstr1':
        if (!taxpayer) return <NotRegistered onNavigate={handleNavigate} />;
        return (
          <GSTR1
            taxpayer={taxpayer}
            invoices={invoices}
            onSave={handleSaveInvoices}
          />
        );
      case 'gstr3b':
        if (!taxpayer) return <NotRegistered onNavigate={handleNavigate} />;
        return (
          <GSTR3B
            taxpayer={taxpayer}
            invoices={invoices}
            creditLedger={creditLedger}
          />
        );
      case 'credit-ledger':
        if (!taxpayer) return <NotRegistered onNavigate={handleNavigate} />;
        return (
          <CreditLedger
            creditLedger={creditLedger}
            onSave={handleSaveCreditLedger}
          />
        );
      case 'filing-payment':
        if (!taxpayer) return <NotRegistered onNavigate={handleNavigate} />;
        return (
          <FilingPayment
            taxpayer={taxpayer}
            invoices={invoices}
            filings={filings}
            creditLedger={creditLedger}
            onFilingComplete={handleFilingComplete}
          />
        );
      case 'compliance':
        if (!taxpayer) return <NotRegistered onNavigate={handleNavigate} />;
        return (
          <ComplianceInsights
            taxpayer={taxpayer}
            invoices={invoices}
            filings={filings}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <Header user={user} taxpayer={taxpayer} onLogout={handleLogout} />

      <div className="flex flex-1">
        <Sidebar
          current={page}
          onNavigate={handleNavigate}
          hasTaxpayer={!!taxpayer}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      <footer className="bg-[#0f4c81] text-white text-xs text-center py-2.5">
        © 2024 Goods and Services Tax Network (GSTN) | Smart Compliance Simulator | For Educational Use Only
      </footer>
    </div>
  );
}

function NotRegistered({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-64 text-center">
      <div className="text-amber-500 mb-3">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-2">Taxpayer Not Registered</h2>
      <p className="text-gray-500 text-sm mb-4">Please complete Taxpayer Master registration first.</p>
      <button
        onClick={() => onNavigate('taxpayer-master')}
        className="bg-[#0f766e] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-[#0d6560] transition-colors"
      >
        Go to Taxpayer Master
      </button>
    </div>
  );
}
