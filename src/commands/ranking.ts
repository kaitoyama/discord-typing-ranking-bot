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
    
    const rankedScores = await submissionRepo
      .createQueryBuilder('submission')
      .select([
        'submission.userId',
        'submission.score as best_score',
        'submission.miss as miss_type_count',
        'submission.speed as speed',
        'submission.accuracy as accuracy'
      ])
      .distinctOn(['submission.userId'])
      .orderBy({
        'submission.userId': 'ASC',
        'submission.score': 'DESC'
      })
      .limit(showAll ? undefined : 16)
      .getRawMany();

    if (rankedScores.length === 0) {
      return interaction.reply({
        content: 'まだランキングデータがありません',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('タイピングランキング')
      .setDescription(showAll ? '全ユーザーのランキング' : 'トップ16のランキング');

    console.log(rankedScores);

    rankedScores
      .sort((a, b) => b.best_score - a.best_score)
      .forEach((score, index) => {
        embed.addFields({
          name: `#${index + 1}`,
          value: `ユーザー名: ${score.submission_userId}\n` +
                 `最高スコア: ${score.best_score}\n` +
                 `速度: ${score.speed.toFixed(2)}文字/秒\n` +
                 `正確率: ${(score.accuracy * 100).toFixed(2)}%\n` +
                 `ミスタイプ数: ${score.miss_type_count}`,
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
