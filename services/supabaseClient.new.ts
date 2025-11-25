/**
 * LEGACY COMPATIBILITY WRAPPER
 *
 * Ce fichier maintient la rétrocompatibilité avec l'ancien supabaseClient.
 * Pour les nouveaux développements, utilisez directement les API clients.
 *
 * Mapping:
 * - supabase → services/api/supabase/client.ts
 */

import { getSupabaseClient, getSupabaseUrl } from './api/supabase';

// Legacy export (nullable singleton)
export const supabase = getSupabaseClient();

// Legacy URL export
export const SUPABASE_URL = getSupabaseUrl();

console.log('[PRISM] supabaseClient.ts is deprecated. Use services/api/supabase/client.ts instead.');

