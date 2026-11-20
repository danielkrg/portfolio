import bcrypt from 'bcryptjs';

/**
 * Print a bcrypt hash of the Owner password for PHOTOS_OWNER_PASSWORD_HASH
 * (ADR-0002). The plaintext is only ever hashed here; it is never stored.
 *
 *   npm run hash-password -w server -- 'your password here'
 */
const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -w server -- '<password>'");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(hash);
