import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddPushSubscriptions1729526400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "push_subscriptions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "uuid",
          },
          {
            name: "token",
            type: "varchar",
            length: "500",
          },
          {
            name: "platform",
            type: "varchar",
            length: "20",
          },
          {
            name: "deviceId",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "enabled",
            type: "boolean",
            default: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "lastSeenAt",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create unique index on token
    await queryRunner.createIndex(
      "push_subscriptions",
      new TableIndex({
        name: "IDX_push_subscriptions_token",
        columnNames: ["token"],
        isUnique: true,
      })
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      "push_subscriptions",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("push_subscriptions");

    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("userId") !== -1
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("push_subscriptions", foreignKey);
      }
    }

    await queryRunner.dropIndex(
      "push_subscriptions",
      "IDX_push_subscriptions_token"
    );
    await queryRunner.dropTable("push_subscriptions");
  }
}
