import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createThread } from '../utils/thread';
import { analyze } from '../utils/analyze';

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
    if (!result.level || !result.charCount || !result.accuracyRate || !result.mistypeCount) {
      throw new Error('画像の分析に失敗しました。必要な情報が取得できませんでした。');
    }

    // 成功時のEmbedメッセージを作成
    const successEmbed = new EmbedBuilder()
      .setColor(result.level>= 5 ? 0x00FF00 : 0xFFA500)  // レベル5未満は橙色
      .setTitle('分析結果')
      .addFields(
        { name: 'レベル', value: `${result.level}`, inline: true },
        { name: '文字数', value: `${result.charCount}文字`, inline: true },
        { name: '正確率', value: `${result.accuracyRate}%`, inline: true },
        { name: 'ミスタイプ数', value: `${result.mistypeCount}回`, inline: true }
      );

    if (result.level < 5) {
      successEmbed.addFields({
        name: '⚠️ 警告',
        value: 'レベル5以上でないとランキングに参加できません！',
        inline: false
      });
    }

    // スレッドに結果を送信
    await thread.send({ embeds: [successEmbed] });

  } catch (error) {
    // エラー時のEmbedメッセージを作成
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('エラー')
      .setDescription(error instanceof Error ? error.message : '画像の分析中にエラーが発生しました。');

    // スレッドにエラーメッセージを送信
    await thread.send({ embeds: [errorEmbed] });
  }
}