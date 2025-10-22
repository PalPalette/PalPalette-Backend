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

## Features

- 🔐 **Authentication & Authorization** - JWT-based secure authentication
- 📱 **Device Management** - ESP32 device pairing and WebSocket communication
- 💬 **Color Messaging** - Send color palettes between friends
- 👥 **Friend System** - Connect with friends and manage relationships
- 🔔 **Push Notifications** - Real-time notifications for messages and friend requests via FCM
- ⏰ **Message Timeframes** - Configure quiet hours for device notifications
- 🌈 **Color Palettes** - Create and share custom color collections

## Project Structure

- `src/` - NestJS source code
  - `modules/` - Feature modules (auth, messages, devices, users, push)
  - `common/` - Shared utilities and middleware
  - `migrations/` - Database migrations
- `docs/` - Additional documentation
- `ormconfig.js` - TypeORM configuration
- `.env` - Environment variables

## Scripts

- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the project
- `npm run migration:run` - Run database migrations
- `npm run migration:generate` - Generate a new migration

## Database

Uses PostgreSQL by default. Update `.env` for your setup.

## Push Notifications

The backend supports push notifications via Firebase Cloud Messaging (FCM). See the [Push Notifications Setup Guide](./docs/PUSH_NOTIFICATIONS_GUIDE.md) for detailed configuration instructions.

**Quick Setup:**

1. Get your Firebase service account JSON from Firebase Console
2. Add `FCM_SERVICE_ACCOUNT_JSON` or `FCM_SERVICE_ACCOUNT_PATH` to your `.env` file
3. Run migrations: `npm run migration:run`
4. Register device tokens via `/push/register` endpoint

Push notifications are sent automatically for:

- Friend requests
- Color palette messages (even during user's quiet hours)
