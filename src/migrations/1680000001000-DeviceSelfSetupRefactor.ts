import { MigrationInterface, QueryRunner } from "typeorm";

export class DeviceSelfSetupRefactor1680000001000
  implements MigrationInterface
{
  name = "DeviceSelfSetupRefactor1680000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove obsolete columns
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "setupSecret"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "setupToken"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "setupTokenExpiresAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "isSetupComplete"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "setupCompletedAt"`
    );

    // Add new columns for self-setup system
    await queryRunner.query(
      `ALTER TABLE "device" ADD "pairingCode" character varying(6)`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "pairingCodeExpiresAt" TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "macAddress" character varying(17)`
    );

    // Update existing devices with dummy MAC addresses
    await queryRunner.query(
      `UPDATE "device" SET "macAddress" = 'AA:BB:CC:DD:EE:' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY "createdAt") AS TEXT), 2, '0') WHERE "macAddress" IS NULL`
    );

    // Now make macAddress non-nullable and add unique constraint
    await queryRunner.query(
      `ALTER TABLE "device" ALTER COLUMN "macAddress" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "isProvisioned" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "isOnline" boolean NOT NULL DEFAULT false`
    );

    // Add unique constraint on macAddress
    await queryRunner.query(
      `ALTER TABLE "device" ADD CONSTRAINT "UQ_device_macAddress" UNIQUE ("macAddress")`
    );

    // Update existing status values
    await queryRunner.query(
      `UPDATE "device" SET "status" = 'unclaimed' WHERE "status" = 'setup'`
    );
    await queryRunner.query(
      `UPDATE "device" SET "status" = 'claimed' WHERE "status" = 'claiming'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(
      `ALTER TABLE "device" DROP CONSTRAINT IF EXISTS "UQ_device_macAddress"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "isOnline"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "isProvisioned"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "macAddress"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "pairingCodeExpiresAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN IF EXISTS "pairingCode"`
    );

    // Restore old columns (basic structure)
    await queryRunner.query(
      `ALTER TABLE "device" ADD "setupSecret" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "setupToken" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "setupTokenExpiresAt" TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "isSetupComplete" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "setupCompletedAt" TIMESTAMP`
    );

    // Revert status values
    await queryRunner.query(
      `UPDATE "device" SET "status" = 'setup' WHERE "status" = 'unclaimed'`
    );
    await queryRunner.query(
      `UPDATE "device" SET "status" = 'claiming' WHERE "status" = 'claimed'`
    );
  }
}
