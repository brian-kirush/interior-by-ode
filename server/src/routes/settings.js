const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get all settings
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.json({
            success: true,
            message: 'Settings retrieved',
            data: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get settings'
        });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await query(
                `INSERT INTO settings (setting_key, setting_value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (setting_key) 
                 DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
                [key, value]
            );
        }
        
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

module.exports = router;
