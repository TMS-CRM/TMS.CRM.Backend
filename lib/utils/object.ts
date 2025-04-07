import { createHash } from 'crypto';

/**
 * Hashes an object using SHA-256.
 * @param obj - The object to hash.
 * @returns The SHA-256 hash of the object.
 */
export function hashObject(obj: Record<string, unknown>): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}
