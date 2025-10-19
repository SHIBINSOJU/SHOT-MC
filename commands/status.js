const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const gamedig = require('gamedig'); // Use gamedig

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays the live status of the Minecraft server.'),
    async execute(interaction) {
        
        await interaction.deferReply(); 

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

            // --- Fetch status using gamedig ---
            const state = await gamedig.query({
                type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft', 
                host: guildConfig.serverIp,
                port: guildConfig.serverPort,
            });

            // --- Build Online Embed ---
            const serverName = guildConfig.serverName || state.name || guildConfig.serverIp;

            const playerListButton = new ButtonBuilder()
                .setCustomId('status-player-list') 
                .setLabel('Playerlist')
                .setStyle(ButtonStyle.Primary) // Blue
                .setDisabled(state.players.length === 0);

            const row = new ActionRowBuilder().addComponents(playerListButton);

            const onlineEmbed = new EmbedBuilder()
                .setColor(0x57F287) // Green
                .setTitle(`${serverName} | Server Status`) 
                .setThumbnail(guildConfig.thumbnailUrl || state.raw?.favicon || null) // Use stored thumbnail or favicon from query
                .addFields(
                    // --- NEW FIELDS ---
                    { name: 'Status', value: '🟢 Server Online' },
                    { name: 'MOTD', value: `\`\`\`${state.name || 'N/A'}\`\`\`` }, // MOTD in code block
                    // --- EXISTING FIELDS ---
                    { name: 'Server Name', value: `\`${serverName}\`` },
                    { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                    { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                    { name: 'Players', value: `\`${state.players.length} / ${state.maxplayers}\`` }
                )
                .setTimestamp()
                .setFooter({ text: interaction.client.user.username });

            await interaction.editReply({ embeds: [onlineEmbed], components: [row] }); 
            
        } catch (error) {
            // gamedig throws an error when offline
            console.error('Error fetching server status (gamedig):', error.message);
            
            const config = guildConfig || await GuildConfig.findOne({ guildId });
            const serverName = config.serverName || config.serverIp || 'Minecraft Server';

            const offlineEmbed = new EmbedBuilder()
                .setColor(0xED4245) // Red
                .setTitle(`${serverName} | Server Status`)
                .setThumbnail(config.thumbnailUrl || null) 
                .addFields(
                    // --- NEW FIELDS ---
                    { name: 'Status', value: '🔴 Server Offline' },
                    { name: 'MOTD', value: '```N/A```' }, // MOTD placeholder
                    // --- EXISTING FIELDS ---
                    { name: 'Server Name', value: `\`${serverName}\`` },
                    { name: 'Server IP', value: `\`${config.serverIp || 'Not Set'}\`` },
                    { name: 'Server Port', value: `\`${config.serverPort || 'Not Set'}\`` },
                    { name: 'Players', value: '`N/A`' }
                    // Removed the extra 'Status' field from the end
                )
                .setTimestamp()
                .setFooter({ text: interaction.client.user.username });
            
            await interaction.editReply({ 
                embeds: [offlineEmbed], 
                components: [], 
                ephemeral: true 
            });
        }
    },
};
