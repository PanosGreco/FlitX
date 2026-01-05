import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`Cleaning up completed tasks older than: ${cutoffDate}`);

    // First, get completed tasks with contract files that need cleanup
    const { data: tasksToDelete, error: fetchError } = await supabase
      .from("daily_tasks")
      .select("id, contract_path")
      .eq("status", "completed")
      .lt("updated_at", cutoffDate);

    if (fetchError) {
      throw new Error(`Failed to fetch tasks: ${fetchError.message}`);
    }

    let deletedCount = 0;
    let filesDeleted = 0;

    if (tasksToDelete && tasksToDelete.length > 0) {
      // Collect contract paths for deletion
      const contractPaths = tasksToDelete
        .map((task) => task.contract_path)
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

      // Delete the tasks from database
      const taskIds = tasksToDelete.map((task) => task.id);
      const { error: deleteError, count } = await supabase
        .from("daily_tasks")
        .delete()
        .in("id", taskIds);

      if (deleteError) {
        throw new Error(`Failed to delete tasks: ${deleteError.message}`);
      }

      deletedCount = taskIds.length;
      console.log(`Deleted ${deletedCount} completed tasks from database`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete`,
        tasksDeleted: deletedCount,
        filesDeleted: filesDeleted,
        cutoffDate: cutoffDate,
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
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
