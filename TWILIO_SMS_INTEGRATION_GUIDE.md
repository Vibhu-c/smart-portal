# How to Add Real SMS OTP with Twilio - Step by Step Guide

## Current Setup
Your project already has:
1. Supabase Edge Function deployed (`send-otp`)
2. Frontend calling the edge function
3. Demo mode showing OTP on screen

## Option 1: Twilio SMS Gateway (PAID - ~$0.0075 per SMS)

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial (get $15.50 free credit)
3. Verify your phone number
4. Get a Twilio phone number (free with trial)
5. Note down: Account SID, Auth Token, Phone Number

### Step 2: Update Edge Function

Replace the content of `supabase/functions/send-otp/index.ts` with:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OTPRequest {
  mobile: string;
  otp: string;
  taxpayerName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { mobile, otp, taxpayerName }: OTPRequest = await req.json();

    if (!mobile || !otp) {
      return new Response(
        JSON.stringify({ error: "Mobile and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TWILIO CREDENTIALS - Set these in Supabase Edge Function Secrets
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    // Format mobile number for India (+91)
    const formattedMobile = mobile.startsWith("+91") ? mobile : `+91${mobile}`;

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const messageBody = `Dear ${taxpayerName || "Taxpayer"}, your GST Portal OTP is ${otp}. Valid for 2 minutes. Do not share with anyone. - GSTN`;

    const formData = new URLSearchParams();
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("To", formattedMobile);
    formData.append("Body", messageBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({
          success: true,
          message: "SMS sending failed, showing in demo mode",
          otp: otp,
          mobile: mobile,
          error: twilioData.message,
          demo: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully via SMS",
        sid: twilioData.sid,
        mobile: formattedMobile,
        demo: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send OTP", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Step 3: Add Twilio Secrets in Supabase
In Supabase Dashboard:
1. Go to Edge Functions > Settings > Secrets
2. Add these secrets:
   - `TWILIO_ACCOUNT_SID` = your_account_sid
   - `TWILIO_AUTH_TOKEN` = your_auth_token
   - `TWILIO_PHONE_NUMBER` = your_twilio_phone_number

### Step 4: Redeploy Edge Function
After updating the code, redeploy using the Supabase dashboard or CLI.

---

## FREE OPTIONS

### Option 2: Firebase Phone Auth (FREE Tier)
Google Firebase provides free phone authentication:
- 10,000 verifications/month FREE
- Then $0.01 per verification
- Website: https://firebase.google.com/products/auth

### Option 3: MSG91 (Indian - Cheapest for India)
- Indian SMS gateway
- Rs.0.15 per SMS (cheaper than Twilio)
- 500 FREE SMS on signup
- Website: https://msg91.com

### Option 4: TextLocal (Indian)
- Rs.0.12 per SMS
- Good for bulk SMS
- Website: https://textlocal.in

---

## COST COMPARISON TABLE

| Provider        | Cost per SMS (India) | Free Credits        | Best For          |
|-----------------|---------------------|---------------------|-------------------|
| **Demo Mode**   | 100% FREE           | Unlimited           | Student Projects  |
| Twilio          | Rs.0.60 ($0.0075)   | $15.50 trial        | Production Apps   |
| MSG91           | Rs.0.15             | 500 free SMS        | India Apps        |
| Firebase Phone  | FREE (10K/month)    | 10,000/month        | Best Free Option  |
| TextLocal       | Rs.0.12             | 100 free SMS        | Bulk SMS          |
| Email (Supabase)| 100% FREE           | Unlimited           | Email OTP         |

---

## MY RECOMMENDATIONS

### For Student Project (FREE - No Cost)
1. **Keep Demo Mode** - OTP shown on screen
2. Already working perfectly
3. No setup required
4. Professor will understand it is a simulation

### For Real Implementation (Free/Trial)
1. **Firebase Phone Auth** - FREE 10,000 OTPs per month
2. **MSG91** - 500 FREE SMS on signup (Indian numbers)
3. **Twilio Trial** - $15.50 FREE credit for testing

---

## HOW TO GET FREE SMS (Step by Step)

### MSG91 (FREE 500 SMS for India)
1. Go to https://msg91.com
2. Sign up with email
3. Verify your mobile number
4. Get 500 FREE SMS credits
5. Create API key from dashboard
6. Use their REST API to send OTP

### Firebase Phone Auth (FREE 10K/month)
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Phone Authentication
4. Add your app (Web)
5. Copy config to your project
6. Use Firebase Auth SDK

---

## COMPLETE PROJECT FILES FOR GITHUB

Your repository should have:

```
gst-portal/
├── README.md                          # Project documentation
├── package.json                       # Dependencies
├── vite.config.ts                     # Vite configuration
├── tailwind.config.js                 # Tailwind configuration
├── postcss.config.js                  # PostCSS configuration
├── tsconfig.json                      # TypeScript configuration
├── index.html                         # Entry HTML
├── .env.example                       # Environment variables template
├── src/
│   ├── App.tsx                        # Main app (COPY GST_Portal_Complete.tsx HERE)
│   ├── main.tsx                       # React entry point
│   ├── index.css                      # Tailwind imports
│   ├── vite-env.d.ts                  # Vite types
│   ├── types.ts                       # TypeScript interfaces
│   ├── utils/
│   │   ├── gst.ts                     # GST utilities
│   │   └── storage.ts                 # LocalStorage utilities
│   └── components/
│       ├── LoginPage.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Dashboard.tsx
│       ├── TaxpayerMaster.tsx
│       ├── GSTR1.tsx
│       ├── GSTR3B.tsx
│       ├── CreditLedger.tsx
│       ├── FilingPayment.tsx
│       └── ComplianceInsights.tsx
└── supabase/
    └── functions/
        └── send-otp/
            └── index.ts               # Edge function for OTP
```

---

## QUICK SETUP COMMANDS

```bash
# Create new project
npm create vite@latest gst-portal -- --template react-ts

# Navigate to project
cd gst-portal

# Install dependencies
npm install lucide-react @supabase/supabase-js

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start development
npm run dev
```

---

## YOUR PROJECT IS READY

All files are in: `/tmp/cc-agent/67131810/project/`

The complete single file is: `GST_Portal_Complete.tsx`

Project builds successfully with: `npm run build`
