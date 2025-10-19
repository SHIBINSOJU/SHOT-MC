// We need to import the new builders for the buttons
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

/**
 * This function updates the status for ONE specific guild.
 * This is much safer than updating all guilds at once.
 * @param {Client} client The Discord client
 * @param {object} guildConfig The mongoose config document for a guild
 */
async function updateStatus(client, guildConfig) {
    // Find the channel. If it's not found, clear it from the DB
    const channel = await client.channels.fetch(guildConfig.statusChannelId).catch(() => null);
    if (!channel) {
        console.warn(`[StatusUpdater] Channel not found for guild ${guildConfig.guildId}. Removing config.`);
        guildConfig.statusChannelId = undefined;
        guildConfig.statusMessageId = undefined;
        await guildConfig.save();
        return;
    }

    let embed;

    // --- Create the "Join Discord" button ---
    // This is a LINK button, so it doesn't need an interaction handler.
    // We don't add "Refresh" or "Player List" here, as this message is non-interactive.
    const joinDiscordButton = new ButtonBuilder()
        .setLabel('Join Discord')
        .setStyle(ButtonStyle.Link)
        // Make sure you have 'discordInvite' in your GuildConfig model!
        .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder');

    const row = new ActionRowBuilder().addComponents(joinDiscordButton);

    try {
        // --- Query the server ---
        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        // --- Build Player List String ---
        // We'll show the player list directly in this embed.
        let playerList = state.players.map(p => `• ${p.name.replace(/_/g, '\\_')}`).join('\n');
        if (playerList.length > 1000) { // Discord field limit is 1024
            playerList = playerList.substring(0, 1000) + '\n...and more';
        }
        if (state.players.length === 0) {
            playerList = 'No players online';
        }

        // --- NEW Online Embed (Matches /status command) ---
        embed = new EmbedBuilder()
            .setTitle(`${guildConfig.serverName || state.name} | Server Status`)
            .setColor('Green')
            .addFields(
                { name: 'Server Name', value: guildConfig.serverName || state.name },
                { name: 'IP', value: guildConfig.serverIp },
                { name: 'Port', value: `${guildConfig.serverPort}` },
                { name: 'Status', value: '✅ Online' },
                { name: 'Players Online', value: `**${state.players.length} / ${state.maxplayers}**` },
                { name: 'Player List', value: playerList } // Show the list directly
            )
            .setThumbnail(state.raw.favicon || null)
            .setTimestamp()
            .setFooter({ text: '© Created by RgX' });

    } catch (error) {
        // --- NEW Offline Embed (Matches /status command) ---
        embed = new EmbedBuilder()
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
    }

    // --- Find the message and send/edit it ---
    try {
        if (guildConfig.statusMessageId) {
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
            if (message) {
                // Message exists, edit it
                await message.edit({ embeds: [embed], components: [row] });
            } else {
                // Message was deleted, send a new one
                const newMessage = await channel.send({ embeds: [embed], components: [row] });
                guildConfig.statusMessageId = newMessage.id;
                await guildConfig.save();
            }
        } else {
            // No message ID stored, send a new one
            const newMessage = await channel.send({ embeds: [embed], components: [row] });
            guildConfig.statusMessageId = newMessage.id;
            await guildConfig.save();
        }
    } catch (msgError) {
        console.error(`[StatusUpdater] Failed to send/edit message for guild ${guildConfig.guildId}:`, msgError);
        // If message was deleted (10008 = Unknown Message), clear the ID so it posts a new one next time
        if (msgError.code === 10008) {
            guildConfig.statusMessageId = undefined;
            await guildConfig.save();
        }
    }
}

/**
 * This function is called by index.js
 * It finds all guilds with an auto-status setup and creates an interval for each one.
 * @param {Client} client The Discord client
 */
module.exports = async (client) => {
    // We'll store intervals in a Map on the client
    if (!client.statusUpdateIntervals) {
        client.statusUpdateIntervals = new Map();
    }

    // Find all guilds that have a status channel AND interval set
    const guilds = await GuildConfig.find({
        statusChannelId: { $exists: true, $ne: null },
        statusUpdateInterval: { $exists: true, $ne: null }
    });

    console.log(`[StatusUpdater] Initializing status updates for ${guilds.length} guilds.`);

    for (const guildConfig of guilds) {
        // Clear any old interval for this guild (in case of bot restart)
        if (client.statusUpdateIntervals.has(guildConfig.guildId)) {
            clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
        }

        // Run one update immediately on startup
        await updateStatus(client, guildConfig);

        // Set the new interval
        const intervalTime = guildConfig.statusUpdateInterval;
        const newInterval = setInterval(async () => {
            // We fetch the *latest* config each time
            // This ensures if the channel/interval is changed, the loop respects it
            const latestConfig = await GuildConfig.findOne({ guildId: guildConfig.guildId });
            
            if (latestConfig && latestConfig.statusChannelId && latestConfig.statusUpdateInterval) {
                await updateStatus(client, latestConfig);
            } else {
                // The config was removed or disabled. Stop the loop for this guild.
                clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
                client.statusUpdateIntervals.delete(guildConfig.guildId);
                console.log(`[StatusUpdater] Stopping updates for guild ${guildConfig.guildId}.`);
            }
        }, intervalTime);

        // Store the interval
        client.statusUpdateIntervals.set(guildConfig.guildId, newInterval);
    }
};
