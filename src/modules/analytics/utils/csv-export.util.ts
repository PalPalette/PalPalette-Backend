import { AnonymizedMessageData } from "../dto/analytics-export.dto";

/**
 * Utility for converting analytics data to CSV format
 */
export class CsvExportUtil {
  /**
   * Convert messages array to CSV string
   * @param messages Array of anonymized message data
   * @returns CSV formatted string
   */
  static messagesToCsv(messages: AnonymizedMessageData[]): string {
    const headers = [
      "message_id",
      "sender_id",
      "recipient_id",
      "timestamp",
      "status",
      "delivery_timestamp",
      "colors",
      "color_count",
      "image_url",
    ];

    const rows = messages.map((msg) => [
      msg.message_id,
      msg.sender_id,
      msg.recipient_id,
      msg.timestamp,
      msg.status,
      msg.delivery_timestamp || "",
      `"${msg.colors.join(",")}"`, // Quote to handle commas in array
      msg.color_count,
      msg.image_url || "",
    ]);

    const csvLines = [headers.join(","), ...rows.map((row) => row.join(","))];

    return csvLines.join("\n");
  }

  /**
   * Convert user-specific messages to CSV with direction column
   * @param messages Array of anonymized message data
   * @returns CSV formatted string
   */
  static userMessagesToCsv(
    messages: Array<AnonymizedMessageData & { direction: "sent" | "received" }>
  ): string {
    const headers = [
      "message_id",
      "direction",
      "peer_id",
      "timestamp",
      "status",
      "delivery_timestamp",
      "colors",
      "color_count",
      "image_url",
    ];

    const rows = messages.map((msg) => [
      msg.message_id,
      msg.direction,
      msg.direction === "sent" ? msg.recipient_id : msg.sender_id,
      msg.timestamp,
      msg.status,
      msg.delivery_timestamp || "",
      `"${msg.colors.join(",")}"`,
      msg.color_count,
      msg.image_url || "",
    ]);

    const csvLines = [headers.join(","), ...rows.map((row) => row.join(","))];

    return csvLines.join("\n");
  }
}
