
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('players')
        .setDescription('Displays the list of online players.'),
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

            const playerList = state.players.length > 0
                ? state.players.map(p => p.name).join(', ')
                : 'No players online.';

            const embed = new EmbedBuilder()
                .setTitle('Online Players')
                .setColor('Blue')
                .setDescription(playerList)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching player list:', error);
            await interaction.reply({
                content: 'There was an error while fetching the player list. Please ensure the server is online and the IP/port are correct.',
                ephemeral: true,
            });
        }
    },
};
