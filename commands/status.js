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

            // --- THIS IS THE FIX ---
            // Check the edition and set the correct API URL
            const edition = guildConfig.serverEdition === 'bedrock' ? 'bedrock/3' : '3';
            const res = await fetch(`https://api.mcsrvstat.us/${edition}/${guildConfig.serverIp}:${guildConfig.serverPort}`);
            // --- END OF FIX ---
            
            const data = await res.json();

            // --- Build Online Embed ---
            if (data.online) {
                
                const serverName = guildConfig.serverName || (data.motd && data.motd.clean[0]) || guildConfig.serverIp;

                const playerListButton = new ButtonBuilder()
                    .setCustomId('status-player-list') 
                    .setLabel('Playerlist')
                    .setStyle(ButtonStyle.Primary) // Blue
                    .setDisabled(data.players.online === 0);

                const row = new ActionRowBuilder().addComponents(playerListButton);

                const onlineEmbed = new EmbedBuilder()
                    .setColor(0x57F287) // Green
                    .setTitle(`${serverName} | Server Status`)
                    .setThumbnail(data.icon || guildConfig.thumbnailUrl || null)
                    .addFields(
                        { name: 'Server Name', value: `\`${serverName}\`` },
                        { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                        { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                        { name: 'Players', value: `\`${data.players.online} / ${data.players.max}\`` }
                    )
                    .setTimestamp()
                    .setFooter({ text: interaction.client.user.username });

                await interaction.editReply({ embeds: [onlineEmbed], components: [row] }); 
            } 
            // --- Build Offline Embed ---
            else {
                throw new Error('Server is offline'); // Jump to the catch block
            }

        } catch (error) {
            console.error('Error fetching server status (mcsrvstat):', error.message);
            
            const config = guildConfig || await GuildConfig.findOne({ guildId });
            const serverName = config.serverName || config.serverIp || 'Minecraft Server';

            const offlineEmbed = new EmbedBuilder()
                .setColor(0xED4245) // Red
                .setTitle(`${serverName} | Server Status`)
                .setThumbnail(config.thumbnailUrl || null)
                .addFields(
                    { name: 'Server Name', value: `\`${serverName}\`` },
                    { name: 'Server IP', value: `\`${config.serverIp || 'Not Set'}\`` },
                    { name: 'Server Port', value: `\`${config.serverPort || 'Not Set'}\`` },
                    { name: 'Players', value: '`N/A`' },
                    { name: 'Status', value: '`❌ Offline`' }
                )
                .setTimestamp()
                .setFooter({ text: interaction.client.user.username });
            
            await interaction.editReply({ 
                embeds: [offlineEmbed], 
                components: [], // No buttons for offline
                ephemeral: true 
            });
        }
    },
};
