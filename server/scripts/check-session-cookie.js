#!/usr/bin/env node
const fetch = require('node-fetch');
require('dotenv').config();

const BASE = process.env.TARGET_URL || (process.env.NODE_ENV === 'production' ? 'https://interior-by-ode.onrender.com' : 'http://localhost:5000');

async function main() {
  const url = `${BASE}/api/auth/login`;
  const credentials = {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@interiorsbyode.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'ode'
  };

  console.log('Checking login and Set-Cookie headers at', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  console.log('Status:', res.status);
  console.log('Headers:');
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase().includes('set-cookie')) {
      console.log('  Set-Cookie:', v);
    }
  }

  const body = await res.text();
  try {
    console.log('Body:', JSON.parse(body));
  } catch (e) {
    console.log('Body:', body);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});