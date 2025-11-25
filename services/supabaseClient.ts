
import { createClient } from '@supabase/supabase-js';

type EnvRecord = Record<string, string | undefined>;

const getBrowserEnv = (): EnvRecord => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
            return (import.meta as any).env as EnvRecord;
        }
    } catch {
        // ignore
    }
    return {};
};

const getNodeEnv = (): EnvRecord => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env as EnvRecord;
    }
    return {};
};

const pickEnvValue = (...candidates: Array<string | undefined>): string | undefined => {
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return undefined;
};

const browserEnv = getBrowserEnv();
const nodeEnv = getNodeEnv();

const supabaseUrl = pickEnvValue(
    browserEnv.VITE_SUPABASE_URL,
    browserEnv.SUPABASE_URL,
    browserEnv.PUBLIC_SUPABASE_URL,
    nodeEnv.SUPABASE_URL,
    nodeEnv.VITE_SUPABASE_URL
);

const supabaseKey = pickEnvValue(
    browserEnv.VITE_SUPABASE_KEY,
    browserEnv.SUPABASE_KEY,
    browserEnv.SUPABASE_ANON_KEY,
    browserEnv.PUBLIC_SUPABASE_KEY,
    nodeEnv.SUPABASE_KEY,
    nodeEnv.SUPABASE_ANON_KEY,
    nodeEnv.VITE_SUPABASE_KEY
);

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing. Caching will be disabled.");
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Export de l'URL pour les autres services (image storage path, etc.)
export const SUPABASE_URL = supabaseUrl;
