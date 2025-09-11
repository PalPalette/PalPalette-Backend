import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaWithSetup1737785000000 implements MigrationInterface {
  name = "InitialSchemaWithSetup1737785000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create user table
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "displayName" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);

    // Create device table with all setup fields
    await queryRunner.query(`
      CREATE TABLE "device" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'esp32',
        "status" character varying NOT NULL DEFAULT 'setup',
        "lastSeenAt" TIMESTAMP,
        "setupSecret" character varying NOT NULL,
        "isSetupComplete" boolean NOT NULL DEFAULT false,
        "setupCompletedAt" TIMESTAMP,
        "setupToken" character varying,
        "setupTokenExpiresAt" TIMESTAMP,
        "ipAddress" character varying,
        "macAddress" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid,
        CONSTRAINT "UQ_device_setupSecret" UNIQUE ("setupSecret"),
        CONSTRAINT "PK_device_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Create message table
    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "colors" json NOT NULL,
        "imageUrl" character varying,
        "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deliveredAt" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'sent',
        "senderId" uuid,
        "recipientId" uuid,
        "deviceId" uuid,
        CONSTRAINT "PK_message_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_sender" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_message_recipient" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_message_device" FOREIGN KEY ("deviceId") REFERENCES "device"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TABLE "device"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
