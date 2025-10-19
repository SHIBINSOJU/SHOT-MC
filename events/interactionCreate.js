const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // --- Handle Slash Commands ---
        // I've changed isCommand() to isChatInputCommand() as it's more specific
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
            return; // Stop execution after handling command
        }

        // --- Handle Button Clicks (This is the new part) ---
        if (interaction.isButton()) {
            
            // --- Handler for "Show Player List" Button ---
            if (interaction.customId === 'status-player-list') {
                await handlePlayerList(interaction);
            }
            
            // --- Handler for "Refresh Status" Button ---
            if (interaction.customId === 'status-refresh') {
                await handleRefresh(interaction);
            }
            
            // You can add more button handlers here with 'else if'
        }
    },
};


// --- Button Function: handlePlayerList ---
// This function runs when "Show Player List" is clicked
async function handlePlayerList(interaction) {
    const guildId = interaction.guild.id;
    const guildConfig = await GuildConfig.findOne({ guildId });

    if (!guildConfig) {
        return await interaction.reply({ content: 'Server config not found.', ephemeral: true });
    }

    try {
        await interaction.deferReply({ ephemeral: true }); // Show "thinking..."

        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        const playerList = state.players.map(p => `• ${p.name.replace(/_/g, '\\_')}`).join('\n'); // Added underscore formatting

        const playerEmbed = new EmbedBuilder()
            .setTitle(`Player List (${state.players.length}/${state.maxplayers})`)
            .setDescription(playerList || 'No players are currently online.')
            .setColor('Green');

        await interaction.editReply({ embeds: [playerEmbed] });

    } catch (error) {
        await interaction.editReply({ content: 'Could not fetch player list. The server might be offline.' });
    }
}

// --- Button Function: handleRefresh ---
// This function runs when "Refresh Status" is clicked
async function handleRefresh(interaction) {
    const guildId = interaction.guild.id;
    let guildConfig;

    try {
        await interaction.deferUpdate(); // Acknowledge the click, show "thinking..."

        guildConfig = await GuildConfig.findOne({ guildId });
        if (!guildConfig) {
            return await interaction.followUp({ content: 'Server config not found.', ephemeral: true });
        }

        // --- Re-run the gamedig query ---
        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        // --- Re-build the buttons ---
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
            .setDisabled(state.players.length === 0);

        const joinDiscordButton = new ButtonBuilder()
            .setLabel('Join Discord')
            .setStyle(ButtonStyle.Link)
            .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder'); // Make sure to set this in your config!

        const row = new ActionRowBuilder()
            .addComponents(refreshButton, playerListButton, joinDiscordButton);

        // --- Re-build the ONLINE Embed ---
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
            .setThumbnail(state.raw.favicon || null)
            .setTimestamp()
            .setFooter({ text: '© Created by RgX' });

        await interaction.editReply({ embeds: [onlineEmbed], components: [row] });

    } catch (error) {
        // --- Re-build the OFFLINE Embed ---
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

        const refreshButton = new ButtonBuilder()
            .setCustomId('status-refresh')
            .setLabel('Refresh Status')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');
            
        const offlineRow = new ActionRowBuilder().addComponents(refreshButton);
        
        // Use editReply to update the message, but don't make it ephemeral
        await interaction.editReply({ embeds: [offlineEmbed], components: [offlineRow] });
    }
}
