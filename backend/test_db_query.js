require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Please set backend/.env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    console.log('Querying `emails` table (limit 5)...');
    const { data, error } = await supabase.from('emails').select('*').limit(5);
    if (error) {
      console.error('Supabase query error:', error.message || error);
      process.exit(1);
    }

    console.log('Rows returned:', Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length) {
      console.log('Sample row (first):', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No rows found in `emails`.');
    }

    console.log('\nQuerying `prompts` table (limit 5)...');
    const p = await supabase.from('prompts').select('*').limit(5);
    if (p.error) {
      console.error('Supabase prompts query error:', p.error.message || p.error);
      process.exit(1);
    }
    console.log('Prompts rows returned:', Array.isArray(p.data) ? p.data.length : 0);
    if (Array.isArray(p.data) && p.data.length) console.log('Sample prompt:', JSON.stringify(p.data[0], null, 2));

    console.log('\nDB check complete — tables reachable.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error during DB check:', err.message || err);
    process.exit(1);
  }
}

run();
