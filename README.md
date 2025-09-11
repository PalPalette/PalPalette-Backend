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

## Project Structure

- `src/` - NestJS source code
- `ormconfig.js` - TypeORM configuration
- `.env` - Environment variables

## Scripts

- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the project

## Database

Uses PostgreSQL by default. Update `.env` for your setup.
