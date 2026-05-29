import bcrypt from 'bcryptjs';

/**
 * Bcrypt cost factor. 10 ≈ 100 ms per hash on modern hardware — enough to
 * make brute-force expensive without making logins feel slow. Bump to 12+
 * if hardware gets faster or after a serious threat-model review.
 */
const COST_FACTOR = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
