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
    .query(`SELECT
    RankedScores.userId AS user_name,
    RankedScores.miss AS miss,
    RankedScores.speed AS speed,
    RankedScores.accuracy AS accuracy,
    RankedScores.score AS best_score
    FROM
        (
            SELECT
                submission.userId,
                submission.miss,
                submission.speed,
                submission.accuracy,
                submission.score,
                ROW_NUMBER() OVER (PARTITION BY submission.userId ORDER BY submission.score DESC) AS rank
            FROM
                submission
        ) AS RankedScores
    WHERE
        RankedScores.rank = 1
    ORDER BY
        best_score DESC` + (showAll ? '' : ' LIMIT 16'));

    console.log(rankedScores);

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


    rankedScores
      .sort((a: { best_score: number; }, b: { best_score: number; }) => b.best_score - a.best_score)
      .forEach((score: { user_name: any; best_score: any; speed: number; accuracy: number; miss: any; }, index: number) => {
        embed.addFields({
          name: `#${index + 1}`,
          value: `ユーザー名: ${score.user_name}\n` +
                 `最高スコア: ${score.best_score}\n` +
                 `速度: ${score.speed.toFixed(2)}文字/秒\n` +
                 `正確率: ${(score.accuracy * 100).toFixed(2)}%\n` +
                 `ミスタイプ数: ${score.miss}`,
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
