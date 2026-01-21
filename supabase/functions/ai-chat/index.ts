import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_MESSAGE_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_PER_REQUEST = 20;

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

    // === SECURITY: Input Validation ===
    // Validate message length to prevent abuse
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ 
        error: "Message too long. Please keep messages under 4000 characters." 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Trim conversation history to prevent token overflow
    const trimmedMessages = messages.slice(-MAX_MESSAGES_PER_REQUEST);

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

    // Build business context summary with enhanced per-vehicle analytics
    const businessContext = buildBusinessContext(
      financials.data || [],
      vehicles.data || [],
      bookings.data || [],
      profile.data,
      recurringTransactions.data || []
    );

    // Build system prompt with business context and data dictionary
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
          ...trimmedMessages
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
    // Never expose internal error details to client
    return new Response(JSON.stringify({ 
      error: "An error occurred. Please try again." 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// ============= TYPE DEFINITIONS =============

interface FinancialRecord {
  type: string;
  amount: number;
  category: string;
  expense_subcategory?: string;
  date: string;
  vehicle_id?: string;
  income_source_type?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  daily_rate?: number;
  type?: string;
  year?: number;
  status?: string;
}

interface Booking {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_amount?: number;
  status?: string;
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

// ============= ENHANCED VEHICLE FINANCIAL ANALYTICS =============

interface VehicleFinancials {
  id: string;
  name: string;
  plate: string;
  dailyRate: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  bookingCount: number;
  bookingRevenue: number;
  daysRented: number;
  avgRevenuePerBooking: number;
}

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
}

interface MonthlyPerformance {
  month: string;
  income: number;
  expenses: number;
  netProfit: number;
  bookings: number;
}

// ============= CORE BUSINESS CONTEXT BUILDER =============

function buildBusinessContext(
  financials: FinancialRecord[],
  vehicles: Vehicle[],
  bookings: Booking[],
  profile: Profile | null,
  recurringTransactions: RecurringTransaction[]
) {
  // === AGGREGATE FINANCIAL TOTALS ===
  const totalIncome = financials.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExpenses = financials.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
  const netIncome = totalIncome - totalExpenses;

  // === PER-VEHICLE FINANCIAL BREAKDOWN (CRITICAL FOR ACCURACY) ===
  const vehicleFinancials: VehicleFinancials[] = vehicles.map(v => {
    // Income attributed to this vehicle
    const vIncome = financials
      .filter(f => f.vehicle_id === v.id && f.type === 'income')
      .reduce((sum, f) => sum + Number(f.amount), 0);
    
    // Expenses attributed to this vehicle
    const vExpenses = financials
      .filter(f => f.vehicle_id === v.id && f.type === 'expense')
      .reduce((sum, f) => sum + Number(f.amount), 0);
    
    // Bookings for this vehicle
    const vBookings = bookings.filter(b => b.vehicle_id === v.id);
    const bookingRevenue = vBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    
    // Calculate days rented
    let daysRented = 0;
    vBookings.forEach(b => {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      daysRented += Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    });

    const netProfit = vIncome - vExpenses;
    const profitMargin = vIncome > 0 ? ((netProfit / vIncome) * 100) : 0;
    const avgRevenuePerBooking = vBookings.length > 0 ? (vIncome / vBookings.length) : 0;

    return {
      id: v.id,
      name: `${v.make} ${v.model}`,
      plate: v.license_plate || 'No plate',
      dailyRate: Number(v.daily_rate) || 0,
      totalIncome: vIncome,
      totalExpenses: vExpenses,
      netProfit,
      profitMargin,
      bookingCount: vBookings.length,
      bookingRevenue,
      daysRented,
      avgRevenuePerBooking
    };
  });

  // === PRE-COMPUTED VEHICLE RANKINGS ===
  const sortedByProfit = [...vehicleFinancials].sort((a, b) => b.netProfit - a.netProfit);
  const sortedByBookings = [...vehicleFinancials].sort((a, b) => b.bookingCount - a.bookingCount);
  const sortedByRevenue = [...vehicleFinancials].sort((a, b) => b.totalIncome - a.totalIncome);
  
  const mostProfitableVehicle = sortedByProfit[0] || null;
  const leastProfitableVehicle = sortedByProfit.length > 0 ? sortedByProfit[sortedByProfit.length - 1] : null;
  const mostBookedVehicle = sortedByBookings[0] || null;
  const highestRevenueVehicle = sortedByRevenue[0] || null;

  // === EXPENSE CATEGORY BREAKDOWN ===
  const expensesByCategory: Record<string, number> = {};
  financials.filter(f => f.type === 'expense').forEach(f => {
    const cat = f.category || 'other';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(f.amount);
  });

  const sortedExpenseCategories: ExpenseCategory[] = Object.entries(expensesByCategory)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const topExpenseCategory = sortedExpenseCategories[0] || { name: 'none', amount: 0, percentage: 0 };

  // === INCOME SOURCE BREAKDOWN ===
  const incomeBySource: Record<string, number> = {};
  financials.filter(f => f.type === 'income').forEach(f => {
    const source = f.income_source_type || f.category || 'other';
    incomeBySource[source] = (incomeBySource[source] || 0) + Number(f.amount);
  });

  const sortedIncomeSources = Object.entries(incomeBySource)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // === MONTHLY PERFORMANCE ANALYSIS ===
  const monthlyPerformance: Record<string, { income: number; expenses: number; bookings: number }> = {};
  
  financials.forEach(f => {
    const month = f.date.substring(0, 7);
    if (!monthlyPerformance[month]) {
      monthlyPerformance[month] = { income: 0, expenses: 0, bookings: 0 };
    }
    if (f.type === 'income') {
      monthlyPerformance[month].income += Number(f.amount);
    } else {
      monthlyPerformance[month].expenses += Number(f.amount);
    }
  });

  bookings.forEach(b => {
    const month = b.start_date.substring(0, 7);
    if (!monthlyPerformance[month]) {
      monthlyPerformance[month] = { income: 0, expenses: 0, bookings: 0 };
    }
    monthlyPerformance[month].bookings += 1;
  });

  const sortedMonths: MonthlyPerformance[] = Object.entries(monthlyPerformance)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      netProfit: data.income - data.expenses,
      bookings: data.bookings
    }))
    .sort((a, b) => b.netProfit - a.netProfit);

  const bestMonth = sortedMonths[0] || null;
  const worstMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null;

  // === RECURRING EXPENSES SUMMARY ===
  const monthlyRecurring = recurringTransactions
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => {
      let monthlyAmount = Number(r.amount);
      if (r.frequency_unit === 'year') monthlyAmount = monthlyAmount / 12;
      if (r.frequency_unit === 'week') monthlyAmount = monthlyAmount * 4;
      if (r.frequency_unit === 'day') monthlyAmount = monthlyAmount * 30;
      return sum + monthlyAmount;
    }, 0);

  // === BOOKINGS BY STATUS ===
  const bookingsByStatus: Record<string, number> = {};
  bookings.forEach(b => {
    const status = b.status || 'unknown';
    bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1;
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
      sortedExpenseCategories,
      topExpenseCategory,
      incomeBySource,
      sortedIncomeSources,
      monthlyRecurring,
      recordCount: financials.length
    },
    fleet: { 
      count: vehicles.length, 
      vehicles: vehicleFinancials,
      rankings: {
        byProfit: sortedByProfit,
        byBookings: sortedByBookings,
        byRevenue: sortedByRevenue
      },
      mostProfitable: mostProfitableVehicle,
      leastProfitable: leastProfitableVehicle,
      mostBooked: mostBookedVehicle,
      highestRevenue: highestRevenueVehicle
    },
    bookings: { 
      total: bookings.length,
      byStatus: bookingsByStatus
    },
    performance: {
      monthlyBreakdown: sortedMonths,
      bestMonth,
      worstMonth
    }
  };
}

