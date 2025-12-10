#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔍 Checking database connection...');
        
        // Test connection
        const result = await pool.query('SELECT NOW() as time, version() as version');
        console.log('✅ Database connected');
        console.log('   Time:', result.rows[0].time);
        console.log('   PostgreSQL:', result.rows[0].version.split(' ')[1]);
        
        // Check tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📊 Tables found:', tables.rows.length);
        tables.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.table_name}`);
        });
        
        // Count records in key tables
        const keyTables = ['users', 'clients', 'projects', 'settings'];
        console.log('\n📈 Record counts:');
        
        for (const table of keyTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`   ${table}: Table not found`);
            }
        }
        
        console.log('\n🎉 Database is ready!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    checkDatabase();
}
