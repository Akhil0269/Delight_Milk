import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

async function sha256Hex(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const phonepeMerchantId = Deno.env.get('PHONEPE_MERCHANT_ID')
        const phonepeSaltKey = Deno.env.get('PHONEPE_SALT_KEY')
        const phonepeSaltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1'
        const phonepeEnv = Deno.env.get('PHONEPE_ENV') || 'UAT'

        // 1. Authenticate caller
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })
        const { data: { user }, error: userError } = await authClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: invalid or expired session' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
        const url = new URL(req.url)
        const txnId = url.searchParams.get('txnId') || (req.method === 'POST' ? (await req.json()).txnId : null)

        if (!txnId) {
            return new Response(JSON.stringify({ error: 'Missing txnId parameter' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Check Database Order Status First (RLS check: order belongs to this user or admin)
        const { data: userOrders } = await adminClient
            .from('orders')
            .select('id, user_id, payment_status, status, total_amount')
            .eq('user_id', user.id)
            .ilike('notes', `%${txnId}%`)

        if (userOrders && userOrders.length > 0) {
            const isAllPaid = userOrders.every(o => o.payment_status === 'paid')
            const isAnyFailed = userOrders.some(o => o.payment_status === 'failed')

            if (isAllPaid) {
                return new Response(JSON.stringify({
                    status: 'paid',
                    success: true,
                    merchantTransactionId: txnId,
                    verifiedSource: 'database',
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            if (isAnyFailed) {
                return new Response(JSON.stringify({
                    status: 'failed',
                    success: false,
                    merchantTransactionId: txnId,
                    verifiedSource: 'database',
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
        }

        // 3. If Pending and PhonePe credentials are configured, query PhonePe Gateway
        if (phonepeMerchantId && phonepeSaltKey) {
            const stringToHash = `/pg/v1/status/${phonepeMerchantId}/${txnId}${phonepeSaltKey}`
            const sha256 = await sha256Hex(stringToHash)
            const xVerify = `${sha256}###${phonepeSaltIndex}`

            const pgBaseUrl = phonepeEnv === 'PRODUCTION'
                ? `https://api.phonepe.com/apis/hermes/pg/v1/status/${phonepeMerchantId}/${txnId}`
                : `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${phonepeMerchantId}/${txnId}`

            const pgResponse = await fetch(pgBaseUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                    'X-MERCHANT-ID': phonepeMerchantId,
                }
            })

            const pgData = await pgResponse.json()

            if (pgData.success && pgData.code === 'PAYMENT_SUCCESS') {
                // Update orders to paid
                if (userOrders && userOrders.length > 0) {
                    for (const order of userOrders) {
                        await adminClient
                            .from('orders')
                            .update({
                                payment_status: 'paid',
                                status: 'confirmed',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', order.id)
                    }
                }

                return new Response(JSON.stringify({
                    status: 'paid',
                    success: true,
                    merchantTransactionId: txnId,
                    verifiedSource: 'phonepe_gateway',
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            } else if (pgData.code === 'PAYMENT_ERROR' || pgData.code === 'PAYMENT_DECLINED') {
                if (userOrders && userOrders.length > 0) {
                    for (const order of userOrders) {
                        await adminClient
                            .from('orders')
                            .update({
                                payment_status: 'failed',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', order.id)
                    }
                }

                return new Response(JSON.stringify({
                    status: 'failed',
                    success: false,
                    merchantTransactionId: txnId,
                    verifiedSource: 'phonepe_gateway',
                    message: pgData.message || 'Payment declined by bank.',
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            } else {
                return new Response(JSON.stringify({
                    status: 'pending',
                    success: false,
                    merchantTransactionId: txnId,
                    verifiedSource: 'phonepe_gateway',
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
        }

        // 4. If credentials not configured
        return new Response(JSON.stringify({
            status: 'pending',
            success: false,
            notConfigured: true,
            merchantTransactionId: txnId,
            message: 'PhonePe merchant credentials are not configured on the server.',
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: unknown) {
        console.error('PhonePe status check error:', err)
        const msg = err instanceof Error ? err.message : 'Internal Server Error'
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
