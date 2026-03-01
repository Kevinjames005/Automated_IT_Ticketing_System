// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://idsvouhqlcazoracgkgv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkc3ZvdWhxbGNhem9yYWNna2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjUwMjAsImV4cCI6MjA4NzAwMTAyMH0.FJbvWPIy8q4FPM7yzkNDISCHqgj-fbRMKpOin-gJO1k"
);
window._supabase = supabase;
export default supabase;