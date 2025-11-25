/**
 * Client Supabase singleton
 * Gère la connexion et l'état du client Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config';
import { isNetworkError } from '../../core/errors';

// ============================================================================
// STATE
// ============================================================================

let supabaseClient: SupabaseClient | null = null;
let disabledReason: string | null = null;

// ============================================================================
// CLIENT FACTORY
// ============================================================================

/**
 * Initialise le client Supabase si non déjà fait
 */
const initializeClient = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;

  const url = env.supabaseUrl;
  const key = env.supabaseKey;

  if (!url || !key) {
    console.warn('[Supabase] Credentials manquantes. Le caching sera désactivé.');
    return null;
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Retourne le client Supabase (ou null si non configuré)
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  return initializeClient();
};

/**
 * Vérifie si Supabase est actif et utilisable
 */
export const isSupabaseActive = (): boolean => {
  return Boolean(initializeClient()) && !disabledReason;
};

/**
 * Désactive Supabase pour la session courante
 * Utilisé quand des erreurs réseau répétées sont détectées
 */
export const disableSupabaseForSession = (context: string, error?: unknown): void => {
  if (disabledReason) return;

  disabledReason = context;
  console.warn(`[Supabase] Désactivé pour cette session (${context}).`);
  if (error) {
    console.warn(error);
  }
};

/**
 * Retourne la raison de désactivation (ou null si actif)
 */
export const getDisabledReason = (): string | null => disabledReason;

/**
 * Réactive Supabase (utile pour les tests)
 */
export const reEnableSupabase = (): void => {
  disabledReason = null;
};

/**
 * Wrapper safe pour les opérations Supabase
 * Désactive automatiquement en cas d'erreur réseau
 */
export const withSupabaseErrorHandling = async <T>(
  operation: string,
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T | null> => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseActive()) {
    return null;
  }

  try {
    return await fn(client);
  } catch (error) {
    console.warn(`[Supabase] Erreur lors de "${operation}":`, error);
    if (isNetworkError(error)) {
      disableSupabaseForSession(operation, error);
    }
    return null;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

// Export l'URL pour les services qui en ont besoin (ex: construction d'URLs publiques)
export const getSupabaseUrl = (): string | undefined => env.supabaseUrl;

