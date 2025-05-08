import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AppDataSource } from '../config/typeorm.config';
import { Submission } from '../entities/Submission';
import { calculateScore } from '../utils/score';

export const data = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('スコアの再計算を行います (管理者のみ)');

export async function execute(interaction: ChatInputCommandInteraction) {
  // 権限チェック
  if (interaction.user.username !== 'kaitoyama') {
    return interaction.reply({
      content: 'このコマンドを実行する権限がありません。',
      ephemeral: true
    });
  }

  try {
    // 全ての提出データを取得
    const submissionRepo = AppDataSource.getRepository(Submission);
    const submissions = await submissionRepo.find();
    
    // スコアを再計算して更新
    let updatedCount = 0;
    
    await AppDataSource.manager.transaction(async transactionalEntityManager => {
      for (const submission of submissions) {
        // 新しい計算式でスコアを再計算
        const newScore = calculateScore(submission.speed, submission.accuracy);
        
        // スコアが変わった場合のみ更新
        if (newScore !== submission.score) {
          submission.score = newScore;
          await transactionalEntityManager.save(submission);
          updatedCount++;
        }
      }
    });

    return interaction.reply({
      content: `${submissions.length}件中${updatedCount}件のスコアを更新しました。`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('スコア再計算エラー:', error);
    return interaction.reply({
      content: 'スコアの再計算中にエラーが発生しました',
      ephemeral: true
    });
  }
}
