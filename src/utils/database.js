import mysql from "mysql2/promise"

// Create connection pool without automatic initialization
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

/**
 * Execute a SQL query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error) {
    console.error("Database query error:", error.message)
    throw error
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
export async function testConnection() {
  try {
    await pool.query("SELECT 1")
    console.log("✅ Database connection successful")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    return false
  }
}

/**
 * Wait for database to become available with retries
 * @param {Object} options
 * @param {number} options.timeoutMs - Max time to wait
 * @param {number} options.intervalMs - Time between retries
 */
export async function waitForDatabase({ timeoutMs = 45000, intervalMs = 1500 } = {}) {
  const start = Date.now()
  const target = `${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  console.log(`⏳ Waiting for database ${target} ...`)

  let attempt = 0
  do {
    attempt += 1
    const ok = await testConnection()
    if (ok) return true

    const elapsed = Date.now() - start
    if (elapsed >= timeoutMs) break

    const wait = Math.min(intervalMs * Math.min(attempt, 4), 5000)
    await new Promise((r) => setTimeout(r, wait))
  } while (Date.now() - start < timeoutMs)

  throw new Error("Database not reachable within timeout")
}

/**
 * AUTO TABLE INITIALIZATION
 * 
 * This function is called automatically on startup.
 * It creates tables if they don't exist using CREATE TABLE IF NOT EXISTS.
 * 
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    console.log("📋 Checking and initializing database tables...")
    
    // Create user_radius_access table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS user_radius_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_principal_name VARCHAR(255) NOT NULL COMMENT 'Azure AD User Principal Name (email)',
        displayName VARCHAR(255) COMMENT 'User display name',
        radius_server_id VARCHAR(100) NOT NULL COMMENT 'RADIUS server identifier',
        password_hash VARCHAR(255) COMMENT 'Hashed password for local validation',
        last_password_update TIMESTAMP NULL COMMENT 'When password was last updated from Azure',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_server_unique (user_principal_name, radius_server_id),
        INDEX idx_user_radius (user_principal_name, radius_server_id),
        INDEX idx_radius_server (radius_server_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores allowed users for RADIUS authentication'
    `)

    // Add password_hash column if it doesn't exist (migration for existing tables)
    await query(`
      ALTER TABLE user_radius_access 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) COMMENT 'Hashed password for local validation',
      ADD COLUMN IF NOT EXISTS last_password_update TIMESTAMP NULL COMMENT 'When password was last updated from Azure'
    `).catch(() => console.log('Password columns already exist'))

    console.log("✅ Database tables verified/initialized successfully")
    return true
  } catch (error) {
    console.error("❌ Error initializing database:", error.message)
    throw error
  }
}

/**
 * Check if specific table exists
 * @param {string} tableName - Table name to check
 * @returns {Promise<boolean>} True if table exists
 */
export async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [process.env.DB_NAME, tableName]
    )
    return result[0].count > 0
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message)
    return false
  }
}

/**
 * MANUAL TABLE INITIALIZATION (deprecated - use initDatabase instead)
 * @deprecated Use initDatabase() instead
 */
export async function manualInitDatabase() {
  return initDatabase()
}

// Export pool for advanced usage if needed
export { pool }
