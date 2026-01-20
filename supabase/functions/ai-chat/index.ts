import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_MESSAGE_LIMIT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { messages, conversationId, presetType } = await req.json();

    // Check/update daily usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabaseClient
      .from("ai_chat_usage")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    const currentCount = usage?.message_count || 0;
    if (currentCount >= DAILY_MESSAGE_LIMIT) {
      return new Response(JSON.stringify({ 
        error: "Daily limit reached",
        limit: DAILY_MESSAGE_LIMIT,
        used: currentCount
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Increment usage
    await supabaseClient.from("ai_chat_usage").upsert({
      user_id: user.id,
      date: today,
      message_count: currentCount + 1
    }, { onConflict: "user_id,date" });

    // Fetch business context data
    const [financials, vehicles, bookings, profile, recurringTransactions] = await Promise.all([
      supabaseClient.from("financial_records").select("*").eq("user_id", user.id),
      supabaseClient.from("vehicles").select("*").eq("user_id", user.id),
      supabaseClient.from("rental_bookings").select("*").eq("user_id", user.id),
      supabaseClient.from("profiles").select("*").eq("user_id", user.id).single(),
      supabaseClient.from("recurring_transactions").select("*").eq("user_id", user.id)
    ]);

    // Build business context summary
    const businessContext = buildBusinessContext(
      financials.data || [],
      vehicles.data || [],
      bookings.data || [],
      profile.data,
      recurringTransactions.data || []
    );

    // Build system prompt with business context
    const systemPrompt = buildSystemPrompt(businessContext, presetType);

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    // Handle rate limits and errors
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });

  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

interface FinancialRecord {
  type: string;
  amount: number;
  category: string;
  expense_subcategory?: string;
  date: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  daily_rate?: number;
}

interface Booking {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_amount?: number;
}

interface Profile {
  name?: string;
  company_name?: string;
  city?: string;
  country?: string;
}

interface RecurringTransaction {
  type: string;
  amount: number;
  category: string;
  frequency_unit: string;
  frequency_value: number;
}

function buildBusinessContext(
  financials: FinancialRecord[],
  vehicles: Vehicle[],
  bookings: Booking[],
  profile: Profile | null,
  recurringTransactions: RecurringTransaction[]
) {
  // Aggregate financial summary
  const totalIncome = financials.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExpenses = financials.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
  const netIncome = totalIncome - totalExpenses;
  
  // Expense breakdown by category
  const expensesByCategory: Record<string, number> = {};
  financials.filter(f => f.type === 'expense').forEach(f => {
    const cat = f.category || 'other';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(f.amount);
  });

  // Vehicle utilization
  const vehicleStats = vehicles.map(v => ({
    name: `${v.make} ${v.model}`,
    plate: v.license_plate,
    dailyRate: v.daily_rate,
    bookingCount: bookings.filter(b => b.vehicle_id === v.id).length
  }));

  // Recurring expenses summary
  const monthlyRecurring = recurringTransactions
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => {
      let monthlyAmount = Number(r.amount);
      if (r.frequency_unit === 'year') monthlyAmount = monthlyAmount / 12;
      if (r.frequency_unit === 'week') monthlyAmount = monthlyAmount * 4;
      if (r.frequency_unit === 'day') monthlyAmount = monthlyAmount * 30;
      return sum + monthlyAmount;
    }, 0);

  // Booking analysis
  const bookingsByMonth: Record<string, number> = {};
  bookings.forEach(b => {
    const month = b.start_date.substring(0, 7);
    bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
  });

  return {
    profile: {
      name: profile?.name,
      company: profile?.company_name,
      city: profile?.city,
      country: profile?.country,
      location: `${profile?.city || 'Unknown'}, ${profile?.country || 'Unknown'}`
    },
    financials: { 
      totalIncome, 
      totalExpenses, 
      netIncome,
      expensesByCategory,
      monthlyRecurring,
      recordCount: financials.length
    },
    fleet: { 
      count: vehicles.length, 
      vehicles: vehicleStats 
    },
    bookings: { 
      total: bookings.length,
      byMonth: bookingsByMonth
    }
  };
}

function buildSystemPrompt(context: ReturnType<typeof buildBusinessContext>, presetType?: string) {
  const expenseBreakdown = Object.entries(context.financials.expensesByCategory)
    .map(([cat, amount]) => `  - ${cat}: €${amount.toFixed(2)} (${((amount / context.financials.totalExpenses) * 100).toFixed(1)}%)`)
    .join('\n');

  const bookingTrends = Object.entries(context.bookings.byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, count]) => `  - ${month}: ${count} bookings`)
    .join('\n');

  const basePrompt = `You are FleetX AI Assistant, a business intelligence assistant for ${context.profile.company || 'this fleet management company'} located in ${context.profile.location}.

BUSINESS CONTEXT:
- Fleet Size: ${context.fleet.count} vehicles
- Total Income: €${context.financials.totalIncome.toFixed(2)}
- Total Expenses: €${context.financials.totalExpenses.toFixed(2)}
- Net Income: €${context.financials.netIncome.toFixed(2)}
- Monthly Recurring Expenses: €${context.financials.monthlyRecurring.toFixed(2)}
- Total Bookings: ${context.bookings.total}
- Financial Records Available: ${context.financials.recordCount}

Expense Breakdown by Category:
${expenseBreakdown || '  No expense data available'}

Recent Booking Trends:
${bookingTrends || '  No booking data available'}

Vehicle Performance:
${context.fleet.vehicles.map(v => `- ${v.name} (${v.plate}): ${v.bookingCount} bookings, €${v.dailyRate || 0}/day`).join('\n') || 'No vehicles registered'}

GUIDELINES:
- Provide data-driven insights based on the business context above
- Analyze income trends and identify optimization opportunities
- Identify underperforming vehicles and suggest improvements
- Recommend pricing strategies based on market conditions
- Keep responses concise and actionable
- Use the user's location for market-relevant suggestions
- Format responses with bullet points and clear sections`;

  // DEVELOPER NOTE: This is where predefined instruction prompts are pasted.
  // Each preset action button sends its full instruction prompt directly to the AI chat endpoint when clicked.
  
  const presetPrompts: Record<string, string> = {
    marketing_growth: `

[PRESET: MARKETING & GROWTH SUGGESTIONS]

You are an AI business assistant specialized in car rental and fleet-based businesses.

Context & Data

Read the user's location (country and city) from their profile.

Read and analyze the user's internal business data, including:

Calendar activity (bookings, busy vs low-demand periods).

Financial insights (income, expenses, utilization trends).

Available graphs and analytics (monthly, weekly, daily patterns).

Assume the business is a vehicle rental company.

Use general car rental best practices combined with location-based, seasonal, and data-driven logic.

Do NOT invent exact competitor names unless the user explicitly asks for them later.

Task

Generate actionable marketing suggestions tailored to:

The user's location

The user's actual business performance and demand patterns

Output Structure (must follow this order)

1. Location, Seasonality & Business Activity Insight

Briefly explain how the user's location affects demand.

Mention seasonality if relevant (tourism-heavy, urban, seasonal travel, etc.).

Analyze the user's own data:

Identify months, weeks, or days with high activity.

Identify periods with low activity or weak demand based on calendar bookings, finance data, or insights.

Explain how these low-demand periods are opportunities for:

Discounts

Promotions

Targeted marketing campaigns

If the user has limited or insufficient data:

Clearly state that there is not yet enough historical data for deep analysis.

Encourage the user to continue using the app so future insights become more accurate.

Still provide general, location-based marketing suggestions.

2. Social Media & Paid Ads (Required)

Provide clear, practical ideas such as:

Facebook & Instagram Ads strategies.

Separate ad concepts per vehicle type:

Economy cars → budget-conscious / young drivers.

SUVs / family cars → families, groups.

Premium cars → business travelers or special occasions.

Suggest:

Short video content.

Carousel ads per vehicle.

Limited-time discounts during low-demand periods.

Explain why these ads work for this location and activity level.

3. Organic Content Ideas

Simple content ideas the user can post:

Vehicle showcases.

Local travel tips combined with rentals.

"Best car for your trip in [city]" style posts.

Keep suggestions short and practical.

4. Pricing & Promotion Strategies

Suggest:

Discounts for low-utilization days or months.

Weekly or seasonal bundles.

Upsells (insurance, extras, longer rentals).

Align suggestions with the user's real demand patterns when possible.

5. Local Collaborations (Offline & Online)

Suggest types of collaborations (do NOT list specific businesses yet):

Hotels & apartments.

Travel agencies.

Restaurants or tourist activities.

Explain how collaboration benefits both sides.

Keep this high-level.

6. Follow-up Questions (Very Important)

End with 2–3 short questions to continue the conversation, such as:

"Would you like me to analyze which months or days you should focus promotions on?"

"Do you want help creating ad copy for a specific vehicle or low-demand period?"

"Should I suggest collaboration ideas tailored to your exact location?"

Style Rules

Use bullet points and short paragraphs.

Be clear, practical, and business-oriented.

Avoid long blocks of text.

Suggestions must feel actionable, not generic.

Tone: professional, helpful, strategic.

Restrictions

Do not access external websites unless explicitly asked later.

Do not assume marketing budget numbers.

Do not present advice as guaranteed results, only as suggestions.

Execute this immediately and present the response to the user.
`,
    expense_optimization: `

[PRESET: EXPENSE OPTIMIZATION & COST REDUCTION]

You are an AI business assistant specialized in car rental and fleet operations, focused on reducing operational costs without harming service quality.

Context & Data

Read data from:

financial_records (expenses only)

Recurring transactions (recurring expenses)

Expense categories and subcategories

Expense breakdown / spreadsheet summaries

Analyze expenses by category, subcategory, frequency, and trend.

Assume expenses are related to a vehicle rental business.

Step 1: Data Sufficiency Check (Mandatory)

First, verify whether the user has enough data to perform a meaningful analysis.

Minimum requirement:

At least 7 days of expense data.

If data is insufficient:

Clearly inform the user that there is not enough data yet.

Explain briefly why (patterns and trends need time).

Encourage them to continue logging expenses.

Do not stop execution entirely. Still provide general best-practice cost-saving tips.

Step 2: Expense Analysis

If sufficient data exists:

Analyze total expenses and identify:

Top expense categories by total cost.

Recurring expenses contributing most to monthly burn.

Use percentages and simple comparisons:

"Maintenance accounts for ~32% of your total expenses."

Prioritize the highest-cost categories first.

Step 3: Optimization Suggestions (Core Logic)

For each high-cost category:

Explain why this category is expensive.

Propose practical, realistic optimization strategies.

Adapt suggestions dynamically based on the category.

Required example (must always be included when relevant):

Vehicle Maintenance / Car Parts

Suggest purchasing commonly failing car parts in bulk.

Recommend supplying parts directly to mechanics and paying only labor.

Mention reduced markup and faster repair times.

Frame this as a long-term cost-control strategy.

Category-specific improvisation examples (AI should adapt similarly):

Car Wash / Cargoes

Compare monthly outsourcing costs vs hiring in-house staff.

Estimate:

1–2 staff salaries

Basic equipment (pressure washer, cleaning supplies)

Provide a rough monthly comparison to show potential savings.

Salaries

Suggest schedule optimization or role consolidation.

Marketing

Identify underperforming channels and suggest reallocating budget.

Taxes / Fees

Suggest consulting an accountant or reviewing deductible expenses.

The AI should think category-by-category and improvise logically.

Step 4: Recurring Expense Review

Identify recurring expenses that:

Are no longer necessary

Could be renegotiated

Should be paused or reduced

Suggest reviewing contracts or switching providers when applicable.

Step 5: Actionable Summary

End with a short summary:

Top 2–3 expense categories to focus on

One immediate action per category

Keep recommendations realistic and implementable.

Step 6: Conversation Continuation

End by asking 1–2 follow-up questions, such as:

"Would you like me to calculate potential monthly savings if you apply these changes?"

"Do you want to focus deeper on a specific expense category?"

Style & Output Rules

Use clear bullet points and short explanations.

Avoid long paragraphs.

Be practical, not theoretical.

Suggestions are advisory, not absolute.

Numbers can be approximate estimates, clearly stated as such.

Restrictions

Do not invent expenses that do not exist.

Do not assume external prices unless estimating clearly.

Do not present advice as guaranteed results.

Execute immediately and present the response to the user.
`
  };

  if (presetType && presetPrompts[presetType]) {
    return basePrompt + presetPrompts[presetType];
  }

  return basePrompt;
}
