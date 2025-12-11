const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Checks if the session table exists and creates it if missing.
 * Protected route (should be called by an admin only).
 */
exports.checkSessionTable = catchAsync(async (req, res, next) => {
  try {
    const check = await pool.query("SELECT to_regclass('public.session') AS exists");
    const exists = check.rows[0].exists;
    let created = false;

    if (!exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      )`);
      created = true;
    }

    res.json({
      success: true,
      message: 'Session table checked',
      exists: !!exists,
      created
    });
  } catch (err) {
    return next(new AppError('Failed to check/create session table: ' + err.message, 500));
  }
});

/**
 * Force recreate the session table: rename existing table to a backup name and create a fresh table.
 * Admin only.
 */
exports.forceRecreateSessionTable = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query("SELECT to_regclass('public.session') AS exists");
    const exists = check.rows[0].exists;
    let renamedTo = null;

    if (exists) {
      // Build timestamped backup name
      const now = new Date();
      const ts = now.toISOString().replace(/[-:TZ.]/g, '').slice(0,14);
      const backupName = `session_bak_${ts}`;
      // Rename existing table to backup name
      await client.query(`ALTER TABLE public.session RENAME TO "${backupName}"`);
      renamedTo = backupName;
    }

    // Create fresh session table expected by connect-pg-simple
    await client.query(`CREATE TABLE IF NOT EXISTS public.session (
      sid varchar NOT NULL,
      sess json NOT NULL,
      expire timestamp(6) NOT NULL,
      PRIMARY KEY (sid)
    )`);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Session table force-recreated',
      renamedTo,
      created: true
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(new AppError('Failed to force recreate session table: ' + err.message, 500));
  } finally {
    client.release();
  }
});
