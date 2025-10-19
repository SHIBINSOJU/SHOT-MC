const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const gamedig = require('gamedig'); // Use gamedig

async function updateStatus(client, guildConfig) {
    // console.log(`[StatusUpdater] Starting updateStatus for guild ${guildConfig.guildId}`); // Optional: Add log here too
    const channel = await client.channels.fetch(guildConfig.statusChannelId).catch(() => null);
    if (!channel) {
        console.warn(`[StatusUpdater] Channel not found for guild ${guildConfig.guildId}. Removing config.`);
        guildConfig.statusChannelId = undefined;
        guildConfig.statusMessageId = undefined;
        await guildConfig.save();
        return;
    }

    let embed;

    const intervalSeconds = (guildConfig.statusUpdateInterval || 60000) / 1000;
    const footerText = `${client.user.username} | Auto-updates every ${intervalSeconds} seconds`;

    try {
        // --- Fetch status using gamedig ---
         const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        const serverName = guildConfig.serverName || state.name || guildConfig.serverIp;

        // --- Build Online Embed ---
        embed = new EmbedBuilder()
            .setColor(0x57F287) // Green
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || state.raw?.favicon || null) // Use stored thumbnail or favicon
            .addFields(
                { name: 'Status', value: '🟢 Server Online' },
                { name: 'MOTD', value: `\`\`\`${state.name || 'N/A'}\`\`\`` }, // MOTD in code block
                { name: 'Server Name', value: `\`${serverName}\`` },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                { name: 'Players', value: `\`${state.players.length} / ${state.maxplayers}\`` }
            )
            .setTimestamp()
            .setFooter({ text: footerText });

    } catch (error) {
        // --- Build Offline Embed ---
        // console.error(`[StatusUpdater] Gamedig query failed for ${guildConfig.guildId}:`, error.message); // Log the gamedig error specifically
        const serverName = guildConfig.serverName || guildConfig.serverIp;

        embed = new EmbedBuilder()
            .setColor(0xED4245) // Red
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || null)
            .addFields(
                { name: 'Status', value: '🔴 Server Offline' },
                { name: 'MOTD', value: '```N/A```' }, // MOTD placeholder
                { name: 'Server Name', value: `\`${serverName}\`` },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                { name: 'Players', value: '`N/A`' }
            )
            .setTimestamp()
            .setFooter({ text: footerText });
    }

    // --- Send/Edit Message ---
    try {
        if (guildConfig.statusMessageId) {
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
            if (message) {
                // console.log(`[StatusUpdater] Editing message ${message.id} for guild ${guildConfig.guildId}`); // Optional log
                await message.edit({ embeds: [embed], components: [] });
            } else {
                // console.log(`[StatusUpdater] Message ${guildConfig.statusMessageId} not found, sending new one for ${guildConfig.guildId}`); // Optional log
                guildConfig.statusMessageId = undefined; // Clear the invalid ID
                const newMessage = await channel.send({ embeds: [embed], components: [] });
                guildConfig.statusMessageId = newMessage.id;
                await guildConfig.save();
            }
        } else {
            // console.log(`[StatusUpdater] No message ID found, sending new message for ${guildConfig.guildId}`); // Optional log
            const newMessage = await channel.send({ embeds: [embed], components: [] });
            guildConfig.statusMessageId = newMessage.id;
            await guildConfig.save();
        }
    } catch (msgError) {
        console.error(`[StatusUpdater] Failed to send/edit message for guild ${guildConfig.guildId}:`, msgError);
        if (msgError.code === 10008) { // Unknown Message error code
            guildConfig.statusMessageId = undefined;
            await guildConfig.save();
            console.log(`[StatusUpdater] Cleared deleted message ID for guild ${guildConfig.guildId}`);
        }
    }
}

// --- Interval Handler ---
module.exports = async (client) => {
    if (!client.statusUpdateIntervals) {
        client.statusUpdateIntervals = new Map();
    }
    const guilds = await GuildConfig.find({
        statusChannelId: { $exists: true, $ne: null },
        statusUpdateInterval: { $exists: true, $ne: null }
    });
    console.log(`[StatusUpdater] Initializing status updates for ${guilds.length} guilds.`);
    for (const guildConfig of guilds) {
        if (client.statusUpdateIntervals.has(guildConfig.guildId)) {
            clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
            console.log(`[StatusUpdater] Cleared existing interval for guild ${guildConfig.guildId} during initialization.`);
        }
        
        // Run one update immediately on startup
        console.log(`[StatusUpdater] Running initial update for guild ${guildConfig.guildId}.`);
        await updateStatus(client, guildConfig);

        const intervalTime = guildConfig.statusUpdateInterval;
        console.log(`[StatusUpdater] Setting interval for guild ${guildConfig.guildId} to ${intervalTime}ms.`);

        // --- THIS IS THE MODIFIED PART WITH LOGGING ---
        const newInterval = setInterval(async () => {
            console.log(`[StatusUpdater Interval] Tick for guild ${guildConfig.guildId} at ${new Date().toLocaleTimeString()}`); // Log interval fire
            // Fetch latest config inside the interval to respect changes
            const latestConfig = await GuildConfig.findOne({ guildId: guildConfig.guildId });

            if (latestConfig && latestConfig.statusChannelId && latestConfig.statusUpdateInterval) {
                 // Check if interval time changed
                if (latestConfig.statusUpdateInterval !== intervalTime) {
                    console.log(`[StatusUpdater Interval] Interval changed for ${guildConfig.guildId}. Restarting loop is recommended.`);
                    // Ideally, you'd clear this interval and re-run the setup, but for now, we'll just log
                }

                console.log(`[StatusUpdater Interval] Found config, calling updateStatus for ${guildConfig.guildId}.`); // Log before calling update
                try {
                    await updateStatus(client, latestConfig);
                    // console.log(`[StatusUpdater Interval] updateStatus completed for ${guildConfig.guildId}.`); // Optional: Log completion
                } catch (updateError) {
                    console.error(`[StatusUpdater Interval] Error calling updateStatus for ${guildConfig.guildId}:`, updateError); // Log errors during update
                }
            } else {
                console.log(`[StatusUpdater Interval] Config invalid or removed for ${guildConfig.guildId}. Clearing interval.`); // Log config issue
                clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
                client.statusUpdateIntervals.delete(guildConfig.guildId);
                console.log(`[StatusUpdater] Stopping updates for guild ${guildConfig.guildId}.`);
            }
        }, intervalTime); // Use intervalTime from initial config
        // --- END OF MODIFIED PART ---

        client.statusUpdateIntervals.set(guildConfig.guildId, newInterval);
    }
};
