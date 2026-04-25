'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://revudisqdllbozahikcf.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldnVkaXNxZGxsYm96YWhpa2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTY2MTcsImV4cCI6MjA5MjY5MjYxN30.sl7IyQGmWZE_Fy1n3PScrRpXH96bAlFLOBGkuW1y8vs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

