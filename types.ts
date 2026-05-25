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

export interface OTPSession {
  otp: string;
  mobile: string;
  expiresAt: number;
  verified: boolean;
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
