
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays the live status of the Minecraft server.'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildConfig = await GuildConfig.findOne({ guildId });

        if (!guildConfig || !guildConfig.serverIp) {
            return await interaction.reply({
                content: 'The server has not been set up yet. Please use `/setup-server` first.',
                ephemeral: true,
            });
        }

        try {
            const state = await gamedig.query({
                type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
                host: guildConfig.serverIp,
                port: guildConfig.serverPort,
            });

            const embed = new EmbedBuilder()
                .setTitle('Server Status')
                .setColor('Green')
                .addFields(
                    { name: 'MOTD', value: state.name },
                    { name: 'Players', value: `${state.players.length}/${state.maxplayers}` },
                    { name: 'Version', value: state.raw.vanilla.raw.version.name },
                    { name: 'Latency', value: `${state.ping}ms` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching server status:', error);
            await interaction.reply({
                content: 'There was an error while fetching the server status. Please ensure the server is online and the IP/port are correct.',
                ephemeral: true,
            });
        }
    },
};
