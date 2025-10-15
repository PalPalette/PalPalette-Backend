import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToDevice1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device" ADD COLUMN IF NOT EXISTS "userId" uuid`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "userId"`
    );
  }
}
