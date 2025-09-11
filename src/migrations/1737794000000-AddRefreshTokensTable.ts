import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokensTable1737794000000 implements MigrationInterface {
  name = "AddRefreshTokensTable1737794000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" varchar(255) NOT NULL,
        "user_id" uuid NOT NULL,
        "device_name" varchar(100),
        "device_fingerprint" varchar(255),
        "ip_address" varchar(45),
        "user_agent" text,
        "expires_at" TIMESTAMP NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "last_used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af" UNIQUE ("token")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_token" ON "refresh_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`
    );
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_token"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
