import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { AppDataSource } from '../config/typeorm.config';
import { Submission } from '../entities/Submission';

export const data = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('タイピングランキングを表示します')
  .addBooleanOption(option =>
    option
      .setName('all')
      .setDescription('全ユーザーの結果を表示します')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const showAll = interaction.options.getBoolean('all') ?? false;

  try {
    const submissionRepo = AppDataSource.getRepository(Submission);
    
    // Get top results for each user
    const rankedScores = await submissionRepo
      .createQueryBuilder('submission')
      .select([
        'submission.userId',
        'MAX(submission.score) as best_score',
        'MAX(submission.level) as level',
        'SUM(submission.miss) as total_miss',
        'AVG(submission.speed) as avg_speed',
        'AVG(submission.accuracy) as avg_accuracy'
      ])
      .groupBy('submission.userId')
      .orderBy('best_score', 'DESC')
      .limit(showAll ? undefined : 16)
      .getRawMany();

    if (rankedScores.length === 0) {
      return interaction.reply({
        content: 'まだランキングデータがありません',
        ephemeral: true
      });
    }

    // Format results
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('タイピングランキング')
      .setDescription(showAll ? '全ユーザーのランキング' : 'トップ16のランキング');

    rankedScores.forEach((score, index) => {
      embed.addFields({
        name: `#${index + 1}`,
        value: `ユーザーID: ${score.userId}\n` +
               `最高スコア: ${score.best_score}\n` +
               `レベル: ${score.level}\n` +
               `平均速度: ${score.avg_speed.toFixed(2)}文字/秒\n` +
               `平均正確率: ${(score.avg_accuracy * 100).toFixed(2)}%\n` +
               `総ミスタイプ数: ${score.total_miss}`,
        inline: true
      });
    });

    return interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('ランキング取得エラー:', error);
    return interaction.reply({
      content: 'ランキングの取得中にエラーが発生しました',
      ephemeral: true
    });
  }
}
