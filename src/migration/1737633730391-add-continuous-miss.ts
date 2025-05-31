import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContinuousMiss1737633730391 implements MigrationInterface {
    name = 'AddContinuousMiss1737633730391'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`submission\` ADD \`continuousMiss\` float NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`submission\` DROP COLUMN \`continuousMiss\``);
    }

}