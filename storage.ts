import type { Taxpayer, Invoice, FilingRecord } from '../types';

const KEYS = {
  taxpayer: 'gst_taxpayer',
  invoices: 'gst_invoices',
  filings: 'gst_filings',
  user: 'gst_user',
  creditLedger: 'gst_credit_ledger',
};

export function saveTaxpayer(t: Taxpayer) {
  localStorage.setItem(KEYS.taxpayer, JSON.stringify(t));
}

export function loadTaxpayer(): Taxpayer | null {
  const raw = localStorage.getItem(KEYS.taxpayer);
  return raw ? JSON.parse(raw) : null;
}

export function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(KEYS.invoices, JSON.stringify(invoices));
}

export function loadInvoices(): Invoice[] {
  const raw = localStorage.getItem(KEYS.invoices);
  return raw ? JSON.parse(raw) : [];
}

export function saveFilings(filings: FilingRecord[]) {
  localStorage.setItem(KEYS.filings, JSON.stringify(filings));
}

export function loadFilings(): FilingRecord[] {
  const raw = localStorage.getItem(KEYS.filings);
  return raw ? JSON.parse(raw) : [];
}

export interface CreditLedger {
  itcIgst: number;
  itcCgst: number;
  itcSgst: number;
  tds: number;
  tcs: number;
}

export function saveCreditLedger(c: CreditLedger) {
  localStorage.setItem(KEYS.creditLedger, JSON.stringify(c));
}

export function loadCreditLedger(): CreditLedger {
  const raw = localStorage.getItem(KEYS.creditLedger);
  return raw ? JSON.parse(raw) : { itcIgst: 0, itcCgst: 0, itcSgst: 0, tds: 0, tcs: 0 };
}

export function saveUser(email: string) {
  localStorage.setItem(KEYS.user, email);
}

export function loadUser(): string | null {
  return localStorage.getItem(KEYS.user);
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
