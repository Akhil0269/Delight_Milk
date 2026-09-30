import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get the authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                }
            )
        }

        // Parse request body or query params
        const url = new URL(req.url)
        const deliveryId = url.searchParams.get('deliveryId')
        const userId = url.searchParams.get('userId') || user.id
        const date = url.searchParams.get('date')
        const status = url.searchParams.get('status')

        let query = supabaseClient
            .from('daily_deliveries')
            .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          phone,
          address,
          area
        ),
        products:product_id (
          id,
          name,
          category,
          price,
          image_url
        ),
        subscriptions:subscription_id (
          id,
          daily_quantity,
          is_active
        )
      `)

        // Filter by delivery ID if provided
        if (deliveryId) {
            query = query.eq('id', deliveryId)
        } else {
            // Filter by user ID (customers can only see their own deliveries)
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                query = query.eq('user_id', user.id)
            } else if (userId && userId !== user.id) {
                query = query.eq('user_id', userId)
            }

            // Filter by date if provided
            if (date) {
                query = query.eq('delivery_date', date)
            }

            // Filter by status if provided
            if (status) {
                query = query.eq('status', status)
            }

            // Order by delivery date (newest first)
            query = query.order('delivery_date', { ascending: false })
        }

        const { data: deliveries, error: deliveryError } = await query

        if (deliveryError) {
            throw deliveryError
        }

        // If single delivery requested, return object instead of array
        if (deliveryId) {
            return new Response(
                JSON.stringify({
                    success: true,
                    delivery: deliveries?.[0] || null,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                deliveries: deliveries || [],
                count: deliveries?.length || 0,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Internal server error',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
