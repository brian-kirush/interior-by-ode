const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Get all settings
 */
const getSettings = catchAsync(async (req, res, next) => {
    const result = await pool.query('SELECT setting_key, setting_value FROM settings');
    
    // Transform the array of rows into a key-value object
    const settings = result.rows.reduce((acc, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
    }, {});
    
    res.json({
        success: true,
        message: 'Settings retrieved successfully',
        data: settings
    });
});

/**
 * Update settings
 */
const updateSettings = catchAsync(async (req, res, next) => {
    const settings = req.body;
    
    // Use Promise.all to run update queries in parallel for efficiency
    await Promise.all(Object.entries(settings).map(([key, value]) => 
        pool.query(
            `INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
            [key, value]
        )
    ));
    
    res.json({ success: true, message: 'Settings updated successfully' });
});

module.exports = { getSettings, updateSettings };