const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { fetch } = require('undici'); // Use undici for fetching

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

            // --- Fetch status from mcsrvstat.us API ---
            const res = await fetch(`https://api.mcsrvstat.us/3/${guildConfig.serverIp}:${guildConfig.serverPort}`);
            const data = await res.json();

            // --- Build Online Embed ---
            if (data.online) {
                
                // --- NEW: Create the Playerlist Button ---
                const playerListButton = new ButtonBuilder()
                    .setCustomId('status-player-list') // This ID will be used in interactionCreate.js
                    .setLabel('Playerlist')
                    .setStyle(ButtonStyle.Primary) // This makes it blue
                    .setDisabled(data.players.online === 0); // Disable if no one is online

                const row = new ActionRowBuilder().addComponents(playerListButton);
                // --- End of new button code ---

                const onlineEmbed = new EmbedBuilder()
                    .setColor(0x57F287) // Green
                    .setTitle(guildConfig.serverName || (data.motd && data.motd.clean[0]) || 'Minecraft Server')
                    .setThumbnail(data.icon || guildConfig.thumbnailUrl || null)
                    .setDescription(guildConfig.serverDescription || null)
                    .addFields(
                        { name: 'Status', value: '✅ Online' },
                        { name: 'Players', value: `\`${data.players.online} / ${data.players.max}\`` },
                        { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                        { name: 'Next Restart', value: 'Not Scheduled' }, // Placeholder
                        { name: 'Server Uptime', value: 'N/A' }          // Placeholder
                    )
                    .setImage(guildConfig.serverBannerUrl || null)
                    .setTimestamp()
                    .setFooter({ text: '© Created by RgX' });

                // Send the embed *with* the button
                await interaction.editReply({ embeds: [onlineEmbed], components: [row] }); 
            } 
            // --- Build Offline Embed ---
            else {
                throw new Error('Server is offline'); // Jump to the catch block
            }

        } catch (error) {
            console.error('Error fetching server status (mcsrvstat):', error.message);
            
            const config = guildConfig || await GuildConfig.findOne({ guildId });
            
            const offlineEmbed = new EmbedBuilder()
                .setColor(0xED4245) // Red
                .setTitle(config.serverName || config.serverIp || 'Minecraft Server')
                .setThumbnail(config.thumbnailUrl || null)
                .setDescription(config.serverDescription || null)
                .addFields(
                    { name: 'Status', value: '❌ Offline' },
                    { name: 'Players', value: '`N/A`' },
                    { name: 'Server IP', value: `\`${config.serverIp || 'Not Set'}\`` },
                    { name: 'Next Restart', value: 'Not Scheduled' },
                    { name: 'Server Uptime', value: 'N/A' }
                )
                .setImage(config.serverBannerUrl || null)
                .setTimestamp()
                .setFooter({ text: '© Created by RgX' });
            
            // Send the offline embed (no buttons)
            await interaction.editReply({ 
                embeds: [offlineEmbed], 
                components: [], // No buttons
                ephemeral: true 
            });
        }
    },
};
