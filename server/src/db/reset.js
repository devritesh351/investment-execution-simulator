import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function reset() {
  console.log('⚠️  Resetting database...');
  
  try {
    // Drop tables in order (respecting foreign keys)
    await pool.query('DROP TABLE IF EXISTS state_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('✓ All tables dropped');
    console.log('Run "npm run db:migrate" to recreate tables');
    console.log('Run "npm run db:seed" to add demo users');
    
  } catch (err) {
    console.error('Reset failed:', err.message);
  }
  
  await pool.end();
}

reset();
