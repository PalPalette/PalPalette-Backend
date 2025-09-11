import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeviceStatusFields1737793200000 implements MigrationInterface {
  name = "AddDeviceStatusFields1737793200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device" ADD "wifiRSSI" integer`);
    await queryRunner.query(
      `ALTER TABLE "device" ADD "firmwareVersion" character varying`
    );
    await queryRunner.query(`ALTER TABLE "device" ADD "systemStats" text`);
    await queryRunner.query(
      `ALTER TABLE "device" ADD "lightingCapabilities" text`
    );
    await queryRunner.query(
      `ALTER TABLE "device" ADD "lightingLastStatusUpdate" TIMESTAMP`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingLastStatusUpdate"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingCapabilities"`
    );
    await queryRunner.query(`ALTER TABLE "device" DROP COLUMN "systemStats"`);
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "firmwareVersion"`
    );
    await queryRunner.query(`ALTER TABLE "device" DROP COLUMN "wifiRSSI"`);
  }
}
