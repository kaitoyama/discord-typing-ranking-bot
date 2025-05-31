import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChannelId1737633730390 implements MigrationInterface {
    name = 'AddChannelId1737633730390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`submission\` ADD \`channelId\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`submission\` DROP COLUMN \`channelId\``);
    }

}