import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("echo")
  .setDescription("メッセージをオウム返しします")
  .addStringOption(option =>
    option.setName("message")
      .setDescription("オウム返しするメッセージ")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const message = interaction.options.get("message")?.value as string;
  return interaction.reply(message || "メッセージがありません");
}