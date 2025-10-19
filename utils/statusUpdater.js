const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const gamedig = require('gamedig'); // Use gamedig

async function updateStatus(client, guildConfig) {
    const guildId = guildConfig.guildId; // Get guildId for logging
    console.log(`[updateStatus ${guildId}] Function called.`); // Log start

    const channel = await client.channels.fetch(guildConfig.statusChannelId).catch((err) => {
        console.error(`[updateStatus ${guildId}] Error fetching channel ${guildConfig.statusChannelId}:`, err.message);
        return null;
    });

    if (!channel) {
        console.warn(`[updateStatus ${guildId}] Channel not found. Removing config.`);
        guildConfig.statusChannelId = undefined;
        guildConfig.statusMessageId = undefined;
        await guildConfig.save();
        return;
    }
    // console.log(`[updateStatus ${guildId}] Found channel: ${channel.name}`); // Optional: Log channel name

    let embed;
    const intervalSeconds = (guildConfig.statusUpdateInterval || 60000) / 1000;
    const footerText = `${client.user.username} | Auto-updates every ${intervalSeconds} seconds`;
    let serverIsOnline = false; // Flag to track status

    try {
        // --- Fetch status using gamedig ---
         console.log(`[updateStatus ${guildId}] Querying server: ${guildConfig.serverIp}:${guildConfig.serverPort}`); // Log query start
         const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
            // socketTimeout: 5000 // Optional: Add a timeout
        });
        console.log(`[updateStatus ${guildId}] Query successful. Players: ${state.players.length}/${state.maxplayers}`); // Log query success
        serverIsOnline = true; // Set flag

        const serverName = guildConfig.serverName || state.name || guildConfig.serverIp;

        // --- Build Online Embed ---
        embed = new EmbedBuilder()
            // ... (rest of online embed code is the same) ...
            .setColor(0x57F287) // Green
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || state.raw?.favicon || null)
            .addFields(
                { name: 'Status', value: '🟢 Server Online' },
                { name: 'MOTD', value: `\`\`\`${state.name || 'N/A'}\`\`\`` },
                { name: 'Server Name', value: `\`${serverName}\`` },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                { name: 'Players', value: `\`${state.players.length} / ${state.maxplayers}\`` }
            )
            .setTimestamp()
            .setFooter({ text: footerText });


    } catch (error) {
         // --- Build Offline Embed ---
        console.error(`[updateStatus ${guildId}] Gamedig query failed:`, error.message); // Log gamedig error specifically
        serverIsOnline = false; // Set flag
        const serverName = guildConfig.serverName || guildConfig.serverIp;

        embed = new EmbedBuilder()
            // ... (rest of offline embed code is the same) ...
            .setColor(0xED4245) // Red
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || null)
            .addFields(
                { name: 'Status', value: '🔴 Server Offline' },
                { name: 'MOTD', value: '```N/A```' },
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
            console.log(`[updateStatus ${guildId}] Attempting to fetch message ID: ${guildConfig.statusMessageId}`); // Log message fetch attempt
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch((err) => {
                console.error(`[updateStatus ${guildId}] Error fetching message ${guildConfig.statusMessageId}:`, err.message); // Log fetch error
                return null;
            });

            if (message) {
                console.log(`[updateStatus ${guildId}] Message found. Attempting to edit...`); // Log edit attempt
                await message.edit({ embeds: [embed], components: [] });
                console.log(`[updateStatus ${guildId}] Message edited successfully.`); // Log edit success
            } else {
                console.log(`[updateStatus ${guildId}] Message ${guildConfig.statusMessageId} not found (deleted?). Sending new message.`); // Log message not found
                guildConfig.statusMessageId = undefined; // Clear the invalid ID
                const newMessage = await channel.send({ embeds: [embed], components: [] });
                guildConfig.statusMessageId = newMessage.id;
                await guildConfig.save();
                console.log(`[updateStatus ${guildId}] New message sent with ID: ${newMessage.id}`); // Log new message success
            }
        } else {
            console.log(`[updateStatus ${guildId}] No message ID stored. Sending new message.`); // Log no message ID
            const newMessage = await channel.send({ embeds: [embed], components: [] });
            guildConfig.statusMessageId = newMessage.id;
            await guildConfig.save();
            console.log(`[updateStatus ${guildId}] New message sent with ID: ${newMessage.id}`); // Log new message success
        }
    } catch (msgError) {
        console.error(`[updateStatus ${guildId}] CRITICAL ERROR during send/edit message:`, msgError); // Log critical send/edit errors
        if (msgError.code === 10008) { // Unknown Message error code
            guildConfig.statusMessageId = undefined;
            await guildConfig.save();
            console.log(`[updateStatus ${guildId}] Cleared deleted message ID.`);
        }
        // Also log permission errors specifically
        if (msgError.code === 50013) { // Missing Permissions
             console.error(`[updateStatus ${guildId}] Bot lacks permissions to send/edit messages in channel ${channel.id} (${channel.name}).`);
        }
    }
     console.log(`[updateStatus ${guildId}] Function finished.`); // Log end
}

