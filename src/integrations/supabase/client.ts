
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iboajumvexldonfrmuuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlib2FqdW12ZXhsZG9uZnJtdXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MDAyNzksImV4cCI6MjA2MTA3NjI3OX0.x3IElColhOJHd1fLSRrS3pAv_L5WsrssNVH7Eg51jK4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  }
});
