# Push Notifications Setup Guide

This guide explains how to set up and use push notifications in the PalPalette Backend.

## Overview

Push notifications are sent to users when:

1. **Friend Invites**: Someone sends them a friend request
2. **Color Messages**: Someone sends them a color palette message (even during their quiet hours)

The system uses **Firebase Cloud Messaging (FCM)** to deliver notifications across iOS, Android, and web platforms.

## Features

- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Automatic token management and cleanup
- ✅ Bypasses user timeframe restrictions for important notifications
- ✅ Graceful degradation (app works without push configured)
- ✅ Multi-device support per user
- ✅ Automatic cleanup of invalid/expired tokens

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file (keep it secure!)

### 2. Configure Environment Variables

You have two options for providing the Firebase credentials:

#### Option A: Using JSON String (Recommended for Production)

Add the entire JSON content as an environment variable:

```bash
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id",...}'
```

#### Option B: Using File Path (Recommended for Development)

Store the JSON file securely and reference its path:

```bash
FCM_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

### 3. Add to .env file

Add one of the above environment variables to your `.env` file:

```env
# Firebase Cloud Messaging Configuration
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# OR
# FCM_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

### 4. Run Database Migration

Run the migration to create the `push_subscriptions` table:

```bash
npm run migration:run
```

Or with TypeORM CLI:

```bash
npx typeorm migration:run -d ./ormconfig.js
```

### 5. Restart the Server

Restart your NestJS application to load the new configuration:

```bash
npm run start:dev
```

## API Endpoints

### Register a Push Token

Register a device token to receive push notifications.

**Endpoint:** `POST /push/register`

**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "token": "fcm_token_from_mobile_app",
  "platform": "android",
  "deviceId": "user-phone-1"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Push token registered successfully",
  "subscriptionId": "uuid"
}
```

### Unregister a Push Token

Remove a device token from receiving notifications.

**Endpoint:** `POST /push/unregister`

**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "token": "fcm_token_to_remove"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Push token unregistered successfully"
}
```

### Get User Subscriptions

View all active push subscriptions for the authenticated user.

**Endpoint:** `GET /push/subscriptions`

**Authentication:** Required (JWT Bearer token)

**Response:**

```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "platform": "android",
      "deviceId": "user-phone-1",
      "createdAt": "2025-10-21T12:00:00Z",
      "lastSeenAt": "2025-10-21T14:30:00Z"
    }
  ]
}
```

## Push Notification Payloads

### Friend Invite Notification

When a user sends a friend request:

```json
{
  "notification": {
    "title": "New Friend Request",
    "body": "John Doe wants to be your friend"
  },
  "data": {
    "type": "friend_invite",
    "inviterId": "uuid",
    "inviterName": "John Doe",
    "inviteId": "uuid"
  }
}
```

### Color Message Notification

When a user receives a color palette message:

```json
{
  "notification": {
    "title": "New message from John Doe",
    "body": "You received a color palette message"
  },
  "data": {
    "type": "message",
    "messageId": "uuid",
    "senderId": "uuid",
    "senderName": "John Doe",
    "timestamp": "2025-10-21T12:00:00Z",
    "previewColors": ["#FF5733", "#33FF57", "#3357FF"]
  }
}
```

## Mobile App Integration

### iOS (Swift)

1. Add Firebase SDK to your iOS app
2. Configure APNs in Firebase Console
3. Request notification permissions
4. Register the FCM token with backend:

```swift
import FirebaseMessaging

Messaging.messaging().token { token, error in
    if let token = token {
        // Send token to backend
        registerPushToken(token: token, platform: "ios")
    }
}
```

### Android (Kotlin)

1. Add Firebase SDK to your Android app
2. Request notification permissions
3. Register the FCM token with backend:

```kotlin
import com.google.firebase.messaging.FirebaseMessaging

FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send token to backend
        registerPushToken(token, "android")
    }
}
```

