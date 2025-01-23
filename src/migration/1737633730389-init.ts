import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1737633730389 implements MigrationInterface {
    name = 'Init1737633730389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`submission\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` varchar(255) NOT NULL, \`score\` float NOT NULL, \`speed\` float NOT NULL, \`accuracy\` float NOT NULL, \`miss\` float NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`submission\``);
    }

}
