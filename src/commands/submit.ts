import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createThread } from '../utils/thread';
import { analyze } from '../utils/analyze';
import { calculateScore } from '../utils/score';
import { Submission } from '../entities/Submission';
import { AppDataSource } from '../config/typeorm.config';

export const data = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('画像を投稿します')
  .addAttachmentOption(option =>
    option
      .setName('image')
      .setDescription('投稿する画像')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const image = interaction.options.getAttachment('image', true);
  
  // 元のメッセージを送信
  await interaction.reply({
    files: [new AttachmentBuilder(image.url)],
    content: '画像が投稿されました！'
  });

  // スレッドを作成
  const thread = await createThread(interaction);

  try {
    // 画像分析を実行
    const result = await analyze(image.url);

    // 必須項目のチェック
    if (  result.level == null ||
      result.charCount == null ||
      result.accuracyRate == null ||
      result.mistypeCount == null ||
      result.continuousMistypeCount == null) {
      throw new Error('画像の分析に失敗しました。必要な情報が取得できませんでした。');
    }

    // タイピング速度と正確率を計算
    const speed = result.charCount; // 1分間あたりの文字数
    const accuracy = result.accuracyRate / 100; // 0-1の範囲に正規化
    
    // スコア計算
    const score = calculateScore(speed, accuracy, result.mistypeCount, result.continuousMistypeCount);

    if (interaction.user.username==='kaitoyama') {
      console.log('スコア:', score);
      console.log('レベル:', result.level);
      console.log('文字数:', result.charCount);
      console.log('正確率:', result.accuracyRate);
      console.log('ミスタイプ数:', result.mistypeCount);
      console.log('連続ミスタイプ数:', result.continuousMistypeCount);
      console.log('スレッドID:', thread.id);
      console.log('ユーザー名:', interaction.user.username);
      console.log('画像URL:', image.url);
    } else{
      if (result.level === 5) {
      // トランザクション開始
      await AppDataSource.manager.transaction(async transactionalEntityManager => {
        const submission = transactionalEntityManager.create(Submission, {
          userId: interaction.user.username,
          speed: speed,
          accuracy: accuracy,
          miss: result.mistypeCount,
          continuousMiss: result.continuousMistypeCount,
          score: score,
          channelId: interaction.channelId
        });
        await transactionalEntityManager.save(submission);
      });
    }
    }

    // 成功時のEmbedメッセージを作成
    const successEmbed = new EmbedBuilder()
      .setColor(result.level=== 5 ? 0x00FF00 : 0xFFA500)  // レベル5未満は橙色
      .setTitle('分析結果')
      .addFields(
        { name: 'レベル', value: `${result.level}`, inline: true },
        { name: '文字数', value: `${result.charCount}文字`, inline: true },
        { name: '正確率', value: `${result.accuracyRate}%`, inline: true },
        { name: 'ミスタイプ数', value: `${result.mistypeCount}回`, inline: true },
        { name: '連続ミスタイプ数', value: `${result.continuousMistypeCount}回`, inline: true }
      );

    if (result.level != 5) {
      successEmbed.addFields({
        name: '⚠️ 警告',
        value: 'レベル5でないとランキングに参加できません！',
        inline: false
      });
    }

    // スレッドに結果を送信
    await thread.send({ embeds: [successEmbed] });

  } catch (error) {
    // エラー時のEmbedメッセージを作成
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('エラーが発生しました')
      .setDescription(error instanceof Error ? error.message : '不明なエラーが発生しました')
      .setTimestamp();

    // スレッドにエラーメッセージを送信
    await thread.send({ embeds: [errorEmbed] });
  }
}
