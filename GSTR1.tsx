import React, { useState } from 'react';
import { PlusCircle, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import type { Invoice, Taxpayer } from '../types';
import { formatCurrency } from '../utils/gst';

interface Props {
  taxpayer: Taxpayer;
  invoices: Invoice[];
  onSave: (invoices: Invoice[]) => void;
}

const blankInvoice = (): Omit<Invoice, 'id'> => ({
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  buyerGstin: '',
  buyerName: '',
  taxableValue: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  totalTax: 0,
  invoiceValue: 0,
  supplyType: 'B2B',
  isInterState: false,
});

export default function GSTR1({ taxpayer, invoices, onSave }: Props) {
  const [form, setForm] = useState(blankInvoice());
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function computeTax(taxableValue: number, rate: number, isInterState: boolean) {
    const totalTax = (taxableValue * rate) / 100;
    if (isInterState) {
      return { igst: totalTax, cgst: 0, sgst: 0, totalTax, invoiceValue: taxableValue + totalTax };
    }
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
    if (!form.invoiceNo || !form.buyerName || form.taxableValue <= 0) {
      setError('Invoice No, Buyer Name, and Taxable Value are required.');
      return;
    }

    const dup = invoices.find((i) => i.invoiceNo === form.invoiceNo && i.id !== editId);
    if (dup) {
      setError('Duplicate invoice number detected.');
      return;
    }

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

  function handleEdit(inv: Invoice) {
    setForm({ ...inv });
    setEditId(inv.id);
    setSaved(false);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this invoice?')) {
      onSave(invoices.filter((i) => i.id !== id));
    }
  }

  const totals = invoices.reduce(
    (acc, inv) => ({
      taxable: acc.taxable + inv.taxableValue,
      igst: acc.igst + inv.igst,
      cgst: acc.cgst + inv.cgst,
      sgst: acc.sgst + inv.sgst,
      total: acc.total + inv.invoiceValue,
    }),
    { taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }
  );

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">GSTR-1 — Outward Supply Details</h1>
          <p className="text-sm text-gray-500">Details of outward supplies of goods or services</p>
        </div>
      </div>

      {/* Taxpayer banner */}
      <div className="bg-[#f0f8ff] border border-blue-200 rounded px-4 py-2 text-xs text-gray-700 flex gap-4 flex-wrap">
        <span><strong>GSTIN:</strong> {taxpayer.gstin}</span>
        <span><strong>Name:</strong> {taxpayer.legalName}</span>
        <span><strong>GST Rate:</strong> {taxpayer.gstRate}%</span>
      </div>

      {/* Add Invoice Form */}
      <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
          {editId ? 'Edit Invoice' : 'Add Invoice — B2B / B2C / Export'}
        </div>
        <div className="p-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded mb-4">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          {saved && !editId && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 text-sm px-3 py-2 rounded mb-4">
              <CheckCircle className="w-4 h-4" /> Invoice saved successfully.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Invoice No <span className="text-red-500">*</span></label>
              <input
                value={form.invoiceNo}
                onChange={(e) => handleChange('invoiceNo', e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="INV/2024/001"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Invoice Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => handleChange('invoiceDate', e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Supply Type</label>
              <select
                value={form.supplyType}
                onChange={(e) => handleChange('supplyType', e.target.value)}
                className={inputCls}
              >
                <option value="B2B">B2B (Registered Buyer)</option>
                <option value="B2C">B2C (Unregistered / Consumer)</option>
                <option value="EXPORT">Export</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Buyer GSTIN</label>
              <input
                value={form.buyerGstin}
                onChange={(e) => handleChange('buyerGstin', e.target.value.toUpperCase())}
                className={`${inputCls} font-mono`}
                placeholder="27AAPFU0939F1ZV or URP"
                maxLength={15}
              />
            </div>
            <div>
              <label className={labelCls}>Buyer Name <span className="text-red-500">*</span></label>
              <input
                value={form.buyerName}
                onChange={(e) => handleChange('buyerName', e.target.value)}
                className={inputCls}
                placeholder="Buyer / Customer name"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Supply Nature</label>
              <select
                value={form.isInterState ? 'inter' : 'intra'}
                onChange={(e) => handleChange('isInterState', e.target.value === 'inter')}
                className={inputCls}
              >
                <option value="intra">Intra-State (CGST + SGST)</option>
                <option value="inter">Inter-State (IGST)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Taxable Value (INR) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.taxableValue || ''}
                onChange={(e) => handleChange('taxableValue', Number(e.target.value))}
                className={inputCls}
                placeholder="0.00"
                min={0}
                step={0.01}
                required
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-3">
              {form.isInterState ? (
                <div>
                  <label className={labelCls}>IGST</label>
                  <input value={formatCurrency(form.igst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>CGST</label>
                    <input value={formatCurrency(form.cgst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} />
                  </div>
                  <div>
                    <label className={labelCls}>SGST</label>
                    <input value={formatCurrency(form.sgst)} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Invoice Value</label>
                <input value={formatCurrency(form.invoiceValue)} readOnly className={`${inputCls} bg-blue-50 text-[#0f4c81] font-semibold`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white px-5 py-2 rounded text-sm font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {editId ? 'Update Invoice' : 'Add Invoice'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => { setEditId(null); setForm(blankInvoice()); }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-[#0f4c81] text-sm">
            Invoice Register ({invoices.length} invoices)
          </h3>
          <span className="text-xs text-gray-500">Tax Period: {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No invoices added yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0f4c81] text-white">
                  {['Invoice No', 'Date', 'Buyer Name', 'GSTIN', 'Type', 'Taxable Amt', 'IGST', 'CGST', 'SGST', 'Total', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} className={`border-t border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-2 font-semibold text-[#0f4c81]">{inv.invoiceNo}</td>
                    <td className="px-3 py-2 text-gray-600">{inv.invoiceDate}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[120px] truncate">{inv.buyerName}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{inv.buyerGstin || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        inv.supplyType === 'B2B' ? 'bg-blue-100 text-blue-700' :
                        inv.supplyType === 'EXPORT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>{inv.supplyType}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.taxableValue)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(inv.igst)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.cgst)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.sgst)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(inv.invoiceValue)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(inv)}
                          className="text-[#0f766e] hover:underline text-xs"
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-red-500 hover:text-red-700"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0f4c81] text-white font-semibold text-xs">
                  <td colSpan={5} className="px-3 py-2.5">TOTAL</td>
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

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]';
const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';
