import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFriendshipsAndColorPalettes1737786000000
  implements MigrationInterface
{
  name = "AddFriendshipsAndColorPalettes1737786000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "friendship" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requesterId" uuid NOT NULL,
                "addresseeId" uuid NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_friendship_requester_addressee" UNIQUE ("requesterId", "addresseeId"),
                CONSTRAINT "PK_friendship_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "color_palette" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "colors" text array NOT NULL,
                "imageUrl" character varying,
                "description" character varying,
                "createdById" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_color_palette_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "friendship" 
            ADD CONSTRAINT "FK_friendship_requester" 
            FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "friendship" 
            ADD CONSTRAINT "FK_friendship_addressee" 
            FOREIGN KEY ("addresseeId") REFERENCES "user"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "color_palette" 
            ADD CONSTRAINT "FK_color_palette_created_by" 
            FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "color_palette" DROP CONSTRAINT "FK_color_palette_created_by"`
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" DROP CONSTRAINT "FK_friendship_addressee"`
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" DROP CONSTRAINT "FK_friendship_requester"`
    );
    await queryRunner.query(`DROP TABLE "color_palette"`);
    await queryRunner.query(`DROP TABLE "friendship"`);
  }
}
