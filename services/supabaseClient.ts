
import { createClient } from '@supabase/supabase-js';

type BrowserEnv = {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_KEY?: string;
};

const getBrowserEnv = (): BrowserEnv | undefined => {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
        return (import.meta as any).env as BrowserEnv;
    }
    return undefined;
};

const resolveEnvValue = (nodeKey: string, browserKey: keyof BrowserEnv): string | undefined => {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser && typeof process !== 'undefined' && process.env?.[nodeKey]) {
        return process.env[nodeKey];
    }
    const browserEnv = getBrowserEnv();
    return browserEnv?.[browserKey];
};

const supabaseUrl = resolveEnvValue('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = resolveEnvValue('SUPABASE_KEY', 'VITE_SUPABASE_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing. Caching will be disabled.");
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;
