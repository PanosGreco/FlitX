import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function calculateNextDate(fromDate: string, frequencyValue: number, frequencyUnit: string): string {
  const nextDate = new Date(fromDate)
  switch (frequencyUnit) {
    case 'week':
      nextDate.setDate(nextDate.getDate() + 7 * frequencyValue)
      break
    case 'month':
      nextDate.setMonth(nextDate.getMonth() + frequencyValue)
      break
    case 'year':
      nextDate.setFullYear(nextDate.getFullYear() + frequencyValue)
      break
  }
  return nextDate.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Allow calls from: service role (cron), or authenticated user (frontend fallback)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Get all active recurring transactions that are due
    const { data: dueTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*, vehicles(fuel_type, year)')
      .eq('is_active', true)
      .lte('next_generation_date', todayStr)

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: corsHeaders })
    }

    let totalGenerated = 0
    const MAX_ITERATIONS = 100

    for (const recurring of dueTransactions || []) {
      let currentNextDate = recurring.next_generation_date
      let currentLastDate = recurring.last_generated_date
      let iterations = 0
      let shouldDeactivate = false

      const vehicle = recurring.vehicles

      while (currentNextDate <= todayStr && iterations < MAX_ITERATIONS) {
        // Check end_date
        if (recurring.end_date && currentNextDate > recurring.end_date) {
          shouldDeactivate = true
          break
        }

        // Duplicate prevention
        const { data: existing } = await supabase
          .from('financial_records')
          .select('id')
          .eq('date', currentNextDate)
          .eq('category', recurring.category)
          .eq('amount', recurring.amount)
          .eq('source_section', 'recurring')
          .eq('type', recurring.type)
          .eq('user_id', recurring.user_id)
          .maybeSingle()

        if (!existing) {
          const newRecord: Record<string, unknown> = {
            user_id: recurring.user_id,
            type: recurring.type,
            category: recurring.category,
            amount: recurring.amount,
            date: currentNextDate,
            description: recurring.description || (recurring.type === 'income' ? 'Recurring Income' : 'Recurring Expense'),
            source_section: 'recurring',
            vehicle_id: recurring.vehicle_id,
          }

          if (vehicle) {
            newRecord.vehicle_fuel_type = vehicle.fuel_type || 'petrol'
            newRecord.vehicle_year = vehicle.year
          }

          if (recurring.type === 'income') {
            if (recurring.income_source_type) newRecord.income_source_type = recurring.income_source_type
            if (recurring.income_source_specification) newRecord.income_source_specification = recurring.income_source_specification
          }
          if (recurring.type === 'expense' && recurring.expense_subcategory) {
            newRecord.expense_subcategory = recurring.expense_subcategory
          }

          const { error: insertError } = await supabase
            .from('financial_records')
            .insert(newRecord)

          if (insertError) {
            console.error(`Error inserting record for rule ${recurring.id}:`, insertError)
            break
          }
          totalGenerated++
        }

        currentLastDate = currentNextDate
        currentNextDate = calculateNextDate(currentNextDate, recurring.frequency_value, recurring.frequency_unit)
        iterations++

        if (recurring.end_date && currentNextDate > recurring.end_date) {
          shouldDeactivate = true
        }
      }

      // Update rule
      const updateData: Record<string, unknown> = {
        last_generated_date: currentLastDate,
        next_generation_date: currentNextDate,
      }
      if (shouldDeactivate) {
        updateData.is_active = false
      }

      await supabase
        .from('recurring_transactions')
        .update(updateData)
        .eq('id', recurring.id)
    }

    console.log(`Processed ${dueTransactions?.length || 0} rules, generated ${totalGenerated} records`)

    return new Response(
      JSON.stringify({ processed: dueTransactions?.length || 0, generated: totalGenerated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
