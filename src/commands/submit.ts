import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createThread } from '../utils/thread';

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

  // Embedメッセージを作成
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('OK!')
    .setDescription('画像を受け取りました！');

  // スレッドにembedメッセージを送信
  await thread.send({ embeds: [embed] });
}