# PalPalette Backend

NestJS backend for color sharing between friends via ESP32-connected lighting systems.

## Setup

**Development:**

```bash
npm install
cp .env.example .env  # Configure database and JWT
npm run start:dev
```

**Production (with SSL):**

```bash
chmod +x deploy.sh
./deploy.sh your-domain.com
```

## Endpoints

- API: `https://your-domain.com/api` (Swagger docs)
- WebSocket (ESP32): `wss://your-domain.com:3001/ws`
- Development: `http://localhost:3000`

## Features

- JWT authentication
- ESP32 device pairing via WebSocket
- Color palette messaging
- Friend system with requests
- FCM push notifications
- Message timeframes (quiet hours)
- Anonymized analytics export (JSON/CSV)

## Key Commands

```bash
npm run start:dev          # Development mode
npm run build              # Production build
npm run migration:run      # Apply migrations
```

## Tech Stack

- NestJS + TypeScript
- PostgreSQL + TypeORM
- WebSocket (ESP32 devices)
- Firebase Cloud Messaging
