const { SlashCommandBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-server')
        .setDescription('Set or update the server details for the bot.')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The server IP (e.g., play.example.com)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('The server port (default: 25565)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The display name for your server.'))
        .addStringOption(option =>
            option.setName('edition')
                .setDescription('The server edition (java or bedrock)')
                .addChoices(
                    { name: 'Java', value: 'java' },
                    { name: 'Bedrock', value: 'bedrock' }
                ))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The text to show at the top of the embed.'))
        .addStringOption(option =>
            option.setName('banner-url')
                .setDescription('The URL for the big image at the bottom of the embed.'))
        .addStringOption(option =>
            option.setName('thumbnail-url')
                .setDescription('The URL for the small icon at the top-right.')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const config = await GuildConfig.findOneAndUpdate(
            { guildId },
            {
                guildId,
                serverIp: interaction.options.getString('ip'),
                serverPort: interaction.options.getInteger('port'),
                serverName: interaction.options.getString('name') || null,
                serverEdition: interaction.options.getString('edition') || 'java',
                serverDescription: interaction.options.getString('description') || null,
                serverBannerUrl: interaction.options.getString('banner-url') || null,
                thumbnailUrl: interaction.options.getString('thumbnail-url') || null,
            },
            { upsert: true, new: true }
        );

        await interaction.editReply(`✅ **Server settings updated!**
**IP:** \`${config.serverIp}\`
**Port:** \`${config.serverPort}\`
**Name:** \`${config.serverName || 'Not Set'}\`
**Description:** \`${config.serverDescription || 'Not Set'}\``);
    },
};
