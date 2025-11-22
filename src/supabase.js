import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';


const supabaseUrl = 'https://bfchuybsseczmjmmosda.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmY2h1eWJzc2Vjem1qbW1vc2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzM0MjIsImV4cCI6MjA3ODk0OTQyMn0.Hyag5CRs0-ih5o6pydkBQpa0h3oNzUM5LU_xjdw1TnA"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
  },
});