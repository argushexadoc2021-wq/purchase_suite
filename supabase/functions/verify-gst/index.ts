import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gst_number } = await req.json()

    if (!gst_number) {
      return new Response(
        JSON.stringify({ error: 'GST number is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Basic validation for GST format (15 characters, alphanumeric)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    // For testing purposes, we'll accept any 15 character string if it doesn't match the strict regex
    if (gst_number.length !== 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid GST number format. Must be 15 characters.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Call the real RapidAPI GST Verification endpoint
    const taskId = crypto.randomUUID();
    const groupId = crypto.randomUUID();

    const response = await fetch('https://gst-verification.p.rapidapi.com/v3/tasks/sync/verify_with_source/ind_gst_certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'gst-verification.p.rapidapi.com',
        'x-rapidapi-key': Deno.env.get('RAPIDAPI_KEY') || ''
      },
      body: JSON.stringify({
        task_id: taskId,
        group_id: groupId,
        data: {
          gstin: gst_number
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI Error:', response.status, errorText);

      let errorMessage = 'Failed to verify GST number with provider. Please check your GST number.';
      if (response.status === 429) {
        errorMessage = 'API Rate Limit Exceeded. Please upgrade your RapidAPI plan or use a new API key.';
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const result = await response.json();
    const sourceOutput = result?.result?.source_output;

    const companyName = sourceOutput?.legal_name || sourceOutput?.trade_name || '';

    if (!companyName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not find company details for this GST number.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          organization_name: companyName,
          gst_number: gst_number,
          trade_name: sourceOutput?.trade_name || '',
          gstin_status: sourceOutput?.gstin_status || sourceOutput?.status || 'Active',
          taxpayer_type: sourceOutput?.taxpayer_type || '',
          constitution_of_business: sourceOutput?.constitution_of_business || '',
          date_of_registration: sourceOutput?.date_of_registration || '',
          address: sourceOutput?.principal_place_of_business_address || null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
