
const { SlashCommandBuilder } = require('@discordjs/builders');
const { sendRconCommand } = require('../utils/rcon');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manages the server whitelist.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adds a player to the whitelist.')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('The username of the player to add.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Removes a player from the whitelist.')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('The username of the player to remove.')
                        .setRequired(true))),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildConfig = await GuildConfig.findOne({ guildId });

        if (!guildConfig || !guildConfig.rconPort || !guildConfig.rconPassword) {
            return await interaction.reply({
                content: 'RCON has not been set up yet. Please use `/setup-rcon` first.',
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const username = interaction.options.getString('username');

        try {
            const response = await sendRconCommand(
                {
                    host: guildConfig.serverIp,
                    port: guildConfig.rconPort,
                    password: guildConfig.rconPassword,
                },
                `whitelist ${subcommand} ${username}`
            );

            await interaction.reply({
                content: response,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error sending RCON command:', error);
            await interaction.reply({
                content: 'There was an error while sending the RCON command. Please ensure the server is online and RCON is configured correctly.',
                ephemeral: true,
            });
        }
    },
};
