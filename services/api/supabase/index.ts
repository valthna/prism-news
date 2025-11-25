/**
 * Supabase API module - Export principal
 */

export {
  getSupabaseClient,
  isSupabaseActive,
  disableSupabaseForSession,
  getDisabledReason,
  reEnableSupabase,
  withSupabaseErrorHandling,
  getSupabaseUrl,
} from './client';

