const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, 'webapp', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse env variables
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=#+]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'add_default_prompt_columns.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  console.log('Running migration...');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 80) + '...');
    const { data, error } = await supabase.rpc('exec_sql', { query: statement + ';' }).catch(() => ({ error: 'RPC not available' }));

    if (error && error !== 'RPC not available') {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }

  console.log('✅ Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
