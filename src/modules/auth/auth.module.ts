import { Router } from "express";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../core/asyncHandler";
import { ApiError } from "../../core/ApiError";
import { query, queryOne } from "../../db/query";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 8;

// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

type CredentialRow = {
  id: string;
  name: string;
  email: string;
  team: string;
  role: "admin" | "learner";
  password_hash: string;
  must_change_password: boolean;
  failed_attempts: number;
  locked_until: Date | null;
};

const router = Router();

function assertValidPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
}

/**
 * POST /api/auth/verify  { email, password }
 *
 * Checks a password and returns the identity the Next.js server needs to mint
 * a session. Every failure is a generic 401 so callers can't enumerate users.
 */
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      throw ApiError.badRequest("email and password are required.");
    }

    const row = await queryOne<CredentialRow>(
      `SELECT u.id, u.name, u.email, u.team, u.role,
              c.password_hash, c.must_change_password, c.failed_attempts, c.locked_until
         FROM users u JOIN user_credentials c ON c.user_id = u.id
        WHERE lower(u.email) = lower($1)`,
      [email.trim()]
    );

    if (!row) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw ApiError.unauthorized("Incorrect email or password.");
    }

    if (row.locked_until && row.locked_until.getTime() > Date.now()) {
      throw new ApiError(429, "Too many failed attempts. Please try again later.");
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      const attempts = row.failed_attempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await query(
        `UPDATE user_credentials
            SET failed_attempts = $2,
                locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE NULL END,
                updated_at = now()
          WHERE user_id = $1`,
        [row.id, lock ? 0 : attempts, lock, LOCK_MINUTES]
      );
      throw ApiError.unauthorized("Incorrect email or password.");
    }

    await query(
      `UPDATE user_credentials
          SET failed_attempts = 0, locked_until = NULL, last_login_at = now()
        WHERE user_id = $1`,
      [row.id]
    );

    res.json({
      user: { id: row.id, name: row.name, email: row.email, team: row.team, role: row.role },
      mustChangePassword: row.must_change_password,
    });
  })
);

/**
 * POST /api/auth/credentials  { userId, password, mustChangePassword? }
 *
 * Creates or replaces a user's password. Used by sign-up and admin user creation.
 */
router.post(
  "/credentials",
  asyncHandler(async (req, res) => {
    const { userId, password, mustChangePassword } = (req.body ?? {}) as {
      userId?: unknown;
      password?: unknown;
      mustChangePassword?: unknown;
    };
    if (typeof userId !== "string" || !userId) throw ApiError.badRequest("userId is required.");
    assertValidPassword(password);

    const user = await queryOne(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (!user) throw ApiError.notFound(`User ${userId} not found`);

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await query(
      `INSERT INTO user_credentials (user_id, password_hash, must_change_password)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             must_change_password = EXCLUDED.must_change_password,
             failed_attempts = 0,
             locked_until = NULL,
             updated_at = now()`,
      [userId, hash, mustChangePassword === true]
    );

    res.status(201).json({ ok: true });
  })
);

/**
 * POST /api/auth/change-password  { userId, currentPassword, newPassword }
 *
 * The caller (Next.js server) must already have established that userId is the
 * signed-in user; this re-checks the current password before replacing it.
 */
router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const { userId, currentPassword, newPassword } = (req.body ?? {}) as {
      userId?: unknown;
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof userId !== "string" || typeof currentPassword !== "string" || !userId || !currentPassword) {
      throw ApiError.badRequest("userId and currentPassword are required.");
    }
    assertValidPassword(newPassword);
    if (newPassword === currentPassword) {
      throw ApiError.badRequest("New password must be different from the current one.");
    }

    const row = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM user_credentials WHERE user_id = $1`,
      [userId]
    );
    if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) {
      throw ApiError.unauthorized("Current password is incorrect.");
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query(
      `UPDATE user_credentials
          SET password_hash = $2, must_change_password = false, updated_at = now()
        WHERE user_id = $1`,
      [userId, hash]
    );

    res.json({ ok: true });
  })
);

export default router;
