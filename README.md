# Azure RADIUS Server

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Azure](https://img.shields.io/badge/Azure-AD%20Integration-blue.svg)](https://azure.microsoft.com/)
[![RADIUS](https://img.shields.io/badge/Protocol-RADIUS-orange.svg)](https://tools.ietf.org/html/rfc2865)

A modern and scalable RADIUS server that integrates with Azure Active Directory for user authentication. Supports multiple domains, hybrid credential validation, and is optimized to work with FortiGate and other network devices.

## 🚀 Key Features

- ✅ **Azure AD Integration**: Authentication using Microsoft Graph API
- ✅ **Multi-Domain Support**: Configuration for multiple allowed domains
- ✅ **Hybrid Validation**: Combines user validation with credential verification
- ✅ **Rate Limiting**: Protection against brute force attacks
- ✅ **Smart Caching**: Caching of successful validations to improve performance
- ✅ **Detailed Logging**: Structured logs with Winston
- ✅ **Docker Ready**: Complete containerization with Docker Compose
- ✅ **MySQL Integration**: Database for data storage
- ✅ **MFA Support**: Basic support for users with Multi-Factor Authentication

## 📋 Prerequisites

### Required Software
- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 1.29 or higher)
- **Git** (to clone the repository)
- **Bash** (to run the setup script)

### Azure AD Account
- **Tenant ID** from Azure Active Directory
- **Application Registration** with application permissions
- **Client ID** and **Client Secret** from the application
- **RADIUS Server ID** generated in Azure

### Azure AD Permissions
The registered application must have the following permissions:
- `User.Read.All` (Application)
- `Directory.Read.All` (Application)

## 🛠️ Quick Installation

### Option 1: Automatic Script (Recommended)

```bash
# Clone the repository
git clone https://github.com/De0xyS3/azure_radius.git
cd azure_radius

# Make the script executable
chmod +x setup_radius.sh

# Run the setup script
sudo ./setup_radius.sh
```

The automatic script:
- ✅ Installs Docker and Docker Compose if not present
- ✅ Configures MySQL automatically
- ✅ Requests all necessary Azure information
- ✅ Allows configuration of multiple domains
- ✅ Creates and configures all necessary files
- ✅ Starts services automatically

### Option 2: Manual Configuration

```bash
# 1. Clone the repository
git clone https://github.com/De0xyS3/azure_radius.git
cd azure_radius

# 2. Create .env file
cp .env.example .env
# Edit .env with your Azure credentials

# 3. Initialize database (REQUIRED - First time)
./init_database_docker.sh
# Or see DATABASE_SETUP.md for manual options

# 4. Build and run
docker-compose up -d
```

> **⚠️ IMPORTANT**: You must initialize the database BEFORE first use. See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
RADIUS_SERVER_ID=your-radius-server-id

# RADIUS Configuration
RADIUS_SECRET=your-radius-secret
PORT=1812

# Database Configuration
DB_HOST=radius-mysql
DB_PORT=3306
DB_NAME=radius_user
DB_USER=radiususer
DB_PASSWORD=your-db-password

# Domain Configuration
ALLOWED_DOMAINS=globalhitss.com,otherdomain.com

# Debug Configuration
DEBUG=*
```

### Domain Configuration

#### Single Domain
```env
ALLOWED_DOMAINS=contoso.com
```

#### Multiple Domains
```env
ALLOWED_DOMAINS=contoso.com,otherdomain.com,thirddomain.com
```

## 🗄️ Database Configuration

### Required Initialization

**The server does NOT create tables automatically.** You must initialize the database before first use.

#### Option 1: Interactive Script (Recommended)
```bash
./init_database_docker.sh
```

#### Option 2: Manual Command
```bash
# If MySQL is in Docker
docker exec -i mysql_container mysql -u root -p$MYSQL_ROOT_PASSWORD radius_db < init_database.sql

# If RADIUS is in Docker and MySQL is external
docker exec -i radius_container sh -c 'mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME' < init_database.sql
```

#### Option 3: From host
```bash
mysql -h <host> -u <user> -p<password> <database> < init_database.sql
```

📖 **See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions**

### Database Structure

The `user_radius_access` table stores allowed users:
```sql
CREATE TABLE user_radius_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_principal_name VARCHAR(255) NOT NULL,
    displayName VARCHAR(255),
    radius_server_id VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Azure AD Configuration

#### 1. Register Application in Azure AD
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click on **New registration**
4. Complete the information:
   - **Name**: `RADIUS Server`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave empty

#### 2. Configure Permissions
1. Go to **API permissions**
2. Click on **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions**
5. Add:
   - `User.Read.All`
   - `Directory.Read.All`
6. Click on **Grant admin consent**

#### 3. Create Client Secret
1. Go to **Certificates & secrets**
2. Click on **New client secret**
3. Add description and select expiration
4. **Copy the value** (only shown once)

#### 4. Get IDs
- **Tenant ID**: In application **Overview**
- **Client ID**: In application **Overview**
- **Client Secret**: The value copied in the previous step

## 🔧 FortiGate Configuration

### Basic Configuration
```fortios
config user radius
    edit "Azure-RADIUS"
        set server "RADIUS-SERVER-IP"
        set secret "YOUR-RADIUS-SECRET"
        set port 1812
        set auth-type auto
    next
end
```

### Policy Configuration
```fortios
config firewall policy
    edit 1
        set name "VPN-Policy"
        set srcintf "port1"
        set dstintf "port2"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set groups "Azure-RADIUS-Group"
        set ssl-ssh-profile "certificate-inspection"
    next
end
```

## 📊 Monitoring and Logs

### View Server Logs
```bash
# View logs in real-time
docker logs -f radius-container-name

# View last 100 events
docker logs --tail 100 radius-container-name

# View logs with timestamps
docker logs -t radius-container-name
```

### Important Logs
- `✅ credentials valid`: Successful authentication
- `❌ validation failed`: Authentication error
- `Rate limited`: User blocked for failed attempts
- `Domain not allowed`: Domain not allowed

### Performance Metrics
```bash
# View container statistics
docker stats radius-container-name

# View resource usage
docker system df
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Azure Authentication Error
```
Error: AADSTS700016: Application with identifier 'xxx' was not found
```
**Solution**: Verify that the Client ID is correct and the application is registered.

#### 2. Permissions Error
```
Error: Insufficient privileges to complete the operation
```
**Solution**: Verify that admin consent has been granted to the permissions.

#### 3. Domain Not Allowed
```
Domain not allowed for username: user@invaliddomain.com
```
**Solution**: Add the domain to `ALLOWED_DOMAINS` in the `.env` file.

#### 4. Rate Limiting
```
Rate limited authentication attempt for user@domain.com
```
**Solution**: Wait 5 minutes or check for attack attempts.

#### 5. Port Already in Use
```
Error: port is already allocated
```
**Solution**: Change the port in the `PORT` variable in the `.env` file.

### Diagnostic Commands

```bash
# Check Azure connectivity
docker exec radius-container-name node -e "
const { ClientSecretCredential } = require('@azure/identity');
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);
console.log('Valid credentials');
"

# Check server configuration
docker exec radius-container-name cat /app/.env

# Check MySQL logs
docker logs radius-mysql
```

## 🔒 Security

### Best Practices

1. **Secrets Management**
   - Use environment variables for credentials
   - Rotate client secrets regularly
   - Don't commit credentials to the repository

2. **Network Security**
   - Use firewalls to restrict access
   - Configure VPN for remote access
   - Monitor access logs

3. **Azure AD Security**
   - Use minimum necessary permissions
   - Regularly review application permissions
   - Enable Azure AD auditing

4. **Rate Limiting**
   - Server includes automatic protection
   - Configure additional limits in FortiGate
   - Monitor failed authentication attempts

## 📈 Scalability

### Production Configuration

```yaml
version: '3.8'
services:
  radius:
    build: .
    container_name: radius-prod
    env_file:
      - .env
    ports:
      - "1812:1812/udp"
    environment:
      - NODE_ENV=production
      - DEBUG=error,warn
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    networks:
      - app-network
    volumes:
      - radius_logs:/app/logs
      - radius_cache:/app/cache

  mysql:
    image: mysql:8.0
    container_name: radius-mysql-prod
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

volumes:
  radius_logs:
  radius_cache:
  mysql_data:

networks:
  app-network:
    external: true
```

### Load Balancing
For multiple instances, consider using:
- **HAProxy** for load balancing
- **Redis** for shared cache
- **MySQL Cluster** for high availability

## 🤝 Contributing

### How to Contribute

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

### Code Standards

- Use ESLint for linting
- Follow Node.js conventions
- Add tests for new features
- Document important changes

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## 🆘 Support

### Support Channels

- **Issues**: [GitHub Issues](https://github.com/De0xyS3/azure_radius/issues)
- **Documentation**: [Project Wiki](https://github.com/De0xyS3/azure_radius/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/De0xyS3/azure_radius/discussions)

### Contact Information

- **Author**: De0xyS3
- **Email**: [Your email]
- **GitHub**: [@De0xyS3](https://github.com/De0xyS3)

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Multi-domain support
- ✅ Automatic setup script
- ✅ Hybrid credential validation
- ✅ Smart caching
- ✅ Improved rate limiting
- ✅ Structured logging

### v1.0.0
- ✅ Basic Azure AD integration
- ✅ Standard RADIUS support
- ✅ Docker containerization

---

**Need help?** Check the [Troubleshooting](#-troubleshooting) section or open an issue on GitHub.
