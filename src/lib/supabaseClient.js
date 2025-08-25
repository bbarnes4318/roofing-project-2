import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables only (no insecure fallbacks)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Log what we're using (for debugging)
if (!isSupabaseConfigured) {
  console.warn('Supabase env not set. Define REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
}

// Create and export the Supabase client (safe when not configured)
let supabaseClient = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // More secure for public clients
    },
  });
}

// Provide a minimal safe stub when not configured so the app doesn't crash
const stubAuth = {
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signOut: async () => ({ error: null }),
  signUp: async () => { throw new Error('Supabase is not configured'); },
  signInWithPassword: async () => { throw new Error('Supabase is not configured'); },
  resetPasswordForEmail: async () => { throw new Error('Supabase is not configured'); },
  getUser: async () => ({ data: { user: null }, error: null })
};

export const supabase = supabaseClient || { auth: stubAuth };

// Helper function to get current user
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

// Helper function to check if user is verified
export const isUserVerified = (user) => {
  if (!user) return false;
  // Check email confirmation status
  return user.email_confirmed_at !== null;
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Helper function to send password reset email
export const sendPasswordResetEmail = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    throw error;
  }
};

// Helper function to update password
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw error;
  }
};