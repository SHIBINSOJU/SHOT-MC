
const { SlashCommandBuilder } = require('@discordjs/builders');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-status-interval')
        .setDescription('Sets the update interval for the live status message.')
        .addIntegerOption(option =>
            option.setName('interval')
                .setDescription('The update interval in seconds.')
                .setRequired(true)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const interval = interaction.options.getInteger('interval');

        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { statusUpdateInterval: interval * 1000 },
                { upsert: true, new: true }
            );

            await interaction.reply({
                content: `Status update interval has been set to ${interval} seconds!`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error setting up status interval:', error);
            await interaction.reply({
                content: 'There was an error while setting up the status interval. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
