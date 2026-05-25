import { FileText, Upload, TrendingUp, AlertCircle, CheckCircle, Clock, IndianRupee } from 'lucide-react';
import type { Taxpayer, Invoice, FilingRecord } from '../types';
import type { Page } from '../types';
import { formatCurrency, calculateComplianceScore } from '../utils/gst';

interface Props {
  taxpayer: Taxpayer | null;
  invoices: Invoice[];
  filings: FilingRecord[];
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ taxpayer, invoices, filings, onNavigate }: Props) {
  const totalOutput = invoices.reduce((s, i) => s + i.totalTax, 0);
  const totalTaxable = invoices.reduce((s, i) => s + i.taxableValue, 0);
  const { score, issues } = calculateComplianceScore(filings, invoices);

  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg =
    score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="p-6 space-y-6">
      {/* Welcome / Taxpayer Banner */}
      {taxpayer ? (
        <div className="bg-gradient-to-r from-[#0f4c81] to-[#0f766e] text-white rounded-lg p-5 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{taxpayer.legalName}</h2>
              {taxpayer.tradeName && (
                <p className="text-blue-200 text-sm">{taxpayer.tradeName}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><span className="text-blue-300">GSTIN:</span> <strong>{taxpayer.gstin}</strong></span>
                <span><span className="text-blue-300">PAN:</span> <strong>{taxpayer.pan}</strong></span>
                <span><span className="text-blue-300">State:</span> <strong>{taxpayer.stateName}</strong></span>
              </div>
            </div>
            <div className={`bg-white/10 rounded-lg px-4 py-2 text-center`}>
              <div className={`text-2xl font-bold ${score >= 80 ? 'text-green-300' : score >= 60 ? 'text-yellow-300' : 'text-red-300'}`}>
                {score}
              </div>
              <div className="text-xs text-blue-200">Compliance Score</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Taxpayer not registered</p>
            <p className="text-amber-700 text-sm mt-1">
              Please complete your Taxpayer Master registration before accessing GST filing services.
            </p>
            <button
              onClick={() => onNavigate('taxpayer-master')}
              className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              Register Taxpayer
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={String(invoices.length)}
          sub="GSTR-1 entries"
          icon={<FileText className="w-5 h-5 text-[#0f4c81]" />}
          color="blue"
        />
        <StatCard
          label="Taxable Turnover"
          value={formatCurrency(totalTaxable)}
          sub="This period"
          icon={<IndianRupee className="w-5 h-5 text-[#0f766e]" />}
          color="teal"
        />
        <StatCard
          label="Output Tax"
          value={formatCurrency(totalOutput)}
          sub="CGST+SGST+IGST"
          icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
          color="orange"
        />
        <StatCard
          label="Returns Filed"
          value={String(filings.filter((f) => f.status === 'Filed').length)}
          sub={`${filings.length} total`}
          icon={<Upload className="w-5 h-5 text-green-600" />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Filings */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-[#0f4c81] text-sm">Recent Filings</h3>
            <button onClick={() => onNavigate('filing-payment')} className="text-xs text-[#0f766e] hover:underline">
              View All
            </button>
          </div>
          {filings.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No filings yet</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <th className="px-4 py-2 text-left">Return</th>
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-left">ARN</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filings.slice(-5).reverse().map((f) => (
                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-[#0f4c81]">{f.returnType}</td>
                    <td className="px-4 py-2 text-gray-600">{f.taxPeriod}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono">{f.arn.slice(0, 12)}…</td>
                    <td className="px-4 py-2 text-right">
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Compliance Issues */}
        <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${scoreBg}`}>
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-[#0f4c81] text-sm">Compliance Overview</h3>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}/100</span>
          </div>
          <div className="p-4">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>All compliance checks passed</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-[#0f4c81] text-sm mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Add Invoice (GSTR-1)', page: 'gstr1' as Page },
            { label: 'View GSTR-3B', page: 'gstr3b' as Page },
            { label: 'File Return', page: 'filing-payment' as Page },
            { label: 'Smart Insights', page: 'compliance' as Page },
          ].map((a) => (
            <button
              key={a.page}
              onClick={() => onNavigate(a.page)}
              disabled={!taxpayer}
              className="text-sm bg-[#0f4c81] hover:bg-[#0d4070] text-white px-4 py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: 'blue' | 'teal' | 'orange' | 'green';
}) {
  const borders = { blue: 'border-[#0f4c81]', teal: 'border-[#0f766e]', orange: 'border-orange-400', green: 'border-green-500' };
  return (
    <div className={`bg-white rounded-lg border-l-4 ${borders[color]} border border-gray-200 p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-lg font-bold text-gray-800 mt-1 truncate">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <div className="flex-shrink-0 ml-2">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Filed: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Late: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status === 'Filed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {status}
    </span>
  );
}
