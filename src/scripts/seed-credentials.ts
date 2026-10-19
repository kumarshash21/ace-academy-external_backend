/**
 * One-off: gives every user that has no credentials a random temporary
 * password (must_change_password = true) and prints them once.
 *
 * Run with: npm run seed-credentials
 *
 * Passwords are never stored in plaintext; copy the printed table and hand
 * each temporary password to its owner. Re-running only touches users who
 * still have no credentials.
 */
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { pool, closePool } from "../db/pool";

function tempPassword(): string {
  // 12 chars from an unambiguous alphabet.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main(): Promise<void> {
  const { rows } = await pool.query<{ id: string; email: string }>(
    `SELECT u.id, u.email FROM users u
      LEFT JOIN user_credentials c ON c.user_id = u.id
      WHERE c.user_id IS NULL
      ORDER BY u.email`
  );

  if (rows.length === 0) {
    console.log("[seed-credentials] Every user already has credentials.");
    return;
  }

  const issued: Array<{ email: string; temporaryPassword: string }> = [];
  for (const user of rows) {
    const password = tempPassword();
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO user_credentials (user_id, password_hash, must_change_password)
       VALUES ($1, $2, true) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, hash]
    );
    issued.push({ email: user.email, temporaryPassword: password });
  }

  console.log(`[seed-credentials] Issued ${issued.length} temporary password(s) — shown once:`);
  console.table(issued);
}

main()
  .catch((err) => {
    console.error("[seed-credentials] Failed:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => void closePool());
