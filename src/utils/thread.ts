import { ChatInputCommandInteraction } from 'discord.js';

export async function createThread(interaction: ChatInputCommandInteraction) {
  const message = await interaction.fetchReply();
  return message.startThread({
    name: 'Discussion',
    autoArchiveDuration: 60,
    reason: 'Discussion about the submitted image'
  });
}