import { createClient } from '@supabase/supabase-js';

// Expo SDK 50+ only inlines EXPO_PUBLIC_ vars in the client bundle.
// Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your
// Vercel environment variables (same values as your NEXT_PUBLIC_ ones).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
