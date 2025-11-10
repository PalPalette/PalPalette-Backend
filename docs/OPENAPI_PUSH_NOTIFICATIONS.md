# OpenAPI/Swagger Documentation for Push Notifications

## Overview

The push notification endpoints are fully documented with Swagger/OpenAPI annotations for automatic frontend code generation.

## Accessing the Documentation

When the backend server is running, you can access the interactive Swagger UI at:

```
http://localhost:3000/api
```

Or if running on the network:

```
http://<server-ip>:3000/api
```

## Available Endpoints

All endpoints are under the **"Push Notifications"** tag in Swagger:

### 1. POST /push/register

**Register a push notification token**

- **Authentication**: Required (JWT Bearer)
- **Request Body**:
  ```json
  {
    "token": "string (FCM token, max 500 chars)",
    "platform": "ios" | "android" | "web",
    "deviceId": "string (optional, max 255 chars)"
  }
  ```
- **Response** (201):
  ```json
  {
    "success": true,
    "message": "Push token registered successfully",
    "subscriptionId": "uuid"
  }
  ```

### 2. POST /push/unregister

**Unregister a push notification token**

- **Authentication**: Required (JWT Bearer)
- **Request Body**:
  ```json
  {
    "token": "string (FCM token to remove)"
  }
  ```
- **Response** (200):
  ```json
  {
    "success": true,
    "message": "Push token unregistered successfully"
  }
  ```

### 3. GET /push/subscriptions

**Get user's active push subscriptions**

- **Authentication**: Required (JWT Bearer)
- **Response** (200):
  ```json
  {
    "subscriptions": [
      {
        "id": "uuid",
        "platform": "android",
        "deviceId": "user-phone-1",
        "createdAt": "2025-10-21T12:00:00.000Z",
        "lastSeenAt": "2025-10-21T14:30:00.000Z"
      }
    ]
  }
  ```

## Frontend Code Generation

### Using OpenAPI Generator

You can generate TypeScript/JavaScript client code using the Swagger JSON:

1. **Access the OpenAPI JSON**:

   ```
   http://localhost:3000/api-json
   ```

2. **Generate TypeScript Client** (example):
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:3000/api-json \
     -g typescript-axios \
     -o ./src/generated/api
   ```

### Using openapi-typescript

Generate TypeScript types directly:

```bash
npx openapi-typescript http://localhost:3000/api-json --output ./src/types/api.ts
```

### Manual Script (Recommended)

If you want to save the OpenAPI spec to a file first:

1. Build the backend:

   ```bash
   npm run build
   ```

2. Generate OpenAPI spec file:

   ```bash
   npm run openapi:generate
   ```

   This will create `openapi.json` in the project root.

3. Use the file for code generation:
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -i ./openapi.json \
     -g typescript-axios \
     -o ./frontend/src/api
   ```

## Response DTOs

All endpoints have strongly-typed response DTOs with Swagger decorators:

- `RegisterPushTokenResponseDto`
- `UnregisterPushTokenResponseDto`
- `GetSubscriptionsResponseDto`
- `PushSubscriptionDto`

These provide proper type hints for frontend code generation tools.

## Request DTOs

Request bodies are validated using class-validator:

- `RegisterPushTokenDto`:

  - `token`: Required, 1-500 characters
  - `platform`: Required, enum: ["ios", "android", "web"]
  - `deviceId`: Optional, 1-255 characters

- `UnregisterPushTokenDto`:
  - `token`: Required, 1-500 characters

## Error Responses

All endpoints document standard error responses:

- **400 Bad Request**: Validation error (invalid input)
- **401 Unauthorized**: Missing or invalid JWT token
- **404 Not Found**: Resource not found (where applicable)

## Testing in Swagger UI

1. Start the backend server:

   ```bash
   npm run start:dev
   ```

2. Open Swagger UI: `http://localhost:3000/api`

3. Click **"Authorize"** button and enter your JWT token

4. Try the endpoints:
   - Expand an endpoint
   - Click "Try it out"
   - Fill in the request body
   - Click "Execute"

## Integration Examples

### React with Axios

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});

// Register push token
const response = await api.post("/push/register", {
  token: fcmToken,
  platform: "android",
  deviceId: "my-device-1",
});
```

### React Native with Fetch

```typescript
const registerPushToken = async (fcmToken: string, platform: string) => {
  const response = await fetch("http://localhost:3000/push/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({
      token: fcmToken,
      platform,
      deviceId: "my-device-1",
    }),
  });

  return await response.json();
};
```

### Angular with HttpClient

```typescript
import { HttpClient } from '@angular/common/http';

constructor(private http: HttpClient) {}

registerPushToken(token: string, platform: string) {
  return this.http.post('/push/register', {
    token,
    platform,
    deviceId: 'my-device-1'
  });
}
```

## Notes

- All endpoints require JWT authentication via Bearer token
- Tokens are automatically cleaned up if FCM reports them as invalid
- Users can register multiple devices (each gets a separate subscription)
- The same token can be re-registered to update platform/deviceId
- `lastSeenAt` is updated each time a token is registered

## See Also

- [Push Notifications Setup Guide](./PUSH_NOTIFICATIONS_GUIDE.md)
- [Main API Documentation](http://localhost:3000/api)