// ============= ENHANCED SYSTEM PROMPT WITH DATA DICTIONARY =============

function buildSystemPrompt(context: ReturnType<typeof buildBusinessContext>, presetType?: string) {
  
  // === DATA DICTIONARY FOR SEMANTIC MAPPING ===
  const dataDictionary = `
DATA DICTIONARY - Use these terms interchangeably when users ask questions:
• "profit" / "net profit" / "earnings" / "net income" / "gain" = totalIncome - totalExpenses
• "revenue" / "income" / "money earned" / "sales" = totalIncome
• "costs" / "spending" / "expenses" / "outgoing" = totalExpenses
• "car" / "vehicle" / "automobile" / "fleet member" = vehicle
• "booking" / "rental" / "reservation" / "hire" = rental booking
• "margin" / "profit margin" = (netProfit / totalIncome) × 100
• "best" / "top" / "highest" / "most" = ranked #1 in that metric
• "worst" / "lowest" / "least" = ranked last in that metric

EXPENSE CATEGORIES IN DATABASE:
maintenance, insurance, fuel, taxes, salaries, marketing, vehicle_parts, office, utilities, other

INCOME SOURCES IN DATABASE:
rental, booking, deposit, other
`;

  // === PRE-COMPUTED VEHICLE RANKINGS (DETERMINISTIC ANSWERS) ===
  const vehicleRankings = context.fleet.vehicles.length > 0 ? `
VEHICLE PROFITABILITY RANKING (from highest to lowest):
${context.fleet.rankings.byProfit.map((v, i) => 
  `${i + 1}. ${v.name} (${v.plate}): Net Profit €${v.netProfit.toFixed(2)} | Income €${v.totalIncome.toFixed(2)} | Expenses €${v.totalExpenses.toFixed(2)} | ${v.bookingCount} bookings | ${v.daysRented} days rented`
).join('\n')}

MOST PROFITABLE VEHICLE: ${context.fleet.mostProfitable ? `${context.fleet.mostProfitable.name} (${context.fleet.mostProfitable.plate}) with €${context.fleet.mostProfitable.netProfit.toFixed(2)} net profit` : 'No data available'}
LEAST PROFITABLE VEHICLE: ${context.fleet.leastProfitable ? `${context.fleet.leastProfitable.name} (${context.fleet.leastProfitable.plate}) with €${context.fleet.leastProfitable.netProfit.toFixed(2)} net profit` : 'No data available'}
MOST BOOKED VEHICLE: ${context.fleet.mostBooked ? `${context.fleet.mostBooked.name} (${context.fleet.mostBooked.plate}) with ${context.fleet.mostBooked.bookingCount} bookings` : 'No data available'}
HIGHEST REVENUE VEHICLE: ${context.fleet.highestRevenue ? `${context.fleet.highestRevenue.name} (${context.fleet.highestRevenue.plate}) with €${context.fleet.highestRevenue.totalIncome.toFixed(2)} total income` : 'No data available'}
` : 'VEHICLE DATA: No vehicles registered yet.';

  // === PRE-COMPUTED EXPENSE RANKINGS ===
  const expenseRankings = context.financials.sortedExpenseCategories.length > 0 ? `
EXPENSE CATEGORY RANKING (from highest to lowest):
${context.financials.sortedExpenseCategories.map((c, i) => 
  `${i + 1}. ${c.name}: €${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}% of total expenses)`
).join('\n')}

HIGHEST EXPENSE CATEGORY: ${context.financials.topExpenseCategory.name} at €${context.financials.topExpenseCategory.amount.toFixed(2)} (${context.financials.topExpenseCategory.percentage.toFixed(1)}%)
` : 'EXPENSE DATA: No expense records available yet.';

  // === PRE-COMPUTED MONTHLY PERFORMANCE ===
  const monthlyRankings = context.performance.monthlyBreakdown.length > 0 ? `
MONTHLY PERFORMANCE RANKING (by net profit):
${context.performance.monthlyBreakdown.slice(0, 12).map((m, i) => 
  `${i + 1}. ${m.month}: Net Profit €${m.netProfit.toFixed(2)} | Income €${m.income.toFixed(2)} | Expenses €${m.expenses.toFixed(2)} | ${m.bookings} bookings`
).join('\n')}

BEST PERFORMING MONTH: ${context.performance.bestMonth ? `${context.performance.bestMonth.month} with €${context.performance.bestMonth.netProfit.toFixed(2)} net profit` : 'Insufficient data'}
WORST PERFORMING MONTH: ${context.performance.worstMonth ? `${context.performance.worstMonth.month} with €${context.performance.worstMonth.netProfit.toFixed(2)} net profit` : 'Insufficient data'}
` : 'MONTHLY DATA: Insufficient records to analyze monthly trends.';

  // === INCOME SOURCE BREAKDOWN ===
  const incomeBreakdown = context.financials.sortedIncomeSources.length > 0 ? `
INCOME SOURCE BREAKDOWN:
${context.financials.sortedIncomeSources.map((s, i) => 
  `${i + 1}. ${s.name}: €${s.amount.toFixed(2)} (${s.percentage.toFixed(1)}% of total income)`
).join('\n')}
` : '';

  // === RESPONSE GUIDELINES ===
  const responseGuidelines = `
CRITICAL RESPONSE RULES:
1. When asked about "best", "highest", "top", "most" - ALWAYS use the pre-computed rankings above. DO NOT calculate or estimate.
2. ALWAYS cite exact numbers from the data provided. Example: "Your most profitable vehicle is [NAME] with €[AMOUNT] net profit."
3. If data is insufficient or missing, clearly state: "I don't have enough data to answer this question. You need to add more [financial records/bookings/vehicles]."
4. NEVER guess, approximate, or make up numbers. Only use facts from the data above.
5. For complex questions, show your reasoning step by step using the actual data.
6. When comparing vehicles, always include the specific numbers for each vehicle.
7. Use Euro (€) currency and format numbers to 2 decimal places.
`;

  // === BUILD COMPLETE SYSTEM PROMPT ===
  const basePrompt = `You are FleetX AI Assistant, a precise business intelligence assistant for ${context.profile.company || 'this fleet management company'} located in ${context.profile.location}.

${dataDictionary}

═══════════════════════════════════════════════════════════
BUSINESS OVERVIEW
═══════════════════════════════════════════════════════════
• Company: ${context.profile.company || 'Not specified'}
• Location: ${context.profile.location}
• Fleet Size: ${context.fleet.count} vehicles
• Total Bookings: ${context.bookings.total}
• Financial Records: ${context.financials.recordCount}

FINANCIAL SUMMARY:
• Total Income: €${context.financials.totalIncome.toFixed(2)}
• Total Expenses: €${context.financials.totalExpenses.toFixed(2)}
• Net Income: €${context.financials.netIncome.toFixed(2)}
• Monthly Recurring Expenses: €${context.financials.monthlyRecurring.toFixed(2)}

═══════════════════════════════════════════════════════════
VEHICLE ANALYTICS (Per-Vehicle Financial Breakdown)
═══════════════════════════════════════════════════════════
${vehicleRankings}

═══════════════════════════════════════════════════════════
EXPENSE ANALYTICS
═══════════════════════════════════════════════════════════
${expenseRankings}

═══════════════════════════════════════════════════════════
MONTHLY PERFORMANCE ANALYTICS
═══════════════════════════════════════════════════════════
${monthlyRankings}

${incomeBreakdown}

${responseGuidelines}`;

  // === PRESET-SPECIFIC PROMPTS ===
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
