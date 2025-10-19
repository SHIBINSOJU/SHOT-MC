const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // --- Handle Slash Commands ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // --- THIS IS THE FIXED CATCH BLOCK ---
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command: ${interaction.commandName}`, error);
                
                // --- NEW CRASH-PROOF CATCH ---
                // We wrap the error reply in its own try...catch
                // This stops the bot from crashing if sending the error message fails
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                } catch (catchError) {
                    // This logs the "Unknown Interaction" error but DOES NOT crash the bot
                    console.error('Error while sending error reply:', catchError);
                }
                // --- END OF FIX ---
            }
            return; 
        }

        // --- Handle Button Clicks ---
        if (interaction.isButton()) {
            try {
                if (interaction.customId === 'status-player-list') {
                    await handlePlayerList(interaction);
                }
                
                if (interaction.customId === 'status-refresh') {
                    await handleRefresh(interaction);
                }
            } catch (buttonError) {
                console.error(`Error handling button: ${interaction.customId}`, buttonError);
                // Send a reply for the button error
                try {
                    await interaction.reply({ content: 'There was an error handling this button!', ephemeral: true });
                } catch (e) {
                    // If that fails, try to follow up
                    try {
                        await interaction.followUp({ content: 'There was an error handling this button!', ephemeral: true });
                    } catch (finalError) {
                        console.error('Failed to send any error message for button interaction:', finalError);
                    }
                }
            }
        }
    },
};


// --- Button Function: handlePlayerList ---
async function handlePlayerList(interaction) {
    const guildId = interaction.guild.id;
    const guildConfig = await GuildConfig.findOne({ guildId });

    if (!guildConfig) {
        return await interaction.reply({ content: 'Server config not found.', ephemeral: true });
    }

    try {
        await interaction.deferReply({ ephemeral: true }); 

        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        const playerList = state.players.map(p => `• ${p.name.replace(/_/g, '\\_')}`).join('\n');

        const playerEmbed = new EmbedBuilder()
            .setTitle(`Player List (${state.players.length}/${state.maxplayers})`)
            .setDescription(playerList || 'No players are currently online.')
            .setColor('Green');

        await interaction.editReply({ embeds: [playerEmbed] });

    } catch (error) {
        console.error('Error in handlePlayerList:', error);
        await interaction.editReply({ content: 'Could not fetch player list. The server might be offline.' });
    }
}

// --- Button Function: handleRefresh ---
async function handleRefresh(interaction) {
    const guildId = interaction.guild.id;
    let guildConfig;

    try {
        await interaction.deferUpdate(); // Acknowledge the click

        guildConfig = await GuildConfig.findOne({ guildId });
        if (!guildConfig) {
            return await interaction.followUp({ content: 'Server config not found.', ephemeral: true });
        }

        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

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
            .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder'); 

        const row = new ActionRowBuilder()
            .addComponents(refreshButton, playerListButton, joinDiscordButton);

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
        console.error('Error in handleRefresh (server offline?):', error);
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
        
        await interaction.editReply({ embeds: [offlineEmbed], components: [offlineRow] });
    }
}
