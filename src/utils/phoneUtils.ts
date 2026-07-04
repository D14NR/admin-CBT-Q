/**
 * Normalize phone number to remove leading 0, 62, +62 and non-digit characters
 * Examples:
 * - 08999990431 -> 8999990431
 * - 628999990431 -> 8999990431
 * - +628999990431 -> 8999990431
 * - +62899-9990-431 -> 8999990431
 * - 0899 9990 431 -> 8999990431
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters (spaces, dashes, plus signs, etc.)
  let normalized = phone.replace(/\D/g, '');
  
  // Remove leading 62 (Indonesia country code)
  if (normalized.startsWith('62')) {
    normalized = normalized.substring(2);
  }
  
  // Remove leading 0
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  return normalized;
}

/**
 * Format phone number for display (optional)
 * Adds +62 prefix for Indonesian numbers
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return '';
  return `+62${normalized}`;
}
