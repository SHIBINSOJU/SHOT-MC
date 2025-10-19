const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays the live status of the Minecraft server.'),
    async execute(interaction) {
        
        await interaction.deferReply(); // We keep this to prevent "Unknown Interaction"

        const guildId = interaction.guild.id;
        let guildConfig;

        try {
            guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig || !guildConfig.serverIp) {
                return await interaction.editReply({
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
                .setLabel('Refresh') // Shortened label
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const playerListButton = new ButtonBuilder()
                .setCustomId('status-player-list')
                .setLabel('Player List') // Shortened label
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👥')
                .setDisabled(state.players.length === 0);

            const joinDiscordButton = new ButtonBuilder()
                .setLabel('Join Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder');

            const row = new ActionRowBuilder()
                .addComponents(refreshButton, playerListButton, joinDiscordButton);

            // --- NEW Online Embed (More attractive) ---
            const onlineEmbed = new EmbedBuilder()
                .setTitle(`${guildConfig.serverName || state.name} | Server Status`)
                .setColor('Green')
                .setThumbnail(state.raw.favicon || null)
                .addFields(
                    // Using inline: true to make them side-by-side
                    { name: '🏷️ Server Name', value: `\`${guildConfig.serverName || state.name}\``, inline: true },
                    { name: '✅ Status', value: '`Online`', inline: true },
                    { name: '🖥️ IP', value: `\`${guildConfig.serverIp}\``, inline: true },
                    { name: '🔌 Port', value: `\`${guildConfig.serverPort}\``, inline: true },
                    { name: '👥 Players', value: `\`${state.players.length} / ${state.maxplayers}\``, inline: true },
                    { name: '🌐 Version', value: `\`${state.raw.version.name}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: '© Created by RgX' });

            await interaction.editReply({ embeds: [onlineEmbed], components: [row] });

        } catch (error) {
            console.error('Error fetching server status:', error);

            // --- NEW Offline Embed (Matches screenshot, more attractive) ---
            
            // Use server IP as fallback if name is not set
            const serverName = guildConfig.serverName || guildConfig.serverIp; 
            
            const offlineEmbed = new EmbedBuilder()
                .setTitle(`${serverName} | Server Status`) // Better title
                .setColor('Red')
                .addFields(
                    { name: '🏷️ Server Name', value: `\`${serverName}\``, inline: true },
                    { name: '❌ Status', value: '`Offline`', inline: true },
                    { name: '🖥️ IP', value: `\`${guildConfig.serverIp}\``, inline: true },
                    { name: '🔌 Port', value: `\`${guildConfig.serverPort}\``, inline: true },
                    { name: '👥 Players', value: '`N/A`', inline: true }, // Added Player field
                    { name: '🌐 Version', value: '`N/A`', inline: true } // Added Version field
                )
                .setTimestamp()
                .setFooter({ text: '© Created by RgX' });

            // Add Refresh and Join Discord buttons to the offline message
            const refreshButton = new ButtonBuilder()
                .setCustomId('status-refresh')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');
            
            const joinDiscordButton = new ButtonBuilder()
                .setLabel('Join Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder');
                
            const offlineRow = new ActionRowBuilder().addComponents(refreshButton, joinDiscordButton);
            
            await interaction.editReply({ 
                embeds: [offlineEmbed], 
                components: [offlineRow], 
                ephemeral: true // Keep this so only the user sees the error
            });
        }
    },
};
