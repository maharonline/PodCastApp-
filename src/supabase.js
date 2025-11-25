import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Keep sessions persistent for better UX
    storage: AsyncStorage,
    autoRefreshToken: true, // Auto-refresh tokens to maintain session
    detectSessionInUrl: false, // Disable OAuth URL detection for React Native
    storageKey: 'supabase.auth.token', // Explicit storage key
  },
});
