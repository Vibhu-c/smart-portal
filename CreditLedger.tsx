import React, { useState } from 'react';
import { CreditCard, Save, CheckCircle, Info } from 'lucide-react';
import { formatCurrency } from '../utils/gst';
import type { CreditLedger as CLType } from '../utils/storage';

interface Props {
  creditLedger: CLType;
  onSave: (cl: CLType) => void;
}

export default function CreditLedger({ creditLedger, onSave }: Props) {
  const [form, setForm] = useState<CLType>({ ...creditLedger });
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof CLType, value: string) {
    setForm((prev) => ({ ...prev, [field]: Number(value) || 0 }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setSaved(true);
  }

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
        <div>
          <strong>What is Input Tax Credit?</strong> ITC is the GST paid on your purchases / inward supplies.
          It is used to offset your output tax liability. TDS/TCS credits are from Tax Deducted/Collected at Source.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
          Credit Balances Available
        </div>
        <div className="p-5 space-y-6">
          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded">
              <CheckCircle className="w-4 h-4" /> Credit ledger saved successfully.
            </div>
          )}

          {/* ITC Section */}
          <fieldset>
            <legend className="text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full">
              Input Tax Credit (ITC)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LedgerField
                label="ITC — IGST"
                hint="ITC on inter-state purchases"
                value={form.itcIgst}
                onChange={(v) => handleChange('itcIgst', v)}
              />
              <LedgerField
                label="ITC — CGST"
                hint="ITC on central tax paid"
                value={form.itcCgst}
                onChange={(v) => handleChange('itcCgst', v)}
              />
              <LedgerField
                label="ITC — SGST"
                hint="ITC on state tax paid"
                value={form.itcSgst}
                onChange={(v) => handleChange('itcSgst', v)}
              />
            </div>
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-4 py-2">
              Total ITC Available: <strong className="text-green-700">{formatCurrency(totalITC)}</strong>
            </div>
          </fieldset>

          {/* TDS/TCS Section */}
          <fieldset>
            <legend className="text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 w-full">
              TDS / TCS Credits
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LedgerField
                label="TDS (Tax Deducted at Source)"
                hint="GST TDS by deductor"
                value={form.tds}
                onChange={(v) => handleChange('tds', v)}
              />
              <LedgerField
                label="TCS (Tax Collected at Source)"
                hint="GST TCS by e-commerce operator"
                value={form.tcs}
                onChange={(v) => handleChange('tcs', v)}
              />
            </div>
          </fieldset>

          {/* Summary */}
          <div className="rounded-lg border border-[#0f4c81] overflow-hidden">
            <div className="bg-[#0f4c81] text-white px-4 py-2.5 text-sm font-semibold">
              Credit Summary
            </div>
            <table className="w-full text-sm">
              <tbody>
                <SummaryRow label="ITC — IGST" value={form.itcIgst} color="green" />
                <SummaryRow label="ITC — CGST" value={form.itcCgst} color="green" />
                <SummaryRow label="ITC — SGST" value={form.itcSgst} color="green" />
                <SummaryRow label="TDS Credits" value={form.tds} color="blue" />
                <SummaryRow label="TCS Credits" value={form.tcs} color="blue" />
                <tr className="bg-[#0f4c81] text-white">
                  <td className="px-4 py-3 font-bold">Total Credits Available</td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-300">{formatCurrency(totalCredits)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white px-6 py-2.5 rounded text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Credit Ledger
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function LedgerField({ label, hint, value, onChange }: {
  label: string; hint: string; value: number; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
        placeholder="0.00"
        min={0}
        step={0.01}
      />
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: 'green' | 'blue' }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-2.5 text-gray-700 text-sm">{label}</td>
      <td className={`px-4 py-2.5 text-right text-sm font-medium ${color === 'green' ? 'text-green-700' : 'text-blue-700'}`}>
        {formatCurrency(value)}
      </td>
    </tr>
  );
}
