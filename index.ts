import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OTPRequest {
  email: string;
  otp: string;
  taxpayerName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, otp, taxpayerName }: OTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // In production, this would send via an email service (SendGrid, Resend, etc.)
    // For demo, we'll use Supabase's built-in magic link or log it

    // Log the OTP for demo purposes (in browser console for development)
    console.log(`[GST Portal OTP] Email: ${email}, OTP: ${otp}`);

    // Simulate email sending by returning success
    // In a real production app, you would integrate with:
    // - SendGrid, Resend, Postmark, or
    // - Supabase Auth magic link, or
    // - AWS SES

    const data = {
      success: true,
      message: "OTP sent successfully",
      otp: otp, // Return OTP for demo mode
      email: email,
      timestamp: new Date().toISOString(),
      note: "In production, OTP would be sent via email service. For demo, check console or use returned OTP.",
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send OTP" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
