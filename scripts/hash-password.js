// scripts/hash-password.js
// Dev helper: compute a PBKDF2 password hash (Web Crypto) for the admin seed row or
// any password. Uses the SAME hashPassword() as the runtime so the resulting string
// verifies against auth.verifyPassword().
//
// Usage:
//   node scripts/hash-password.js 'ChangeMe!Admin1'
//   node scripts/hash-password.js            # defaults to ChangeMe!Admin1
//
// Runs on Node's global Web Crypto (Node >= 20). No Node-only crypto module is used.

import { hashPassword } from '../functions/lib/auth.js';

const password = process.argv[2] || 'ChangeMe!Admin1';
const hash = await hashPassword(password);
// Print just the hash string so it can be piped into the seed SQL.
console.log(hash);
