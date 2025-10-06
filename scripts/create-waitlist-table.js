const { Client } = require('pg')

// Database connection from your environment
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.yeonbgjzgdbialjcmpbr:f%yK@zDsz5/L7_P@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'

async function createWaitlistTable() {
  const client = new Client(dbUrl)

  try {
    await client.connect()
    console.log('Connected to database')

    // Create the waitlist table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS waitlist (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    await client.query(createTableQuery)
    console.log('✅ Waitlist table created successfully!')

    // Verify table was created
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'waitlist'
      );
    `)

    if (checkTable.rows[0].exists) {
      console.log('✅ Table verified: waitlist table exists')
    }

  } catch (error) {
    console.error('❌ Error creating table:', error)
  } finally {
    await client.end()
    console.log('Database connection closed')
  }
}

createWaitlistTable()