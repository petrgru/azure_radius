import { query } from "./database.js"
import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js"
import { ClientSecretCredential } from "@azure/identity"
import crypto from "crypto"

// Initialize Azure AD Graph Client for user queries
function initAzureGraphClient() {
  try {
    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET

    if (!tenantId || !clientId || !clientSecret) {
      console.error("❌ Missing Azure AD credentials for user queries")
      return null
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    })

    return Client.initWithMiddleware({
      authProvider: authProvider,
    })
  } catch (error) {
    console.error("❌ Error initializing Azure Graph client:", error.message)
    return null
  }
}

const azureGraphClient = initAzureGraphClient()

/**
 * Query user from Azure AD
 * @param {string} username - User principal name or email
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function queryUserFromAzureAD(username) {
  if (!azureGraphClient) {
    console.warn("⚠️  Azure AD client not initialized")
    return null
  }

  try {
    console.log(`🔍 Querying Azure AD for user: ${username}`)
    
    // Query user from Azure AD by userPrincipalName or mail
    const user = await azureGraphClient.api(`/users/${username}`).get()
    
    console.log(`✅ Found user in Azure AD: ${user.displayName} (${user.userPrincipalName})`)
    return user
  } catch (error) {
    if (error.statusCode === 404) {
      console.warn(`⚠️  User ${username} not found in Azure AD`)
    } else {
      console.error(`❌ Error querying Azure AD for ${username}:`, error.message)
    }
    return null
  }
}

/**
 * Get all users from Azure AD (optional - for bulk syncing)
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllUsersFromAzureAD() {
  if (!azureGraphClient) {
    console.warn("⚠️  Azure AD client not initialized")
    return []
  }

  try {
    console.log("📋 Fetching all users from Azure AD...")
    
    const users = await azureGraphClient.api("/users").get()
    console.log(`✅ Found ${users.value.length} users in Azure AD`)
    
    return users.value
  } catch (error) {
    console.error("❌ Error fetching users from Azure AD:", error.message)
    return []
  }
}

/**
 * Get all allowed users from local database
 */
export async function getAllowedUsers() {
  const radiusServerId = process.env.RADIUS_SERVER_ID

  // Obtener todos los usuarios permitidos para este servidor RADIUS específico
  return await query("SELECT * FROM user_radius_access WHERE radius_server_id = ?", [radiusServerId])
}

/**
 * Check if user is allowed (checks both local DB and Azure AD)
 * @param {string} username - User principal name
 * @returns {Promise<boolean>} True if user is allowed
 */
export async function isUserAllowed(username) {
  const radiusServerId = process.env.RADIUS_SERVER_ID

  console.log(`🔐 Checking if user ${username} is allowed for RADIUS server ID ${radiusServerId}`)

  try {
    // 1️⃣ First check: Local database (fast)
    const dbUsers = await query(
      "SELECT * FROM user_radius_access WHERE user_principal_name = ? AND radius_server_id = ?",
      [username, radiusServerId],
    )

    if (dbUsers && dbUsers.length > 0) {
      console.log(`✅ User ${username} found in local database`)
      return true
    }

    console.log(`⚠️  User ${username} not in local database, checking Azure AD...`)

    // 2️⃣ Second check: Azure AD (if not in DB)
    // This allows real-time queries without storing all users locally
    const azureUser = await queryUserFromAzureAD(username)
    
    if (azureUser) {
      console.log(`✅ User ${username} exists in Azure AD`)
      
      // Optional: Auto-add to database for future lookups
      try {
        await addAllowedUser({
          userPrincipalName: azureUser.userPrincipalName,
          displayName: azureUser.displayName,
        })
        console.log(`✅ User ${username} added to local database`)
      } catch (error) {
        console.warn(`⚠️  Could not auto-add user to database: ${error.message}`)
      }
      
      return true
    }

    console.log(`❌ User ${username} not found in Azure AD either`)
    return false
  } catch (error) {
    console.error(`❌ Error checking user ${username}:`, error.message)
    return false
  }
}

export async function addAllowedUser(user) {
  try {
    const radiusServerId = process.env.RADIUS_SERVER_ID

    // Insertar el usuario con el servidor RADIUS específico
    await query(
      "INSERT INTO user_radius_access (user_principal_name, displayName, radius_server_id) VALUES (?, ?, ?)",
      [user.userPrincipalName, user.displayName, radiusServerId],
    )

    console.log(`✅ User ${user.userPrincipalName} added to database`)
    return true
  } catch (error) {
    console.error("❌ Error adding allowed user:", error.message)
    return false
  }
}

export async function removeAllowedUser(username) {
  try {
    const radiusServerId = process.env.RADIUS_SERVER_ID

    // Eliminar el usuario para este servidor RADIUS específico
    await query("DELETE FROM user_radius_access WHERE user_principal_name = ? AND radius_server_id = ?", [
      username,
      radiusServerId,
    ])

    console.log(`✅ User ${username} removed from database`)
    return true
  } catch (error) {
    console.error("❌ Error removing allowed user:", error.message)
    return false
  }
}

/**
 * Hash password using SHA-256 (for RADIUS cache, not production security)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Verify password against stored hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {boolean} True if password matches
 */
export function verifyPassword(password, hash) {
  return hashPassword(password) === hash
}

/**
 * Update user's password hash in database
 * @param {string} username - User principal name
 * @param {string} password - Plain text password to hash and store
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserPassword(username, password) {
  try {
    const radiusServerId = process.env.RADIUS_SERVER_ID
    const passwordHash = hashPassword(password)

    await query(
      "UPDATE user_radius_access SET password_hash = ?, last_password_update = CURRENT_TIMESTAMP WHERE user_principal_name = ? AND radius_server_id = ?",
      [passwordHash, username, radiusServerId]
    )

    console.log(`✅ Password updated for user ${username}`)
    return true
  } catch (error) {
    console.error(`❌ Error updating password for ${username}:`, error.message)
    return false
  }
}

/**
 * Get user with password hash from database
 * @param {string} username - User principal name
 * @returns {Promise<Object|null>} User object with password_hash or null
 */
export async function getUserWithPassword(username) {
  try {
    const radiusServerId = process.env.RADIUS_SERVER_ID
    const users = await query(
      "SELECT * FROM user_radius_access WHERE user_principal_name = ? AND radius_server_id = ?",
      [username, radiusServerId]
    )

    return users && users.length > 0 ? users[0] : null
  } catch (error) {
    console.error(`❌ Error getting user ${username}:`, error.message)
    return null
  }
}

export { azureGraphClient }
