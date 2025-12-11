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
