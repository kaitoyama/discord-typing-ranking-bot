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
    RankedScores.continuousMiss AS continuous_miss,
    RankedScores.speed AS speed,
    RankedScores.accuracy AS accuracy,
    RankedScores.score AS best_score
    FROM
        (
            SELECT
                submission.userId,
                submission.miss,
                submission.continuousMiss,
                submission.speed,
                submission.accuracy,
                submission.score,
                ROW_NUMBER() OVER (PARTITION BY submission.userId ORDER BY submission.score DESC) AS rank
            FROM
                submission
            WHERE
                submission.channelId = ?
        ) AS RankedScores
    WHERE
        RankedScores.rank = 1
    ORDER BY
        best_score DESC` + (showAll ? '' : ' LIMIT 16'), [interaction.channelId]);

    console.log(rankedScores);

    if (rankedScores.length === 0) {
      return interaction.reply({
        content: 'まだランキングデータがありません',
        ephemeral: true
      });
    }

    const sortedScores = rankedScores
      .sort((a: { best_score: number; }, b: { best_score: number; }) => b.best_score - a.best_score);

    // Discordの制限: 1 embedあたりフィールドは25個まで
    const FIELDS_PER_EMBED = 25;
    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < sortedScores.length; i += FIELDS_PER_EMBED) {
      const chunk = sortedScores.slice(i, i + FIELDS_PER_EMBED);
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('タイピングランキング')
        .setDescription((showAll ? '全ユーザーのランキング' : 'トップ16のランキング') + ' (このチャンネル)');

      chunk.forEach((score: { user_name: any; best_score: any; speed: number; accuracy: number; miss: any; continuous_miss: any; }, indexInChunk: number) => {
        embed.addFields({
          name: `#${i + indexInChunk + 1}`,
          value: `ユーザー名: ${score.user_name}\n` +
                 `最高スコア: ${score.best_score}\n` +
                 `KPM: ${score.speed.toFixed(2)}\n` +
                 `スコア用正確率: ${(score.accuracy * 100).toFixed(2)}%\n` +
                 `ミスタイプ数: ${score.miss}\n` +
                 `連続ミス: ${score.continuous_miss}`,
          inline: true
        });
      });

      embeds.push(embed);
    }

    await interaction.reply({ embeds: [embeds[0]] });
    for (const embed of embeds.slice(1)) {
      await interaction.followUp({ embeds: [embed] });
    }
    return;

  } catch (error) {
    console.error('ランキング取得エラー:', error);
    return interaction.reply({
      content: 'ランキングの取得中にエラーが発生しました',
      ephemeral: true
    });
  }
}
