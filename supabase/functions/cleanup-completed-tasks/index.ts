import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Contract Attachment Cleanup Function
 * 
 * STRICT DATA RETENTION POLICY:
 * - ONLY deletes booking contract ATTACHMENTS (files in storage)
 * - NEVER deletes: bookings, daily tasks, financial records, vehicles, maintenance, damages
 * - Contract files are deleted 30 days AFTER the booking end_date
 * - Booking records remain intact, only the contract_photo_path reference is cleared
 * 
 * SECURITY:
 * - Requires authentication (valid JWT token)
 * - Requires admin role to execute
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing or invalid authorization header" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Create client with user's token to verify authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT token and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Authentication failed:", claimsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired authentication token" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "User ID not found in token" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // === AUTHORIZATION CHECK (Admin Role Required) ===
    // Use service role client to check user roles (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error("Role check failed:", roleError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to verify user permissions" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!roleData || roleData.role !== "admin") {
      console.log(`Access denied for user ${userId}. Role: ${roleData?.role || 'none'}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Forbidden: Admin access required to perform cleanup operations" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    console.log(`Cleanup initiated by admin user: ${userId}`);

    // === CLEANUP LOGIC (using service role for admin operations) ===
    const supabase = adminClient;

    // Calculate the date 30 days ago (for bookings that ended 30+ days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Cleaning up contract attachments for bookings ended before: ${cutoffDate}`);

    // Find bookings with contract files where end_date is older than 30 days
    const { data: bookingsWithContracts, error: fetchError } = await supabase
      .from("rental_bookings")
      .select("id, contract_photo_path")
      .not("contract_photo_path", "is", null)
      .lt("end_date", cutoffDate);

    if (fetchError) {
      throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
    }

    let filesDeleted = 0;
    let bookingsUpdated = 0;

    if (bookingsWithContracts && bookingsWithContracts.length > 0) {
      console.log(`Found ${bookingsWithContracts.length} bookings with contract files to clean up`);

      // Collect contract paths for deletion
      const contractPaths = bookingsWithContracts
        .map((booking) => booking.contract_photo_path)
        .filter(Boolean) as string[];

      // Delete contract files from storage
      if (contractPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("rental-contracts")
          .remove(contractPaths);

        if (storageError) {
          console.error("Error deleting contract files:", storageError);
        } else {
          filesDeleted = contractPaths.length;
          console.log(`Deleted ${filesDeleted} contract files from storage`);
        }
      }

      // Clear contract_photo_path references in bookings (but keep the bookings!)
      const bookingIds = bookingsWithContracts.map((booking) => booking.id);
      const { error: updateError } = await supabase
        .from("rental_bookings")
        .update({ contract_photo_path: null })
        .in("id", bookingIds);

      if (updateError) {
        console.error("Error clearing contract references:", updateError);
      } else {
        bookingsUpdated = bookingIds.length;
        console.log(`Cleared contract references from ${bookingsUpdated} bookings`);
      }
    } else {
      console.log("No contract files found for cleanup");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contract attachment cleanup complete`,
        filesDeleted: filesDeleted,
        bookingsUpdated: bookingsUpdated,
        cutoffDate: cutoffDate,
        executedBy: userId,
        note: "Only contract files were deleted. All bookings, tasks, and records remain intact."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred during cleanup",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
