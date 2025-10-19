// Note the updated imports from 'discord.js'
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays the live status of the Minecraft server.'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        let guildConfig;

        try {
            guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig || !guildConfig.serverIp) {
                return await interaction.reply({
                    content: 'The server has not been set up yet. Please use `/setup-server` first.',
                    ephemeral: true,
                });
            }

            // --- Fetch Server State ---
            const state = await gamedig.query({
                type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
                host: guildConfig.serverIp,
                port: guildConfig.serverPort,
            });

            // --- Create Buttons ---
            const refreshButton = new ButtonBuilder()
                .setCustomId('status-refresh')
                .setLabel('Refresh Status')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const playerListButton = new ButtonBuilder()
                .setCustomId('status-player-list')
                .setLabel('Show Player List')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👥')
                .setDisabled(state.players.length === 0); // Disable button if no one is online

            const joinDiscordButton = new ButtonBuilder()
                .setLabel('Join Discord')
                .setStyle(ButtonStyle.Link)
                // You'll need to store your invite link in your config, or hardcode it here
                .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder');

            const row = new ActionRowBuilder()
                .addComponents(refreshButton, playerListButton, joinDiscordButton);

            // --- Create Online Embed (matches image) ---
            const onlineEmbed = new EmbedBuilder()
                .setTitle(`${guildConfig.serverName || state.name} | Server Status`)
                .setColor('Green')
                .addFields(
                    { name: 'Server Name', value: guildConfig.serverName || state.name },
                    { name: 'IP', value: guildConfig.serverIp },
                    { name: 'Port', value: `${guildConfig.serverPort}` },
                    { name: 'Status', value: '✅ Online' },
                    { name: 'Players Online', value: `**${state.players.length} / ${state.maxplayers}**` },
                    { name: 'Player List', value: state.players.length > 0 ? 'Click button below' : 'No players online' }
                )
                // Add server icon if gamedig finds it
                .setThumbnail(state.raw.favicon || null) 
                .setTimestamp()
                .setFooter({ text: '© Created by RgX' }); // Added footer from image

            await interaction.reply({ embeds: [onlineEmbed], components: [row] });

        } catch (error) {
            console.error('Error fetching server status:', error);

            // --- Create Offline Embed ---
            // Send a different embed if the server is offline
            const offlineEmbed = new EmbedBuilder()
                .setTitle(`${guildConfig.serverName || 'Server'} | Server Status`)
                .setColor('Red')
                .addFields(
                    { name: 'Server Name', value: guildConfig.serverName || 'N/A' },
                    { name: 'IP', value: guildConfig.serverIp || 'N/A' },
                    { name: 'Port', value: guildConfig.serverPort ? `${guildConfig.serverPort}` : 'N/A' },
                    { name: 'Status', value: '❌ Offline' }
                )
                .setTimestamp()
                .setFooter({ text: '© Created by RgX' });

            // Add only the refresh button to the offline embed
            const refreshButton = new ButtonBuilder()
                .setCustomId('status-refresh')
                .setLabel('Refresh Status')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');
                
            const offlineRow = new ActionRowBuilder().addComponents(refreshButton);
            
            await interaction.reply({ 
                embeds: [offlineEmbed], 
                components: [offlineRow], 
                ephemeral: true 
            });
        }
    },
};
