/**
 * Utility for anonymizing user IDs in analytics exports.
 * Provides consistent mapping within a single export session.
 */
export class AnonymizationUtil {
  private userIdMap: Map<string, string> = new Map();
  private counter: number = 1;

  /**
   * Get anonymized ID for a user. Returns consistent ID within this util instance.
   * @param userId Original user UUID
   * @returns Anonymized user ID (e.g., "anon_user_001")
   */
  getAnonymizedUserId(userId: string | null): string {
    if (!userId) {
      return "anon_user_unknown";
    }

    if (this.userIdMap.has(userId)) {
      return this.userIdMap.get(userId)!;
    }

    const anonymizedId = `anon_user_${String(this.counter).padStart(3, "0")}`;
    this.userIdMap.set(userId, anonymizedId);
    this.counter++;

    return anonymizedId;
  }

  /**
   * Get the total number of unique users anonymized
   */
  getTotalUsers(): number {
    return this.userIdMap.size;
  }

  /**
   * Reset the mapping (for new export)
   */
  reset(): void {
    this.userIdMap.clear();
    this.counter = 1;
  }
}
