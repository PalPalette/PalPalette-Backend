import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLightingSystemFields1737787000000
  implements MigrationInterface
{
  name = "AddLightingSystemFields1737787000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingSystemType" varchar NOT NULL DEFAULT 'ws2812'
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingHostAddress" varchar NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingPort" integer NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingAuthToken" varchar NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingCustomConfig" json NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingSystemConfigured" boolean NOT NULL DEFAULT false
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingLastTestAt" timestamp NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "device" 
            ADD COLUMN "lightingStatus" varchar NOT NULL DEFAULT 'unknown'
        `);

    // Set default configurations for existing devices
    await queryRunner.query(`
            UPDATE "device" 
            SET "lightingCustomConfig" = '{"ledPin": 2, "ledCount": 30, "brightness": 255, "colorOrder": "GRB"}'
            WHERE "lightingSystemType" = 'ws2812'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingStatus"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingLastTestAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingSystemConfigured"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingCustomConfig"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingAuthToken"`
    );
    await queryRunner.query(`ALTER TABLE "device" DROP COLUMN "lightingPort"`);
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingHostAddress"`
    );
    await queryRunner.query(
      `ALTER TABLE "device" DROP COLUMN "lightingSystemType"`
    );
  }
}
