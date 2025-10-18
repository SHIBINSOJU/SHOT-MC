
const { SlashCommandBuilder } = require('@discordjs/builders');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rcon')
        .setDescription('Sets up the RCON details for the server.')
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('The RCON port.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('The RCON password.')
                .setRequired(true)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const rconPort = interaction.options.getInteger('port');
        const rconPassword = interaction.options.getString('password');

        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { rconPort, rconPassword },
                { upsert: true, new: true }
            );

            await interaction.reply({
                content: 'RCON details have been set up successfully!',
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error setting up RCON:', error);
            await interaction.reply({
                content: 'There was an error while setting up RCON. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
