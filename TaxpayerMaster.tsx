import React, { useState } from 'react';
import {
  UserCheck, Search, CheckCircle, XCircle, AlertCircle, Building2, Phone, Mail, MapPin
} from 'lucide-react';
import type { Taxpayer } from '../types';
import { validateGSTIN, extractGSTINInfo, STATE_CODES } from '../utils/gst';

const BUSINESS_TYPES = [
  'Private Limited Company', 'Public Limited Company', 'Partnership Firm',
  'Proprietorship', 'LLP', 'Trust', 'Society', 'Government Entity', 'Other',
];

const GST_RATES = [0, 5, 12, 18, 28];

interface Props {
  taxpayer: Taxpayer | null;
  onSave: (t: Taxpayer) => void;
}

export default function TaxpayerMaster({ taxpayer, onSave }: Props) {
  const [gstin, setGstin] = useState(taxpayer?.gstin || '');
  const [gstinValidation, setGstinValidation] = useState<{ valid: boolean; error?: string } | null>(
    taxpayer ? { valid: true } : null
  );
  const [form, setForm] = useState<Partial<Taxpayer>>(taxpayer || {
    status: 'Active',
    businessType: 'Private Limited Company',
    gstRate: 18,
    annualTurnover: 0,
  });
  const [saved, setSaved] = useState(!!taxpayer);
  const [showForm, setShowForm] = useState(!!taxpayer);

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
      setForm((prev) => ({
        ...prev,
        gstin,
        stateCode: info.stateCode,
        stateName: info.stateName,
        pan: info.pan,
      }));
      setShowForm(true);
    }
  }

  function handleChange(field: keyof Taxpayer, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.legalName || !form.mobile || !form.email) {
      alert('Please fill all required fields.');
      return;
    }
    const taxpayerData: Taxpayer = {
      gstin: form.gstin!,
      legalName: form.legalName!,
      tradeName: form.tradeName || '',
      pan: form.pan!,
      stateCode: form.stateCode!,
      stateName: form.stateName!,
      registrationDate: form.registrationDate || new Date().toISOString().split('T')[0],
      businessType: form.businessType || 'Private Limited Company',
      status: form.status || 'Active',
      email: form.email!,
      mobile: form.mobile!,
      address: form.address || '',
      annualTurnover: Number(form.annualTurnover) || 0,
      gstRate: Number(form.gstRate) || 18,
    };
    onSave(taxpayerData);
    setSaved(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <UserCheck className="w-6 h-6 text-[#0f4c81]" />
        <div>
          <h1 className="text-xl font-bold text-[#0f4c81]">Taxpayer Master</h1>
          <p className="text-sm text-gray-500">Register and validate your GSTIN before filing</p>
        </div>
      </div>

      {/* GSTIN Validation Panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
          Step 1: GSTIN Validation
        </div>
        <div className="p-5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Enter GSTIN <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <input
              value={gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              maxLength={15}
              className="flex-1 border border-gray-300 rounded px-3 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
              placeholder="e.g. 27AAPFU0939F1ZV"
            />
            <button
              onClick={handleValidate}
              disabled={gstin.length !== 15}
              className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded text-sm font-semibold transition-colors"
            >
              <Search className="w-4 h-4" />
              Validate
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Format: 2-digit state code + PAN + entity type + Z + check digit (15 chars total)
          </p>

          {gstinValidation && (
            <div className={`mt-3 flex items-start gap-2 rounded px-4 py-3 text-sm font-medium
              ${gstinValidation.valid ? 'bg-green-50 border border-green-300 text-green-800' : 'bg-red-50 border border-red-300 text-red-800'}`}>
              {gstinValidation.valid
                ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
                : <XCircle className="w-5 h-5 flex-shrink-0" />}
              {gstinValidation.valid
                ? `GSTIN validated successfully! State: ${form.stateName} | PAN: ${form.pan}`
                : gstinValidation.error}
            </div>
          )}

          {gstinValidation?.valid && (
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <InfoChip label="State Code" value={form.stateCode || ''} />
              <InfoChip label="State" value={form.stateName || ''} />
              <InfoChip label="PAN" value={form.pan || ''} />
            </div>
          )}
        </div>
      </div>

      {/* Registration Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
            Step 2: Taxpayer Details
          </div>

          <div className="p-5 space-y-5">
            {saved && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded text-sm">
                <CheckCircle className="w-5 h-5" />
                Taxpayer registered successfully. You can now access all GST filing services.
              </div>
            )}

            {/* Business Info */}
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200">
                <Building2 className="w-4 h-4" /> Business Information
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Legal Name of Business" required>
                  <input
                    value={form.legalName || ''}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                    className={inputCls}
                    placeholder="As per PAN / Certificate"
                    required
                  />
                </FormField>
                <FormField label="Trade Name (if different)">
                  <input
                    value={form.tradeName || ''}
                    onChange={(e) => handleChange('tradeName', e.target.value)}
                    className={inputCls}
                    placeholder="DBA / Trade name"
                  />
                </FormField>
                <FormField label="Business Type" required>
                  <select
                    value={form.businessType || ''}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className={inputCls}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Registration Date" required>
                  <input
                    type="date"
                    value={form.registrationDate || ''}
                    onChange={(e) => handleChange('registrationDate', e.target.value)}
                    className={inputCls}
                    required
                  />
                </FormField>
                <FormField label="Annual Turnover (INR)">
                  <input
                    type="number"
                    value={form.annualTurnover || ''}
                    onChange={(e) => handleChange('annualTurnover', Number(e.target.value))}
                    className={inputCls}
                    placeholder="0"
                    min={0}
                  />
                </FormField>
                <FormField label="Applicable GST Rate (%)">
                  <select
                    value={form.gstRate || 18}
                    onChange={(e) => handleChange('gstRate', Number(e.target.value))}
                    className={inputCls}
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Registration Status">
                  <select
                    value={form.status || 'Active'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className={inputCls}
                  >
                    <option value="Active">Active</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </FormField>
              </div>
            </fieldset>

            {/* Contact Info */}
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-bold text-[#0f4c81] uppercase tracking-wider mb-3 pb-1 border-b border-gray-200">
                <Phone className="w-4 h-4" /> Contact Information
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Mobile Number" required>
                  <div className="flex">
                    <span className="bg-gray-100 border border-r-0 border-gray-300 px-3 py-2.5 text-sm text-gray-600 rounded-l">+91</span>
                    <input
                      type="tel"
                      value={form.mobile || ''}
                      onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`${inputCls} rounded-l-none`}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>
                </FormField>
                <FormField label="Email Address" required>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`${inputCls} pl-9`}
                      placeholder="registered@email.com"
                      required
                    />
                  </div>
                </FormField>
                <FormField label="Registered Address" className="md:col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      value={form.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={`${inputCls} pl-9 resize-none`}
                      rows={2}
                      placeholder="Complete business address"
                    />
                  </div>
                </FormField>
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setGstinValidation(null); setGstin(''); }}
                className="px-5 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#0f766e] hover:bg-[#0d6560] text-white rounded text-sm font-semibold transition-colors"
              >
                Save Taxpayer Details
              </button>
            </div>
          </div>
        </form>
      )}

      {!showForm && !gstinValidation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-sm text-blue-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Enter your 15-character GSTIN above and click <strong>Validate</strong> to proceed with registration.</p>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]';

function FormField({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className="text-gray-800 font-semibold font-mono mt-0.5">{value}</div>
    </div>
  );
}