### React Native

1. Install `@react-native-firebase/messaging`
2. Configure Firebase for iOS and Android
3. Request permissions and register token:

```javascript
import messaging from "@react-native-firebase/messaging";

async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    const token = await messaging().getToken();
    // Send token to backend
    await registerPushToken(token, Platform.OS);
  }
}
```

## Behavior & Rules

### Timeframe Bypass

Push notifications for both friend invites and color messages **bypass the user's configured message timeframe**. This means:

- Users receive push notifications 24/7
- Physical device (Nanoleaf) messages still respect timeframe
- Push notifications alert the user that they have a message waiting

This design ensures users are always notified of social interactions while still respecting their preferences for physical device notifications.

### Automatic Token Cleanup

The system automatically removes invalid or expired tokens when:

- FCM returns an error indicating the token is no longer valid
- The device unregisters explicitly

### Multi-Device Support

- Users can register multiple devices
- Each device gets its own subscription
- Push notifications are sent to all registered devices
- Optional `deviceId` field helps track which device is which

## Testing Push Notifications

### Manual Test via API

You can test by sending a test message through the API:

```bash
# First, register a test token (use a real FCM token from your test device)
curl -X POST http://localhost:3000/push/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_fcm_token_here",
    "platform": "android"
  }'

# Then send a message to trigger a push notification
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "sender_user_id",
    "recipientId": "recipient_user_id",
    "deviceId": "device_id",
    "colors": ["#FF5733", "#33FF57", "#3357FF"]
  }'
```

### Using Firebase Console

1. Go to Firebase Console > Cloud Messaging
2. Send a test message to your registered token
3. Verify the message is received on your device

## Troubleshooting

### Push Notifications Not Sending

1. **Check environment variables**: Ensure `FCM_SERVICE_ACCOUNT_JSON` or `FCM_SERVICE_ACCOUNT_PATH` is set
2. **Check server logs**: Look for initialization messages or errors
3. **Verify token registration**: Check that tokens are saved in database
4. **Test Firebase credentials**: Try sending a message via Firebase Console

### Tokens Being Removed

- This is normal behavior for expired/invalid tokens
- Users should re-register their token when the app starts
- Implement token refresh logic in your mobile app

### No Push on Development

- If FCM is not configured, push notifications will be gracefully skipped
- Check logs for: `"FCM not configured: ... Push notifications will be disabled"`
- This allows development without Firebase setup

## Database Schema

### push_subscriptions Table

| Column     | Type         | Description                     |
| ---------- | ------------ | ------------------------------- |
| id         | uuid         | Primary key                     |
| userId     | uuid         | Foreign key to users table      |
| token      | varchar(500) | FCM registration token (unique) |
| platform   | varchar(20)  | Platform: ios, android, or web  |
| deviceId   | varchar(255) | Optional device identifier      |
| enabled    | boolean      | Whether subscription is active  |
| createdAt  | timestamp    | When token was registered       |
| updatedAt  | timestamp    | When token was last updated     |
| lastSeenAt | timestamp    | Last time token was verified    |

## Security Considerations

1. **Token Storage**: FCM tokens are stored encrypted in the database
2. **Authentication**: All push endpoints require JWT authentication
3. **Service Account Security**: Keep the Firebase service account JSON secure
4. **Token Validation**: Invalid tokens are automatically removed
5. **User Privacy**: Push payloads contain minimal user data

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for APNs direct integration (in addition to FCM)
- [ ] Rich notifications with images/actions
- [ ] User preference for push notification types
- [ ] Delivery receipts and analytics
- [ ] Scheduled/delayed notifications
- [ ] Push notification history/audit log
- [ ] Support for notification channels/categories
- [ ] Web push notifications via service workers

## Support

For issues or questions:

- Check server logs for detailed error messages
- Review Firebase Console for delivery metrics
- Ensure mobile app has proper Firebase configuration
- Verify environment variables are correctly set
