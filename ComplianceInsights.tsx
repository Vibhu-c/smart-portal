import { TrendingUp, CheckCircle, AlertCircle, XCircle, Award, BarChart2, FileCheck } from 'lucide-react';
import type { Taxpayer, Invoice, FilingRecord } from '../types';
import { formatCurrency, calculateComplianceScore } from '../utils/gst';

interface Props {
  taxpayer: Taxpayer;
  invoices: Invoice[];
  filings: FilingRecord[];
}

export default function ComplianceInsights({ taxpayer, invoices, filings }: Props) {
  const { score, issues } = calculateComplianceScore(filings, invoices);

  const totalOutput = invoices.reduce((s, i) => s + i.totalTax, 0);
  const totalTaxable = invoices.reduce((s, i) => s + i.taxableValue, 0);
  const b2bCount = invoices.filter((i) => i.supplyType === 'B2B').length;
  const b2cCount = invoices.filter((i) => i.supplyType === 'B2C').length;
  const exportCount = invoices.filter((i) => i.supplyType === 'EXPORT').length;
  const missingGstin = invoices.filter((i) => i.supplyType === 'B2B' && (!i.buyerGstin || i.buyerGstin === 'URP')).length;
  const interState = invoices.filter((i) => i.isInterState).length;
  const intraState = invoices.filter((i) => !i.isInterState).length;

  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  const checks = [
    { label: 'GSTIN Active', pass: taxpayer.status === 'Active' },
    { label: 'Invoices Uploaded', pass: invoices.length > 0 },
    { label: 'Returns Filed', pass: filings.length > 0 },
    { label: 'No Late Filings', pass: filings.filter((f) => f.status === 'Late').length === 0 },
    { label: 'B2B GSTINs Complete', pass: missingGstin === 0 },
    { label: 'Tax Liability Declared', pass: totalOutput > 0 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">Smart Compliance Insights</h1>
          <p className="text-sm text-gray-500">AI-powered compliance analysis and recommendations</p>
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#0f766e] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">Overall Compliance Score</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-6xl font-black" style={{ color: score >= 80 ? '#86efac' : score >= 60 ? '#fde68a' : '#fca5a5' }}>
                {score}
              </span>
              <span className="text-blue-200 text-2xl mb-2">/100</span>
            </div>
            <p className="text-lg font-semibold mt-1" style={{ color: score >= 80 ? '#86efac' : score >= 60 ? '#fde68a' : '#fca5a5' }}>
              {scoreLabel}
            </p>
          </div>
          <div className="w-32 h-32 relative flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke={scoreColor}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 314} 314`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <Award className="w-8 h-8 mx-auto text-white" />
            </div>
          </div>
        </div>

        <div className="mt-4 w-full bg-white/20 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Checks */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-semibold text-[#0f4c81] text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4" /> Compliance Checklist
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {checks.map((c, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${c.pass ? 'bg-green-50' : 'bg-red-50'}`}>
                {c.pass
                  ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                <span className={`text-sm font-medium ${c.pass ? 'text-green-800' : 'text-red-700'}`}>{c.label}</span>
                <span className={`ml-auto text-xs font-bold ${c.pass ? 'text-green-600' : 'text-red-500'}`}>
                  {c.pass ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-semibold text-[#0f4c81] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Issues & Recommendations
            </h3>
          </div>
          <div className="p-4">
            {issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-green-700 font-semibold">All checks passed!</p>
                <p className="text-gray-400 text-sm mt-1">No compliance issues detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">{issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
          <h3 className="font-semibold text-[#0f4c81] text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Supply Analytics
          </h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Invoices" value={String(invoices.length)} color="blue" />
          <MetricCard label="B2B Invoices" value={String(b2bCount)} color="teal" />
          <MetricCard label="B2C Invoices" value={String(b2cCount)} color="orange" />
          <MetricCard label="Export Invoices" value={String(exportCount)} color="green" />
          <MetricCard label="Taxable Turnover" value={formatCurrency(totalTaxable)} color="blue" />
          <MetricCard label="Total Output Tax" value={formatCurrency(totalOutput)} color="red" />
          <MetricCard label="Inter-State Supplies" value={String(interState)} color="teal" />
          <MetricCard label="Intra-State Supplies" value={String(intraState)} color="orange" />
        </div>
      </div>

      {/* Taxpayer Profile */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
          <h3 className="font-semibold text-[#0f4c81] text-sm">Taxpayer Profile</h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'GSTIN', value: taxpayer.gstin, mono: true },
            { label: 'Legal Name', value: taxpayer.legalName },
            { label: 'Trade Name', value: taxpayer.tradeName || '—' },
            { label: 'PAN', value: taxpayer.pan, mono: true },
            { label: 'State', value: taxpayer.stateName },
            { label: 'Business Type', value: taxpayer.businessType },
            { label: 'Registration Date', value: taxpayer.registrationDate },
            { label: 'Annual Turnover', value: formatCurrency(taxpayer.annualTurnover) },
            { label: 'GST Rate', value: `${taxpayer.gstRate}%` },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
              <p className={`text-gray-800 font-semibold mt-1 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-[#0f4c81] text-[#0f4c81]',
    teal: 'border-[#0f766e] text-[#0f766e]',
    orange: 'border-orange-500 text-orange-600',
    green: 'border-green-500 text-green-700',
    red: 'border-red-500 text-red-600',
  };
  return (
    <div className={`bg-white border-l-4 ${colors[color] || colors.blue} rounded p-3 shadow-sm`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`font-bold text-base mt-1 ${colors[color]?.split(' ')[1] || ''}`}>{value}</p>
    </div>
  );
}