// --- Interval Handler (No changes needed) ---
module.exports = async (client) => {
    // ... (rest of the interval code is the same, including the previous console logs inside setInterval) ...
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

        console.log(`[StatusUpdater] Running initial update for guild ${guildConfig.guildId}.`);
        await updateStatus(client, guildConfig); // Run initial update

        const intervalTime = guildConfig.statusUpdateInterval; // Get interval time ONCE
         if (!intervalTime || intervalTime < 5000) { // Add safety check for too-fast interval
            console.error(`[StatusUpdater] Invalid interval time (${intervalTime}ms) for guild ${guildConfig.guildId}. Minimum is 5000ms. Skipping interval setup.`);
            continue; // Skip setting up interval for this guild
        }
        console.log(`[StatusUpdater] Setting interval for guild ${guildConfig.guildId} to ${intervalTime}ms.`);


        const guildIdForInterval = guildConfig.guildId; // Store guildId to avoid closure issues
        const newInterval = setInterval(async () => {
            console.log(`[StatusUpdater Interval] Tick for guild ${guildIdForInterval} at ${new Date().toLocaleTimeString()}`); // Log interval fire
            // Fetch latest config inside the interval to respect changes
            const latestConfig = await GuildConfig.findOne({ guildId: guildIdForInterval });

            if (latestConfig && latestConfig.statusChannelId && latestConfig.statusUpdateInterval) {
                 // Check if interval time changed - LOG ONLY, doesn't restart interval automatically
                if (latestConfig.statusUpdateInterval !== intervalTime) {
                    console.warn(`[StatusUpdater Interval] Interval changed for ${guildIdForInterval} (now ${latestConfig.statusUpdateInterval}ms). A bot restart is needed for change to take effect.`);
                }

                console.log(`[StatusUpdater Interval] Found config, calling updateStatus for ${guildIdForInterval}.`); // Log before calling update
                try {
                    await updateStatus(client, latestConfig);
                    // console.log(`[StatusUpdater Interval] updateStatus completed for ${guildIdForInterval}.`); // Optional: Log completion
                } catch (updateError) {
                    console.error(`[StatusUpdater Interval] Error calling updateStatus for ${guildIdForInterval}:`, updateError); // Log errors during update
                }
            } else {
                console.log(`[StatusUpdater Interval] Config invalid or removed for ${guildIdForInterval}. Clearing interval.`); // Log config issue
                const intervalToClear = client.statusUpdateIntervals.get(guildIdForInterval);
                if(intervalToClear) clearInterval(intervalToClear);
                client.statusUpdateIntervals.delete(guildIdForInterval);
                console.log(`[StatusUpdater] Stopping updates for guild ${guildIdForInterval}.`);
            }
        }, intervalTime); // Use intervalTime from initial config for this loop

        client.statusUpdateIntervals.set(guildIdForInterval, newInterval);
    }
};
