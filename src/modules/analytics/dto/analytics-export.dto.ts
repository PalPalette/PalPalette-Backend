import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Anonymized message data for export
 */
export interface AnonymizedMessageData {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  timestamp: string;
  status: string;
  delivery_timestamp: string | null;
  colors: string[];
  color_count: number;
  image_url: string | null;
}

/**
 * Period specification for the export
 */
export interface ExportPeriod {
  start: string | null;
  end: string | null;
}

/**
 * Summary statistics for a single user
 */
export interface UserSummary {
  messages_sent: number;
  messages_received: number;
  unique_recipients: number;
  unique_senders: number;
  total_colors_sent: number;
  total_colors_received: number;
}

/**
 * User-specific analytics export
 */
export class UserAnalyticsExportDto {
  @ApiProperty({
    description: 'Type of export',
    example: 'user_analytics',
  })
  export_type: string;

  @ApiProperty({
    description: 'Timestamp when export was generated',
    example: '2025-12-08T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Anonymized user ID - consistent within this export only',
    example: 'anon_user_001',
  })
  user_id: string;

  @ApiProperty({
    description: 'Period covered by the export',
    example: { start: '2025-01-01T00:00:00Z', end: '2025-12-31T23:59:59Z' },
  })
  period: ExportPeriod;

  @ApiProperty({
    description: 'Summary statistics for the user',
    example: {
      messages_sent: 15,
      messages_received: 23,
      unique_recipients: 4,
      unique_senders: 5,
      total_colors_sent: 87,
      total_colors_received: 142,
    },
  })
  summary: UserSummary;

  @ApiProperty({
    description: 'Array of messages (sent and received) with direction indicator',
    type: 'array',
    isArray: true,
    example: [
      {
        message_id: 'msg_12345678',
        direction: 'sent',
        sender_id: 'anon_user_001',
        recipient_id: 'anon_user_002',
        timestamp: '2025-12-05T14:30:00Z',
        status: 'delivered',
        delivery_timestamp: '2025-12-05T14:31:15Z',
        colors: ['#FF6B35', '#F7931E', '#FFD23F'],
        color_count: 3,
        image_url: null,
      },
    ],
  })
  messages: Array<AnonymizedMessageData & { direction: 'sent' | 'received' }>;
}

/**
 * Aggregate user summary for all users
 */
export interface AggregateUserSummary {
  user_id: string;
  messages_sent: number;
  messages_received: number;
  unique_recipients: number;
  unique_senders: number;
  total_colors_sent: number;
  total_colors_received: number;
}

/**
 * Global summary statistics
 */
export interface GlobalSummary {
  total_users: number;
  total_messages: number;
  total_delivered: number;
  delivery_rate: number;
  average_colors_per_message: number;
  date_range: {
    first_message: string | null;
    last_message: string | null;
  };
}

/**
 * Aggregate analytics export for all users
 */
export class AggregateAnalyticsExportDto {
  @ApiProperty({
    description: 'Type of export',
    example: 'aggregate_analytics',
  })
  export_type: string;

  @ApiProperty({
    description: 'Timestamp when export was generated',
    example: '2025-12-08T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Period covered by the export',
    example: { start: '2025-01-01T00:00:00Z', end: '2025-12-31T23:59:59Z' },
  })
  period: ExportPeriod;

  @ApiProperty({
    description: 'Global summary statistics across all users',
    example: {
      total_users: 12,
      total_messages: 248,
      total_delivered: 233,
      delivery_rate: 0.94,
      average_colors_per_message: 3.2,
      date_range: {
        first_message: '2025-01-15T08:30:00Z',
        last_message: '2025-12-08T16:45:00Z',
      },
    },
  })
  global_summary: GlobalSummary;

  @ApiProperty({
    description: 'Summary statistics per anonymized user',
    type: 'array',
    isArray: true,
    example: [
      {
        user_id: 'anon_user_001',
        messages_sent: 15,
        messages_received: 23,
        unique_recipients: 4,
        unique_senders: 5,
        total_colors_sent: 87,
        total_colors_received: 142,
      },
      {
        user_id: 'anon_user_002',
        messages_sent: 20,
        messages_received: 18,
        unique_recipients: 6,
        unique_senders: 4,
        total_colors_sent: 105,
        total_colors_received: 98,
      },
    ],
  })
  users: AggregateUserSummary[];

  @ApiPropertyOptional({
    description:
      'All messages with anonymized IDs (only included if includeMessages=true in query)',
    type: 'array',
    isArray: true,
    example: [
      {
        message_id: 'msg_12345678',
        sender_id: 'anon_user_001',
        recipient_id: 'anon_user_002',
        timestamp: '2025-12-05T14:30:00Z',
        status: 'delivered',
        delivery_timestamp: '2025-12-05T14:31:15Z',
        colors: ['#FF6B35', '#F7931E', '#FFD23F'],
        color_count: 3,
        image_url: null,
      },
    ],
  })
  messages?: AnonymizedMessageData[];
}
