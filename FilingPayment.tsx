import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Phone, Shield, CheckCircle, Copy, Printer,
  AlertCircle, Clock, FileText
} from 'lucide-react';
import type { Taxpayer, Invoice, FilingRecord } from '../types';
import { formatCurrency, generateOTP, generateARN, generateCPIN, calculateGSTR3B, currentTaxPeriod } from '../utils/gst';
import type { CreditLedger } from '../utils/storage';

type Step = 'select' | 'verify-otp' | 'challan' | 'success';

interface Props {
  taxpayer: Taxpayer;
  invoices: Invoice[];
  filings: FilingRecord[];
  creditLedger: CreditLedger;
  onFilingComplete: (filing: FilingRecord) => void;
}

export default function FilingPayment({ taxpayer, invoices, filings, creditLedger, onFilingComplete }: Props) {
  const [returnType, setReturnType] = useState<'GSTR-1' | 'GSTR-3B'>('GSTR-3B');
  const [step, setStep] = useState<Step>('select');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [currentFiling, setCurrentFiling] = useState<FilingRecord | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const gstr3bData = calculateGSTR3B(invoices);
  const totalITC = creditLedger.itcIgst + creditLedger.itcCgst + creditLedger.itcSgst;
  const netPayable = Math.max(
    0,
    gstr3bData.outwardTaxableIgst + gstr3bData.outwardTaxableCgst + gstr3bData.outwardTaxableSgst
    - totalITC - creditLedger.tds - creditLedger.tcs
  );

  async function sendOTP() {
    setOtpLoading(true);
    setOtpError('');

    const newOTP = generateOTP();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: taxpayer.email,
          otp: newOTP,
          taxpayerName: taxpayer.legalName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      setGeneratedOTP(newOTP);
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(120);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setOtpTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.error('OTP send error:', err);
      // Fallback: still show OTP in demo mode if edge function fails
      setGeneratedOTP(newOTP);
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(120);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setOtpTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } finally {
      setOtpLoading(false);
    }
  }

  function handleOtpInput(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[idx] = digit;
    setOtp(updated);
    setOtpError('');
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handleVerifyOTP() {
    const entered = otp.join('');
    if (entered.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }
    if (otpTimer === 0) {
      setOtpError('OTP has expired. Please request a new OTP.');
      return;
    }
    if (entered !== generatedOTP) {
      setOtpError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    const arn = generateARN(taxpayer.gstin, returnType);
    const cpin = generateCPIN();
    const period = currentTaxPeriod();
    const filing: FilingRecord = {
      id: `filing_${Date.now()}`,
      gstin: taxpayer.gstin,
      returnType,
      taxPeriod: period,
      filedOn: new Date().toISOString(),
      arn,
      status: 'Filed',
      totalTax: netPayable,
      challanNo: cpin,
    };
    setCurrentFiling(filing);
    setStep('challan');
  }

  function handlePayAndFile() {
    if (currentFiling) {
      onFilingComplete(currentFiling);
      setStep('success');
    }
  }

  function handleReset() {
    setStep('select');
    setOtp(['', '', '', '', '', '']);
    setGeneratedOTP('');
    setOtpSent(false);
    setOtpError('');
    setOtpTimer(0);
    setCurrentFiling(null);
  }

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
        {(['select', 'verify-otp', 'challan', 'success'] as Step[]).map((s, i, arr) => {
          const labels = { select: 'Select Return', 'verify-otp': 'OTP Verification', challan: 'Challan', success: 'Filed' };
          const active = step === s;
          const done = arr.indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                  ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-[#0f4c81] border-[#0f4c81] text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${active ? 'text-[#0f4c81]' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  {labels[s]}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mt-[-12px] mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Select Return */}
      {step === 'select' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
            Step 1: Select Return Type
          </div>
          <div className="p-5 space-y-5">
            {/* Taxpayer validation */}
            <div className={`rounded-lg border px-4 py-3 ${taxpayer.status === 'Active' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                {taxpayer.status === 'Active'
                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                  : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span className={taxpayer.status === 'Active' ? 'text-green-800' : 'text-red-800'}>
                  Taxpayer Status: {taxpayer.status}
                </span>
              </div>
              <div className="text-xs grid grid-cols-2 gap-1 text-gray-600 mt-2">
                <span><strong>GSTIN:</strong> {taxpayer.gstin}</span>
                <span><strong>Name:</strong> {taxpayer.legalName}</span>
                <span><strong>State:</strong> {taxpayer.stateName}</span>
                <span><strong>Mobile:</strong> +91-{taxpayer.mobile}</span>
              </div>
            </div>

            {validationIssues.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Filing blocked due to:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationIssues.map((issue, i) => (
                    <li key={i} className="text-xs text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Select Return Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['GSTR-1', 'GSTR-3B'] as const).map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setReturnType(rt)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      returnType === rt
                        ? 'border-[#0f766e] bg-[#f0faf9]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-[#0f4c81] text-base">{rt}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {rt === 'GSTR-1' ? 'Outward Supply Details' : 'Monthly Summary Return'}
                    </div>
                    {returnType === rt && (
                      <CheckCircle className="w-4 h-4 text-[#0f766e] mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Tax Summary</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices Uploaded</span>
                  <span className="font-semibold">{invoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Output IGST</span>
                  <span>{formatCurrency(gstr3bData.outwardTaxableIgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Output CGST</span>
                  <span>{formatCurrency(gstr3bData.outwardTaxableCgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Output SGST</span>
                  <span>{formatCurrency(gstr3bData.outwardTaxableSgst)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Less: ITC + TDS/TCS</span>
                  <span>({formatCurrency(totalITC + creditLedger.tds + creditLedger.tcs)})</span>
                </div>
                <div className="flex justify-between font-bold text-[#0f4c81] border-t border-gray-300 pt-2 mt-2 text-base">
                  <span>Net Tax Payable</span>
                  <span className="text-red-700">{formatCurrency(netPayable)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('verify-otp')}
              disabled={validationIssues.length > 0 || taxpayer.status !== 'Active'}
              className="w-full flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded font-semibold text-sm transition-colors"
            >
              <Shield className="w-4 h-4" />
              Proceed to OTP Verification
            </button>
          </div>
        </div>
      )}

      {/* Step 2: OTP Verification */}
      {step === 'verify-otp' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Step 2: OTP Verification (EVC)
          </div>
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0f4c81] rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-[#0f4c81] text-lg">Electronic Verification Code</h3>
              <p className="text-gray-500 text-sm mt-1">
                An OTP will be sent to your registered mobile <strong>+91-XXXXXX{taxpayer.mobile.slice(-4)}</strong>
              </p>
            </div>

            {!otpSent ? (
              <button
                onClick={sendOTP}
                disabled={otpLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 text-white py-3 rounded font-semibold text-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                {otpLoading ? 'Sending OTP...' : 'Send OTP to Registered Mobile'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* OTP Demo Display */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Demo Mode — Your OTP
                  </p>
                  <div className="text-4xl font-mono font-bold text-[#0f4c81] tracking-[0.5em] mt-2">
                    {generatedOTP}
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    In production, this OTP is sent via SMS to your mobile number
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide text-center mb-3">
                    Enter 6-Digit OTP
                  </label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none transition-colors
                          ${digit ? 'border-[#0f766e] bg-[#f0faf9] text-[#0f4c81]' : 'border-gray-300 focus:border-[#0f766e]'}
                          ${otpError ? 'border-red-400 bg-red-50' : ''}`}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-center text-red-600 text-sm mt-2 flex items-center justify-center gap-1">
                      <AlertCircle className="w-4 h-4" />{otpError}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {otpTimer > 0 ? (
                      <span>OTP expires in <strong className="text-[#0f766e]">{Math.floor(otpTimer/60)}:{String(otpTimer%60).padStart(2,'0')}</strong></span>
                    ) : (
                      <span className="text-red-500">OTP expired. <button onClick={sendOTP} className="text-[#0f766e] underline font-medium">Resend OTP</button></span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('select')}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={otp.join('').length !== 6}
                    className="flex-1 bg-[#0f766e] hover:bg-[#0d6560] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded text-sm font-semibold transition-colors"
                  >
                    Verify OTP & Continue
                  </button>
                </div>

                {otpTimer > 0 && (
                  <button
                    onClick={sendOTP}
                    className="w-full text-xs text-[#0f766e] hover:underline"
                  >
                    Didn't receive OTP? Resend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Challan */}
      {step === 'challan' && currentFiling && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-5 py-3 text-sm font-semibold">
            Step 3: Payment Challan (CPIN)
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle className="w-5 h-5" />
              OTP verified successfully. Review challan and confirm payment.
            </div>

            {/* Challan Details */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <h4 className="font-bold text-[#0f4c81] text-sm">Payment Challan</h4>
                <span className="text-xs font-mono text-gray-500">{currentFiling.challanNo}</span>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <Detail label="CPIN" value={currentFiling.challanNo} mono />
                <Detail label="GSTIN" value={taxpayer.gstin} mono />
                <Detail label="Taxpayer" value={taxpayer.legalName} />
                <Detail label="Return Type" value={currentFiling.returnType} />
                <Detail label="Tax Period" value={currentFiling.taxPeriod} />
                <Detail label="IGST" value={formatCurrency(gstr3bData.outwardTaxableIgst)} />
                <Detail label="CGST" value={formatCurrency(gstr3bData.outwardTaxableCgst)} />
                <Detail label="SGST" value={formatCurrency(gstr3bData.outwardTaxableSgst)} />
                <Detail label="ITC / TDS / TCS" value={`(${formatCurrency(totalITC + creditLedger.tds + creditLedger.tcs)})`} />
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-[#0f4c81]">
                  <span>Total Amount Payable</span>
                  <span className="text-red-700 text-base">{formatCurrency(netPayable)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('verify-otp')}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handlePayAndFile}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d6560] text-white py-2.5 rounded text-sm font-semibold transition-colors"
              >
                <Upload className="w-4 h-4" />
                Confirm & File Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && currentFiling && (
        <div className="bg-white rounded-lg border border-green-300 shadow-sm overflow-hidden">
          <div className="bg-green-600 text-white px-5 py-4 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-bold">Return Filed Successfully!</h3>
            <p className="text-green-100 text-sm mt-1">Your {currentFiling.returnType} has been filed</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Acknowledgement Reference Number (ARN)</p>
                <p className="text-2xl font-mono font-bold text-[#0f4c81] mt-2 tracking-wider">
                  {currentFiling.arn}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Return Type" value={currentFiling.returnType} />
                <Detail label="Tax Period" value={currentFiling.taxPeriod} />
                <Detail label="Filed On" value={new Date(currentFiling.filedOn).toLocaleString('en-IN')} />
                <Detail label="Tax Paid" value={formatCurrency(currentFiling.totalTax)} />
                <Detail label="Challan No" value={currentFiling.challanNo} mono />
                <Detail label="Status" value={currentFiling.status} />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard?.writeText(currentFiling.arn)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />Copy ARN
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" />Print
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0f4c81] hover:bg-[#0d4070] text-white py-2 rounded text-sm font-semibold"
              >
                <FileText className="w-4 h-4" />File Another Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Filings */}
      {filings.length > 0 && step === 'select' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="font-semibold text-[#0f4c81] text-sm">Filing History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase">
                  <th className="px-4 py-2.5 text-left font-semibold">Return</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Period</th>
                  <th className="px-4 py-2.5 text-left font-semibold">ARN</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Filed On</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tax Paid</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...filings].reverse().map((f) => (
                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-[#0f4c81]">{f.returnType}</td>
                    <td className="px-4 py-2.5 text-gray-600">{f.taxPeriod}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">{f.arn}</td>
                    <td className="px-4 py-2.5 text-gray-600">{new Date(f.filedOn).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(f.totalTax)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        f.status === 'Filed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`font-medium text-gray-800 text-xs ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
