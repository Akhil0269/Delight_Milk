import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-verify',
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
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const phonepeSaltKey = Deno.env.get('PHONEPE_SALT_KEY') ?? ''
        const phonepeSaltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1'

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

        // 1. Signature Verification
        const xVerifyHeader = req.headers.get('X-VERIFY')
        const body = await req.json()
        const base64Response = body.response

        if (!base64Response) {
            return new Response(JSON.stringify({ error: 'Missing response payload' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // If PhonePe salt key is configured, strictly verify the signature
        if (phonepeSaltKey) {
            if (!xVerifyHeader) {
                return new Response(JSON.stringify({ error: 'Missing X-VERIFY signature header' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            const expectedHash = await sha256Hex(base64Response + phonepeSaltKey)
            const expectedHeader = `${expectedHash}###${phonepeSaltIndex}`

            if (xVerifyHeader !== expectedHeader) {
                console.error('[PhonePe Webhook] Invalid signature mismatch')
                return new Response(JSON.stringify({ error: 'Unauthorized: signature verification failed' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
        }

        // 2. Decode Payload
        const decodedString = atob(base64Response)
        const payload = JSON.parse(decodedString)
        const data = payload.data || {}
        const merchantTransactionId = data.merchantTransactionId
        const state = data.state // 'COMPLETED' | 'FAILED' | 'PENDING'
        const responseCode = data.responseCode // 'SUCCESS' | ...
        const amountInPaise = data.amount || 0
        const amountInRupees = amountInPaise / 100

        if (!merchantTransactionId) {
            return new Response(JSON.stringify({ error: 'Missing merchantTransactionId' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`[PhonePe Webhook] Processing ${merchantTransactionId}, state=${state}, code=${responseCode}`)

        // 3. Handle Successful Payment
        if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
            // Find orders created for this transaction
            const { data: matchingOrders } = await adminClient
                .from('orders')
                .select('id, user_id, payment_status, status, delivery_id')
                .ilike('notes', `%${merchantTransactionId}%`)

            if (matchingOrders && matchingOrders.length > 0) {
                for (const order of matchingOrders) {
                    if (order.payment_status === 'paid') {
                        continue; // Idempotent skip
                    }

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

            // Check if this was a wallet top-up transaction
            // Idempotency check in wallet_transactions
            const { data: existingTx } = await adminClient
                .from('wallet_transactions')
                .select('id')
                .eq('reference_id', merchantTransactionId)
                .maybeSingle()

            if (!existingTx && data.merchantUserId) {
                // If this transaction was a wallet topup
                const userId = data.merchantUserId
                const { data: userWallet } = await adminClient
                    .from('wallets')
                    .select('id, balance')
                    .eq('user_id', userId)
                    .maybeSingle()

                if (userWallet && amountInRupees > 0) {
                    await adminClient
                        .from('wallets')
                        .update({
                            balance: Number(userWallet.balance) + amountInRupees,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', userWallet.id)

                    await adminClient
                        .from('wallet_transactions')
                        .insert({
                            wallet_id: userWallet.id,
                            user_id: userId,
                            amount: amountInRupees,
                            type: 'credit',
                            description: `PhonePe wallet top-up (Txn: ${merchantTransactionId})`,
                            reference_id: merchantTransactionId,
                            source: 'phonepe',
                            status: 'completed',
                        })
                }
            }

            return new Response(JSON.stringify({ success: true, message: 'Payment confirmed successfully' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 4. Handle Failed / Cancelled Payment
        if (state === 'FAILED' || state === 'CANCELLED') {
            const { data: matchingOrders } = await adminClient
                .from('orders')
                .select('id, delivery_id')
                .ilike('notes', `%${merchantTransactionId}%`)

            if (matchingOrders && matchingOrders.length > 0) {
                for (const order of matchingOrders) {
                    await adminClient
                        .from('orders')
                        .update({
                            payment_status: 'failed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', order.id)

                    if (order.delivery_id) {
                        await adminClient
                            .from('deliveries')
                            .update({
                                status: 'cancelled',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', order.delivery_id)
                    }
                }
            }

            return new Response(JSON.stringify({ success: true, message: 'Failure recorded successfully' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true, message: `Status ${state} received` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: unknown) {
        console.error('PhonePe webhook error:', err)
        const msg = err instanceof Error ? err.message : 'Internal Server Error'
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
