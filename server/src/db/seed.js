import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  console.log('Seeding database...');
  
  try {
    // Check if demo users exist
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', ['user@demo.com']);
    
    if (existing.rows.length > 0) {
      console.log('Demo users already exist, skipping seed.');
      await pool.end();
      return;
    }

    // Hash passwords
    const userPassword = await bcrypt.hash('Demo@123', 12);
    const adminPassword = await bcrypt.hash('Admin@123', 12);

    // Insert demo user
    await pool.query(`
      INSERT INTO users (email, password_hash, name, phone, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['user@demo.com', userPassword, 'John Doe', '+1234567890', 'user', true]);

    // Insert demo registrar
    await pool.query(`
      INSERT INTO users (email, password_hash, name, phone, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['registrar@demo.com', adminPassword, 'Admin Registrar', '+0987654321', 'registrar', true]);

    console.log('✓ Demo users created:');
    console.log('  User: user@demo.com / Demo@123');
    console.log('  Registrar: registrar@demo.com / Admin@123');
    
  } catch (err) {
    console.error('Seed failed:', err.message);
  }
  
  await pool.end();
}

seed();
