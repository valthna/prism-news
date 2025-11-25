/**
 * Service de feedback haptique pour améliorer l'expérience tactile
 * Utilise l'API Vibration quand disponible, sinon fallback silencieux
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

// Patterns de vibration en ms [vibrate, pause, vibrate, ...]
const HAPTIC_PATTERNS: Record<HapticStyle, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  selection: [5],
  success: [10, 50, 20],
  warning: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
};

/**
 * Vérifie si l'API Vibration est disponible
 */
export const isHapticSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Déclenche un feedback haptique
 * @param style - Le style de vibration souhaité
 */
export const triggerHaptic = (style: HapticStyle = 'light'): void => {
  if (!isHapticSupported()) return;
  
  try {
    const pattern = HAPTIC_PATTERNS[style] || HAPTIC_PATTERNS.light;
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail - haptic feedback is not critical
    console.debug('Haptic feedback failed:', error);
  }
};

/**
 * Feedback pour une action de tap/click
 */
export const hapticTap = (): void => triggerHaptic('light');

/**
 * Feedback pour une sélection
 */
export const hapticSelection = (): void => triggerHaptic('selection');

/**
 * Feedback pour une action réussie
 */
export const hapticSuccess = (): void => triggerHaptic('success');

/**
 * Feedback pour un avertissement
 */
export const hapticWarning = (): void => triggerHaptic('warning');

/**
 * Feedback pour une erreur
 */
export const hapticError = (): void => triggerHaptic('error');

/**
 * Hook React pour intégrer le haptic feedback dans les handlers
 */
export const withHaptic = <T extends (...args: unknown[]) => void>(
  handler: T,
  style: HapticStyle = 'light'
): T => {
  return ((...args: unknown[]) => {
    triggerHaptic(style);
    return handler(...args);
  }) as T;
};

export default {
  trigger: triggerHaptic,
  tap: hapticTap,
  selection: hapticSelection,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  isSupported: isHapticSupported,
  withHaptic,
};

