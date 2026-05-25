import { BarChart3, RefreshCw } from 'lucide-react';
import type { Taxpayer, Invoice, GSTR3BData } from '../types';
import { formatCurrency, calculateGSTR3B } from '../utils/gst';
import type { CreditLedger } from '../utils/storage';

interface Props {
  taxpayer: Taxpayer;
  invoices: Invoice[];
  creditLedger: CreditLedger;
}

export default function GSTR3B({ taxpayer, invoices, creditLedger }: Props) {
  const data: GSTR3BData = {
    ...calculateGSTR3B(invoices),
    itcIgst: creditLedger.itcIgst,
    itcCgst: creditLedger.itcCgst,
    itcSgst: creditLedger.itcSgst,
    tds: creditLedger.tds,
    tcs: creditLedger.tcs,
    netPayableIgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableIgst - creditLedger.itcIgst),
    netPayableCgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableCgst - creditLedger.itcCgst),
    netPayableSgst: Math.max(0, calculateGSTR3B(invoices).outwardTaxableSgst - creditLedger.itcSgst),
    totalNetPayable:
      Math.max(0, calculateGSTR3B(invoices).outwardTaxableIgst - creditLedger.itcIgst) +
      Math.max(0, calculateGSTR3B(invoices).outwardTaxableCgst - creditLedger.itcCgst) +
      Math.max(0, calculateGSTR3B(invoices).outwardTaxableSgst - creditLedger.itcSgst) -
      creditLedger.tds -
      creditLedger.tcs,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">GSTR-3B — Monthly Summary Return</h1>
          <p className="text-sm text-gray-500">Auto-populated from GSTR-1 invoices and credit ledger</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-[#0f766e]">
          <RefreshCw className="w-3.5 h-3.5" />
          Auto-populated
        </div>
      </div>

      <div className="bg-[#f0f8ff] border border-blue-200 rounded px-4 py-2 text-xs text-gray-700 flex flex-wrap gap-4">
        <span><strong>GSTIN:</strong> {taxpayer.gstin}</span>
        <span><strong>Legal Name:</strong> {taxpayer.legalName}</span>
        <span><strong>Tax Period:</strong> {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Table 3.1 — Outward Supplies */}
      <SectionCard title="3.1 — Details of Outward Supplies and Inward Supplies liable to Reverse Charge">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0f4c81] text-white">
              <th className="px-4 py-2.5 text-left font-medium">Nature of Supplies</th>
              <th className="px-4 py-2.5 text-right font-medium">Total Taxable Value</th>
              <th className="px-4 py-2.5 text-right font-medium">IGST</th>
              <th className="px-4 py-2.5 text-right font-medium">CGST</th>
              <th className="px-4 py-2.5 text-right font-medium">SGST/UTGST</th>
            </tr>
          </thead>
          <tbody>
            <TableRow
              label="(a) Outward taxable supplies (other than zero rated, nil, exempted)"
              taxable={data.outwardTaxableSupplies}
              igst={data.outwardTaxableIgst}
              cgst={data.outwardTaxableCgst}
              sgst={data.outwardTaxableSgst}
            />
            <TableRow label="(b) Outward taxable supplies (zero rated)" taxable={data.zeroRatedSupplies} igst={0} cgst={0} sgst={0} />
            <TableRow label="(c) Other outward supplies (Nil rated, exempted)" taxable={data.nilExemptSupplies} igst={0} cgst={0} sgst={0} />
          </tbody>
        </table>
      </SectionCard>

      {/* Table 4 — ITC */}
      <SectionCard title="4 — Eligible Input Tax Credit">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0f4c81] text-white">
              <th className="px-4 py-2.5 text-left font-medium">Details</th>
              <th className="px-4 py-2.5 text-right font-medium">IGST</th>
              <th className="px-4 py-2.5 text-right font-medium">CGST</th>
              <th className="px-4 py-2.5 text-right font-medium">SGST/UTGST</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-700">(A) ITC Available (whether in full or part)</td>
              <td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcIgst)}</td>
              <td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcCgst)}</td>
              <td className="px-4 py-2.5 text-right text-green-700 font-medium">{formatCurrency(data.itcSgst)}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* Tax Liability Summary */}
      <SectionCard title="5.1 — Payment of Tax">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
              <th className="px-4 py-2.5 text-left font-semibold">Description</th>
              <th className="px-4 py-2.5 text-right font-semibold">IGST</th>
              <th className="px-4 py-2.5 text-right font-semibold">CGST</th>
              <th className="px-4 py-2.5 text-right font-semibold">SGST</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-2.5 text-gray-700">Tax Payable</td>
              <td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableIgst)}</td>
              <td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableCgst)}</td>
              <td className="px-4 py-2.5 text-right">{formatCurrency(data.outwardTaxableSgst)}</td>
              <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(data.outwardTaxableIgst + data.outwardTaxableCgst + data.outwardTaxableSgst)}</td>
            </tr>
            <tr className="border-t border-gray-100 bg-green-50">
              <td className="px-4 py-2.5 text-green-800">Less: ITC Utilized</td>
              <td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcIgst)})</td>
              <td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcCgst)})</td>
              <td className="px-4 py-2.5 text-right text-green-700">({formatCurrency(data.itcSgst)})</td>
              <td className="px-4 py-2.5 text-right text-green-700 font-medium">({formatCurrency(data.itcIgst + data.itcCgst + data.itcSgst)})</td>
            </tr>
            {(data.tds > 0 || data.tcs > 0) && (
              <tr className="border-t border-gray-100 bg-blue-50">
                <td className="px-4 py-2.5 text-blue-800">Less: TDS / TCS</td>
                <td className="px-4 py-2.5 text-right text-blue-700" colSpan={3}>({formatCurrency(data.tds + data.tcs)})</td>
                <td className="px-4 py-2.5 text-right text-blue-700 font-medium">({formatCurrency(data.tds + data.tcs)})</td>
              </tr>
            )}
            <tr className="border-t-2 border-[#0f4c81] bg-[#0f4c81] text-white">
              <td className="px-4 py-3 font-bold">Net Tax Payable</td>
              <td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableIgst)}</td>
              <td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableCgst)}</td>
              <td className="px-4 py-3 text-right font-bold">{formatCurrency(data.netPayableSgst)}</td>
              <td className="px-4 py-3 text-right font-bold text-yellow-300 text-base">{formatCurrency(Math.max(0, data.totalNetPayable))}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
        <strong>Note:</strong> GSTR-3B values are auto-populated from your GSTR-1 invoices and credit ledger entries. Verify before filing.
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-semibold text-[#0f4c81] text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TableRow({ label, taxable, igst, cgst, sgst }: {
  label: string; taxable: number; igst: number; cgst: number; sgst: number;
}) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-2.5 text-gray-700 text-sm">{label}</td>
      <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(taxable)}</td>
      <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(igst)}</td>
      <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(cgst)}</td>
      <td className="px-4 py-2.5 text-right text-sm">{formatCurrency(sgst)}</td>
    </tr>
  );
}
