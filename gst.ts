export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };
  const cleaned = gstin.toUpperCase().trim();
  if (cleaned.length !== 15) return { valid: false, error: 'GSTIN must be exactly 15 characters' };

  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!pattern.test(cleaned)) return { valid: false, error: 'Invalid GSTIN format' };

  const stateCode = cleaned.substring(0, 2);
  if (!STATE_CODES[stateCode]) return { valid: false, error: `Invalid state code: ${stateCode}` };

  // Luhn-like checksum
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = CHECKSUM_CHARS.indexOf(cleaned[i]);
    const product = val * (i % 2 === 0 ? 1 : 2);
    sum += product > 35 ? (product % 36) + Math.floor(product / 36) : product;
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  const expectedChar = CHECKSUM_CHARS[checkDigit];

  if (cleaned[14] !== expectedChar) {
    return { valid: false, error: `Invalid checksum. Expected check digit: ${expectedChar}` };
  }

  return { valid: true };
}

export function extractGSTINInfo(gstin: string) {
  const cleaned = gstin.toUpperCase().trim();
  const stateCode = cleaned.substring(0, 2);
  const pan = cleaned.substring(2, 12);
  return {
    stateCode,
    stateName: STATE_CODES[stateCode] || 'Unknown',
    pan,
    entityCode: cleaned[12],
    checksum: cleaned[14],
  };
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateARN(gstin: string, returnType: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const stateCode = gstin.substring(0, 2);
  const typeCode = returnType === 'GSTR-1' ? 'AA' : 'AB';
  return `AA${stateCode}${typeCode}${timestamp}`;
}

export function generateCPIN(): string {
  return `CPIN${Date.now().toString().slice(-10)}`;
}

export function calculateGSTR3B(invoices: import('../types').Invoice[]): import('../types').GSTR3BData {
  let outwardTaxableSupplies = 0;
  let outwardTaxableIgst = 0;
  let outwardTaxableCgst = 0;
  let outwardTaxableSgst = 0;

  for (const inv of invoices) {
    outwardTaxableSupplies += inv.taxableValue;
    outwardTaxableIgst += inv.igst;
    outwardTaxableCgst += inv.cgst;
    outwardTaxableSgst += inv.sgst;
  }

  return {
    outwardTaxableSupplies,
    outwardTaxableIgst,
    outwardTaxableCgst,
    outwardTaxableSgst,
    zeroRatedSupplies: 0,
    nilExemptSupplies: 0,
    itcIgst: 0,
    itcCgst: 0,
    itcSgst: 0,
    tds: 0,
    tcs: 0,
    netPayableIgst: outwardTaxableIgst,
    netPayableCgst: outwardTaxableCgst,
    netPayableSgst: outwardTaxableSgst,
    totalNetPayable: outwardTaxableIgst + outwardTaxableCgst + outwardTaxableSgst,
  };
}

export function calculateComplianceScore(
  filings: import('../types').FilingRecord[],
  invoices: import('../types').Invoice[]
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if (filings.length === 0) {
    issues.push('No returns filed yet');
    score -= 30;
  }

  const lateFilings = filings.filter((f) => f.status === 'Late');
  if (lateFilings.length > 0) {
    issues.push(`${lateFilings.length} return(s) filed late`);
    score -= lateFilings.length * 10;
  }

  const missingGstin = invoices.filter((inv) => !inv.buyerGstin || inv.buyerGstin === 'URP');
  if (missingGstin.length > 0) {
    issues.push(`${missingGstin.length} invoice(s) have missing buyer GSTIN`);
    score -= missingGstin.length * 2;
  }

  const totalOutput = invoices.reduce((s, i) => s + i.totalTax, 0);
  const pendingFilings = filings.filter((f) => f.status === 'Pending');
  if (pendingFilings.length > 0) {
    issues.push(`${pendingFilings.length} return(s) pending`);
    score -= pendingFilings.length * 15;
  }

  if (totalOutput === 0 && invoices.length > 0) {
    issues.push('No tax liability computed — verify invoice data');
    score -= 10;
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function currentTaxPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${month}${now.getFullYear()}`;
}
