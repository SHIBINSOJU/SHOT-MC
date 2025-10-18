
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-status-channel')
        .setDescription('Sets the channel for live server status updates.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send status updates to.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const statusChannel = interaction.options.getChannel('channel');

        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { statusChannelId: statusChannel.id },
                { upsert: true, new: true }
            );

            await interaction.reply({
                content: `Status channel has been set to ${statusChannel}!`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error setting up status channel:', error);
            await interaction.reply({
                content: 'There was an error while setting up the status channel. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
