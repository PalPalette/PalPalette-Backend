import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserMessageTimeframe1737800000000
  implements MigrationInterface
{
  name = "AddUserMessageTimeframe1737800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add message timeframe columns to user table
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN "messageStartTime" TIME,
      ADD COLUMN "messageEndTime" TIME
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove message timeframe columns from user table
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN "messageStartTime",
      DROP COLUMN "messageEndTime"
    `);
  }
}
