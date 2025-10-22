export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface MessagePushData {
  type: "message";
  messageId: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  previewColors?: string[]; // First 3 colors as hex strings
}

export interface FriendInvitePushData {
  type: "friend_invite";
  inviterId: string;
  inviterName: string;
  inviteId?: string;
}

export interface PushSendOptions {
  bypassTimeframe?: boolean;
  priority?: "high" | "normal";
}
