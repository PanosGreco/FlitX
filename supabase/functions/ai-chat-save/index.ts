import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { conversationId, userMessage, assistantMessage, title } = await req.json();

    let finalConversationId = conversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const conversationTitle = title || userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
      
      const { data: newConversation, error: createError } = await supabaseClient
        .from("ai_chat_conversations")
        .insert({
          user_id: user.id,
          title: conversationTitle
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw new Error("Failed to create conversation");
      }

      finalConversationId = newConversation.id;
    }

    // Save user message
    const { error: userMsgError } = await supabaseClient
      .from("ai_chat_messages")
      .insert({
        conversation_id: finalConversationId,
        user_id: user.id,
        role: "user",
        content: userMessage
      });

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
      throw new Error("Failed to save user message");
    }

    // Save assistant message
    const { error: assistantMsgError } = await supabaseClient
      .from("ai_chat_messages")
      .insert({
        conversation_id: finalConversationId,
        user_id: user.id,
        role: "assistant",
        content: assistantMessage
      });

    if (assistantMsgError) {
      console.error("Error saving assistant message:", assistantMsgError);
      throw new Error("Failed to save assistant message");
    }

    // Update conversation timestamp
    await supabaseClient
      .from("ai_chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", finalConversationId);

    return new Response(JSON.stringify({ 
      success: true, 
      conversationId: finalConversationId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Save chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
