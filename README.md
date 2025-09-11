# PalPalette Backend

This is the backend service for the PalPalette color sharing system, built with NestJS and PostgreSQL.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your database and JWT config.
3. Start the development server:
   ```bash
   npm run start:dev
   ```

## HTTPS Configuration

The backend supports both HTTP and HTTPS modes:

### HTTP Mode (Default)
By default, the server runs on HTTP. This is suitable for development.

### HTTPS Mode (Recommended for Production)
To enable HTTPS:

1. **Generate SSL certificates for development:**
   ```bash
   npm run generate-ssl-cert
   ```
   This creates self-signed certificates in the `ssl/` directory.

2. **Enable HTTPS in your `.env` file:**
   ```bash
   HTTPS_ENABLED=true
   SSL_CERT_PATH=ssl/certificate.pem
   SSL_KEY_PATH=ssl/private-key.pem
   ```

3. **For production, replace the self-signed certificates** with certificates from a trusted Certificate Authority (CA).

4. **Start the server:**
   ```bash
   npm run start:dev
   ```
   The server will now run on HTTPS with SSL/TLS encryption.

### Security Features
- Automatic HSTS (HTTP Strict Transport Security) headers when HTTPS is enabled
- Enhanced security headers through security middleware
- Support for both HTTP and HTTPS CORS origins

## Project Structure

- `src/` - NestJS source code
- `ormconfig.js` - TypeORM configuration
- `.env` - Environment variables

## Scripts

- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the project

## Database

Uses PostgreSQL by default. Update `.env` for your setup.
