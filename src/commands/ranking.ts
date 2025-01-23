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


    const users = rankedScores.map(score => score.submission_userId);
    const scores = rankedScores.map(score => score.best_score);
    const speeds = rankedScores.map(score => `${score.speed.toFixed(2)}文字/分`);
    const accuracies = rankedScores.map(score => `${(score.accuracy * 100).toFixed(2)}%`);
    const missTypes = rankedScores.map(score => score.miss_type_count);

    embed.addFields({name: 'ユーザー', value: users.join('\n'), inline: true});
    embed.addFields({name: 'スコア', value: scores.join('\n'), inline: true});
    embed.addFields({name: '速度', value: speeds.join('\n'), inline: true});
    embed.addFields({name: '正確率', value: accuracies.join('\n'), inline: true});
    embed.addFields({name: 'ミスタイプ数', value: missTypes.join('\n'), inline: true});


    return interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('ランキング取得エラー:', error);
    return interaction.reply({
      content: 'ランキングの取得中にエラーが発生しました',
      ephemeral: true
    });
  }
}
