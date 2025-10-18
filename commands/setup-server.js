
const { SlashCommandBuilder } = require('@discordjs/builders');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-server')
        .setDescription('Sets up the Minecraft server details.')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address of the server.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('The port of the server.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('edition')
                .setDescription('The edition of the server (java or bedrock).')
                .setRequired(true)
                .addChoices(
                    { name: 'Java', value: 'java' },
                    { name: 'Bedrock', value: 'bedrock' }
                )),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const serverIp = interaction.options.getString('ip');
        const serverPort = interaction.options.getInteger('port');
        const serverEdition = interaction.options.getString('edition');

        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { guildId, serverIp, serverPort, serverEdition },
                { upsert: true, new: true }
            );

            await interaction.reply({
                content: 'Server details have been set up successfully!',
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error setting up server:', error);
            await interaction.reply({
                content: 'There was an error while setting up the server. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
