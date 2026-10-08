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
        const body = await req.json()
        const { purpose, items, amount, deliveryDate, redirectUrl } = body

        // 2. Authoritative Price & Availability Verification
        let totalAmount = 0
        const isCart = purpose === 'cart_checkout' || purpose === 'cart_checkout_now'

        if (isCart) {
            if (!Array.isArray(items) || items.length === 0) {
                return new Response(JSON.stringify({ error: 'Cart is empty. Please select products to order.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            const productIds = items.map((i: { id: string }) => i.id)
            const { data: dbProducts, error: prodErr } = await adminClient
                .from('products')
                .select('id, name, price_per_unit, is_active')
                .in('id', productIds)

            if (prodErr || !dbProducts) {
                return new Response(JSON.stringify({ error: 'Failed to verify product catalog prices.' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // Verify all items are active
            for (const item of items) {
                const dbProd = dbProducts.find((p: { id: string }) => p.id === item.id)
                if (!dbProd || dbProd.is_active === false) {
                    return new Response(JSON.stringify({
                        error: `Product "${dbProd?.name || item.id}" is currently unavailable.`
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    })
                }

                const price = Number(dbProd.price_per_unit)
                const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)))
                totalAmount += price * qty
            }
        } else if (purpose === 'wallet_topup' || purpose === 'wallet_recharge') {
            const num = Number(amount)
            if (isNaN(num) || num < 10 || num > 100000) {
                return new Response(JSON.stringify({ error: 'Invalid wallet top-up amount (Min: ₹10, Max: ₹1,00,000)' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
            totalAmount = num
        } else {
            return new Response(JSON.stringify({ error: `Unsupported payment purpose: ${purpose}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. Generate idempotent merchant transaction ID
        const merchantTransactionId = `MT_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`

        // 4. Create pending order records in public.orders for cart checkouts
        if (isCart) {
            const targetDate = deliveryDate || (
                purpose === 'cart_checkout_now'
                    ? new Date().toISOString().split('T')[0]
                    : new Date(Date.now() + 86400000).toISOString().split('T')[0]
            )

            const { data: dbProducts } = await adminClient
                .from('products')
                .select('id, price_per_unit')
                .in('id', items.map((i: { id: string }) => i.id))

            for (const item of items) {
                const dbProd = dbProducts?.find((p: { id: string }) => p.id === item.id)
                const price = Number(dbProd?.price_per_unit ?? 0)
                const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)))

                await adminClient.from('orders').insert({
                    user_id: user.id,
                    product_id: item.id,
                    quantity: qty,
                    price_per_unit: price,
                    delivery_date: targetDate,
                    payment_method: 'phonepe',
                    payment_status: 'pending',
                    status: 'confirmed',
                    notes: `PhonePe Order (Txn: ${merchantTransactionId})`,
                })
            }
        }

        // 5. Check PhonePe Environment & Credentials
        const phonepeMerchantId = Deno.env.get('PHONEPE_MERCHANT_ID')
        const phonepeSaltKey = Deno.env.get('PHONEPE_SALT_KEY')
        const phonepeSaltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1'
        const phonepeEnv = Deno.env.get('PHONEPE_ENV') || 'UAT'

        if (!phonepeMerchantId || !phonepeSaltKey) {
            // Truthfully report unconfigured merchant credentials
            return new Response(JSON.stringify({
                success: false,
                code: 'PHONEPE_NOT_CONFIGURED',
                message: 'PhonePe online payments are undergoing merchant gateway configuration. Please use Cash on Delivery or Wallet.',
                merchantTransactionId,
                amount: totalAmount,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 6. Build PhonePe Standard Checkout Payload
        const amountInPaise = Math.round(totalAmount * 100)
        const hostUrl = redirectUrl || `${req.headers.get('origin') || 'http://localhost:5173'}/payment/success`
        const finalRedirectUrl = `${hostUrl}?txnId=${merchantTransactionId}&amount=${totalAmount}&purpose=${purpose}`
        const webhookUrl = `${supabaseUrl}/functions/v1/phonepe-webhook`

        const paymentPayload = {
            merchantId: phonepeMerchantId,
            merchantTransactionId,
            merchantUserId: user.id,
            amount: amountInPaise,
            redirectUrl: finalRedirectUrl,
            redirectMode: 'REDIRECT',
            callbackUrl: webhookUrl,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        }

        const base64Payload = btoa(JSON.stringify(paymentPayload))
        const stringToHash = base64Payload + '/pg/v1/pay' + phonepeSaltKey
        const sha256 = await sha256Hex(stringToHash)
        const xVerify = `${sha256}###${phonepeSaltIndex}`

        const pgBaseUrl = phonepeEnv === 'PRODUCTION'
            ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay'

        const response = await fetch(pgBaseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
            },
            body: JSON.stringify({ request: base64Payload })
        })

        const resData = await response.json()

        if (resData.success && resData.data?.instrumentResponse?.redirectInfo?.url) {
            return new Response(JSON.stringify({
                success: true,
                paymentUrl: resData.data.instrumentResponse.redirectInfo.url,
                merchantTransactionId,
                amount: totalAmount,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        } else {
            return new Response(JSON.stringify({
                success: false,
                code: resData.code || 'PHONEPE_INITIATE_FAILED',
                message: resData.message || 'Failed to initiate payment with PhonePe.',
                merchantTransactionId,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

    } catch (err: unknown) {
        console.error('PhonePe initiate error:', err)
        const msg = err instanceof Error ? err.message : 'Internal Server Error'
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
