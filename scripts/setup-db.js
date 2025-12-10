#!/usr/bin/env node
require('dotenv').config();

const { setupDatabase } = require('./database-setup');

async function main() {
    try {
        console.log('🚀 Starting database setup...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        
        const result = await setupDatabase();
        
        if (result.success) {
            console.log('\n✅ Database setup completed successfully!');
            console.log('\n📋 Summary:');
            console.log('- Tables created/verified');
            console.log('- Triggers set up');
            console.log('- Default settings inserted');
            console.log('- Admin user created (if needed)');
            console.log('\n🔑 Default admin credentials:');
            console.log('   Email: admin@interiorsbyode.com');
            console.log('   Password: ode');
            console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
            process.exit(0);
        }
    } catch (error) {
        console.error('\n❌ Database setup failed:');
        console.error('Error:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('1. Check DATABASE_URL environment variable');
        console.error('2. Verify database permissions');
        console.error('3. Check if database exists');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
