-- =====================================================
-- RADIUS Server Database Initialization Script
-- =====================================================
-- This script creates the required tables for the RADIUS server
-- Run this ONCE before starting the application
--
-- Usage:
--   mysql -h <host> -u <user> -p <database> < init_database.sql
-- =====================================================

-- Create user_radius_access table
-- This table stores users allowed to access specific RADIUS servers
CREATE TABLE IF NOT EXISTS user_radius_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_principal_name VARCHAR(255) NOT NULL COMMENT 'Azure AD User Principal Name (email)',
    displayName VARCHAR(255) COMMENT 'User display name',
    radius_server_id VARCHAR(100) NOT NULL COMMENT 'RADIUS server identifier',
    password_hash VARCHAR(255) COMMENT 'Hashed password for local validation',
    last_password_update TIMESTAMP NULL COMMENT 'When password was last updated from Azure',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure a user can only be added once per RADIUS server
    UNIQUE KEY user_server_unique (user_principal_name, radius_server_id),
    
    -- Index for faster lookups
    INDEX idx_user_radius (user_principal_name, radius_server_id),
    INDEX idx_radius_server (radius_server_id)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores allowed users for RADIUS authentication';

-- Show tables created
SELECT 'Tables created successfully!' AS Status;
SHOW TABLES;
