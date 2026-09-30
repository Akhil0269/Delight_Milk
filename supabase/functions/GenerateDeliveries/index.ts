import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/**
 * Computes tomorrow's calendar date in the Asia/Kolkata timezone (UTC+5:30).
 * Avoids any dependency on local machine or UTC midnight boundaries.
 */
function getTomorrowKolkataDate(referenceDate: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    })
    const parts = formatter.formatToParts(referenceDate)
    let year = 0
    let month = 0
    let day = 0
    for (const p of parts) {
        if (p.type === 'year') year = parseInt(p.value, 10)
        if (p.type === 'month') month = parseInt(p.value, 10)
        if (p.type === 'day') day = parseInt(p.value, 10)
    }

    // Add 1 calendar day safely in UTC
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    dateObj.setUTCDate(dateObj.getUTCDate() + 1)

    const y = dateObj.getUTCFullYear()
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/**
 * Validates that a string is a valid ISO date in YYYY-MM-DD format.
 */
function isValidDateString(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
    const [y, m, d] = dateStr.split('-').map(Number)
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false
    const dateObj = new Date(Date.UTC(y, m - 1, d))
    return (
        dateObj.getUTCFullYear() === y &&
        dateObj.getUTCMonth() === m - 1 &&
        dateObj.getUTCDate() === d
    )
}

serve(async (req: Request) => {
    // 1. Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

        // 2. Authorization Verification
        const authHeader = req.headers.get('Authorization') ?? ''
        const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
        const customSecretHeader = req.headers.get('x-cron-secret') ?? ''

        let isAuthorized = false

        // Match service-role key or custom cron secret
        if (
            (serviceRoleKey && bearerToken === serviceRoleKey) ||
            (cronSecret && (bearerToken === cronSecret || customSecretHeader === cronSecret))
        ) {
            isAuthorized = true
        } else if (bearerToken) {
            // Check if bearer token is a valid authenticated admin user
            const authClient = createClient(supabaseUrl, anonKey, {
                global: { headers: { Authorization: `Bearer ${bearerToken}` } },
            })
            const { data: { user }, error: userError } = await authClient.auth.getUser()

            if (user && !userError) {
                // Verify admin role in user_roles
                const adminCheckClient = createClient(supabaseUrl, serviceRoleKey)
                const { data: roleRecord } = await adminCheckClient
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('role', 'admin')
                    .maybeSingle()

                if (roleRecord) {
                    isAuthorized = true
                } else {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: 'Forbidden: Admin or service-role privileges required',
                        }),
                        {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 403,
                        }
                    )
                }
            }
        }

        if (!isAuthorized) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Unauthorized: Valid service-role key or admin credentials required',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                }
            )
        }

        // 3. Determine Target Delivery Date
        let targetDate = getTomorrowKolkataDate()

        // Check if an explicit target_date was supplied in body or query param
        if (req.method === 'POST') {
            try {
                const body = await req.json()
                if (body && typeof body.target_date === 'string' && body.target_date.trim() !== '') {
                    const candidateDate = body.target_date.trim()
                    if (isValidDateString(candidateDate)) {
                        targetDate = candidateDate
                    } else {
                        return new Response(
                            JSON.stringify({
                                success: false,
                                error: `Invalid target_date format: '${candidateDate}'. Expected YYYY-MM-DD.`,
                            }),
                            {
                                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                status: 400,
                            }
                        )
                    }
                }
            } catch {
                // Body empty or not JSON; fall back to default targetDate
            }
        } else if (req.method === 'GET') {
            const url = new URL(req.url)
            const queryDate = url.searchParams.get('target_date')
            if (queryDate) {
                if (isValidDateString(queryDate)) {
                    targetDate = queryDate
                } else {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: `Invalid target_date format: '${queryDate}'. Expected YYYY-MM-DD.`,
                        }),
                        {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 400,
                        }
                    )
                }
            }
        }

        console.log(`[GenerateDeliveries] Executing subscription delivery generation for target date: ${targetDate}`)

        // 4. Invoke Database Function with Service-Role Privileges
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const { data, error } = await adminClient.rpc('generate_subscription_deliveries', {
            target_date: targetDate,
        })

        if (error) {
            console.error(`[GenerateDeliveries] Database RPC error for date ${targetDate}:`, error.message)
            return new Response(
                JSON.stringify({
                    success: false,
                    target_date: targetDate,
                    error: error.message,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            )
        }

        // Check if db function returned an internal logical error
        if (data && data.success === false) {
            console.warn(`[GenerateDeliveries] Function returned unsuccessful status:`, data.error)
            return new Response(
                JSON.stringify({
                    success: false,
                    target_date: targetDate,
                    result: data,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        console.log(
            `[GenerateDeliveries] Completed successfully for ${targetDate}. Generated: ${data?.deliveries_generated ?? 0}, Already Existing: ${data?.deliveries_already_existing ?? 0}`
        )

        // 5. Return Structured Success Response
        return new Response(
            JSON.stringify({
                success: true,
                target_date: targetDate,
                result: data,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Internal server error'
        console.error('[GenerateDeliveries] Unexpected exception:', errorMessage)
        return new Response(
            JSON.stringify({
                success: false,
                error: errorMessage,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
