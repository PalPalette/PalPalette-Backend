# PalPalette Backend Documentation

## Overview

The PalPalette backend is a NestJS-based REST API server that provides authentication, device management, and real-time WebSocket communication for ESP32 devices. It serves as the central hub connecting mobile applications with IoT devices.

## Architecture

### Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (JSON Web Tokens)
- **WebSocket**: Custom WebSocket server for ESP32 communication
- **Containerization**: Docker and Docker Compose

### Core Modules

#### Authentication Module (`src/modules/auth/`)

Handles user registration, login, and JWT token management.

**Key Files:**

- `auth.controller.ts` - REST endpoints for login/register
- `auth.service.ts` - Authentication business logic
- `jwt.strategy.ts` - JWT validation strategy
- `jwt-auth.guard.ts` - Route protection guard

**Features:**

- User registration with email/username validation
- Secure password hashing with bcrypt
- JWT token generation and validation
- Protected route middleware

#### Device Management Module (`src/modules/devices/`)

Manages ESP32 device registration, pairing, and lifecycle.

**Key Files:**

- `devices.controller.ts` - Device REST endpoints
- `devices.service.ts` - Device business logic
- `device-pairing.service.ts` - Pairing code management
- `entities/device.entity.ts` - Device database model
- `dto/` - Data transfer objects for validation

**Features:**

- Device self-registration via MAC address
- 6-digit pairing code generation
- Device claiming by users
- Device state management (online/offline, provisioned)
- Device reset functionality

#### User Management Module (`src/modules/users/`)

Handles user profiles and social features.

**Key Files:**

- `users.controller.ts` - User management endpoints
- `users.service.ts` - User business logic
- `entities/user.entity.ts` - User database model

**Features:**

- User profile management
- User search functionality
- Friend connections (planned)

#### Messages Module (`src/modules/messages/`)

Manages color palette sharing and WebSocket communication.

**Key Files:**

- `messages.controller.ts` - Color sharing endpoints
- `messages.service.ts` - Message business logic
- `messages.gateway.ts` - WebSocket gateway for ESP32
- `entities/message.entity.ts` - Message database model

**Features:**

- Color palette message creation
- Real-time delivery to ESP32 devices
- Message history and status tracking
- WebSocket server for device communication

## Database Schema

### Entities

#### User Entity

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @OneToMany(() => Device, (device) => device.owner)
  devices: Device[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  receivedMessages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Device Entity

```typescript
@Entity("devices")
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  macAddress: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  pairingCode: string;

  @Column({ default: false })
  isProvisioned: boolean;

  @Column({ default: false })
  isOnline: boolean;

  @ManyToOne(() => User, (user) => user.devices, { nullable: true })
  owner: User;

  @Column({ nullable: true })
  ownerId: string;

  @OneToMany(() => Message, (message) => message.device)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Message Entity

```typescript
@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.sentMessages)
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.receivedMessages, { nullable: true })
  receiver: User;

  @Column({ nullable: true })
  receiverId: string;

  @ManyToOne(() => Device, (device) => device.messages)
  device: Device;

  @Column()
  deviceId: string;

  @Column("jsonb")
  colorPalette: {
    colors: Array<{ r: number; g: number; b: number }>;
    name?: string;
    duration?: number;
    animation?: string;
  };

  @CreateDateColumn()
  sentAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Devices

- `GET /devices` - Get user's devices
- `POST /devices/register` - Device self-registration
- `POST /devices/claim` - Claim device with pairing code
- `PUT /devices/:id` - Update device
- `DELETE /devices/:id/reset` - Reset device

### Users

- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/search` - Search users

### Messages

- `POST /messages` - Send color palette
- `GET /messages` - Get user messages
- `PUT /messages/:id/read` - Mark message as read

## WebSocket Communication

### ESP32 WebSocket Server

The backend runs a separate WebSocket server on port 3001 for ESP32 device communication.

**Connection URL**: `ws://localhost:3001/ws`

**Message Types:**

- `deviceClaimed` - Notify device of successful claiming
- `colorPalette` - Send color data for display
- `resetDevice` - Reset device to unclaimed state

**Implementation**: `src/modules/messages/services/simple-raw-websocket.service.ts`

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=palpalette
DB_PASSWORD=development
DB_NAME=palpalette_dev

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
WS_PORT=3001
NODE_ENV=development
```

### Database Configuration

```typescript
// data-source.ts
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Device, Message],
  migrations: ["src/migrations/*.ts"],
  synchronize: false, // Use migrations in production
});
```

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Run migrations
npm run migration:run

# Seed development data
npm run seed:run

# Start development server
npm run start:dev
```

### Available Scripts

- `npm run start` - Start production build
- `npm run start:dev` - Start with hot reload
- `npm run start:debug` - Start with debugger
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run migration:run` - Execute migrations
- `npm run migration:revert` - Rollback last migration
- `npm run seed:run` - Seed database

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Database Migrations

### Creating Migrations

```bash
# Create empty migration
npm run migration:create -- src/migrations/AddNewFeature

# Generate migration from entity changes
npm run migration:generate -- src/migrations/UpdateUserEntity
```

### Migration Files

Located in `src/migrations/`:

- `1680000000000-InitialSchema.ts` - Initial database schema

## Security

### Authentication Flow

1. User provides email/password
2. Server validates credentials
3. JWT token generated with user ID and email
4. Token returned to client
5. Client includes token in Authorization header
6. Server validates token for protected routes

### Password Security

- Passwords hashed with bcrypt (salt rounds: 10)
- No plain text passwords stored
- Password validation rules enforced

### JWT Security

- Tokens signed with secret key
- Configurable expiration time
- User ID and email stored in payload
- Tokens validated on each protected request

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/migrations/ ./dist/migrations/

EXPOSE 3000 3001

CMD ["node", "dist/main.js"]
```

### Production Configuration

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  backend:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/palpalette
    depends_on:
      - postgres
```

## Monitoring

### Health Checks

```typescript
@Controller("health")
export class HealthController {
  @Get()
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

### Logging

- Winston logger for structured logging
- Different log levels (error, warn, info, debug)
- File and console transports
- Request/response logging middleware

## Performance

### Database Optimization

- Connection pooling
- Query optimization with indexes
- Eager/lazy loading strategies
- Query result caching

### WebSocket Optimization

- Connection management and cleanup
- Message queuing for offline devices
- Connection limits and rate limiting

## Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check PostgreSQL status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
npm run migration:show
```

#### WebSocket Issues

```bash
# Test WebSocket connection
wscat -c ws://localhost:3001/ws

# Check server logs
npm run start:dev | grep WebSocket
```

#### Authentication Problems

```bash
# Verify JWT secret configuration
echo $JWT_SECRET

# Test login endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@palpalette.com","password":"password123"}'
```

## Future Enhancements

### Planned Features

- Real-time notifications for mobile apps
- Device groups and bulk operations
- Advanced color palette algorithms
- Analytics and usage metrics
- Admin dashboard
- Rate limiting and API throttling
- Caching layer (Redis)
- Microservices architecture

### Technical Improvements

- GraphQL API for better mobile performance
- Event-driven architecture with message queues
- Horizontal scaling with load balancers
- Database read replicas
- CDN for static assets
- Enhanced security with OAuth2
- API versioning strategy
