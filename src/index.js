import { config } from "dotenv"
config()
import RadiusServer from './servers/radius.js'
import { waitForDatabase, initDatabase } from './utils/database.js'

// Initialize application with automatic database initialization
async function startApplication() {
  try {
    console.log("🚀 Starting RADIUS Server...")
    
    // Wait for database with retries
    await waitForDatabase({ timeoutMs: 60000, intervalMs: 1500 })
    
    // Initialize database tables (creates if not exist)
    try {
      await initDatabase()
    } catch (error) {
      console.error("❌ Failed to initialize database tables:", error.message)
      process.exit(1)
    }
    
    // Start RADIUS server
    await new RadiusServer().start()
    
    console.log("✅ RADIUS Server started successfully")
  } catch (error) {
    console.error("❌ Failed to start application:", error)
    process.exit(1)
  }
}

// Start the application
startApplication()

// Error handlers
process.on('uncaughtException', function (err) {
  console.error('❌ Uncaught exception:', err)
})

process.on('unhandledRejection', function (err) {
  console.error('❌ Unhandled rejection:', err)
})