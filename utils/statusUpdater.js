const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const gamedig = require('gamedig'); // Use gamedig

async function updateStatus(client, guildConfig) {
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
            .setFooter({ text: footerText });

    } catch (error) {
        // --- Build Offline Embed ---
        const serverName = guildConfig.serverName || guildConfig.serverIp;

        embed = new EmbedBuilder()
            .setColor(0xED4245) // Red
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || null)
            .addFields(
                // --- NEW FIELDS ---
                { name: 'Status', value: '🔴 Server Offline' },
                { name: 'MOTD', value: '```N/A```' }, // MOTD placeholder
                // --- EXISTING FIELDS ---
                { name: 'Server Name', value: `\`${serverName}\`` },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                { name: 'Players', value: '`N/A`' }
                // Removed extra 'Status' field
            )
            .setTimestamp()
            .setFooter({ text: footerText });
    }

    // --- Send/Edit Message ---
    // (This part remains the same)
    try {
        if (guildConfig.statusMessageId) {
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components: [] }); 
            } else {
                const newMessage = await channel.send({ embeds: [embed], components: [] });
                guildConfig.statusMessageId = newMessage.id;
                await guildConfig.save();
            }
        } else {
            const newMessage = await channel.send({ embeds: [embed], components: [] });
            guildConfig.statusMessageId = newMessage.id;
            await guildConfig.save();
        }
    } catch (msgError) {
        console.error(`[StatusUpdater] Failed to send/edit message for guild ${guildConfig.guildId}:`, msgError);
        if (msgError.code === 10008) {
            guildConfig.statusMessageId = undefined;
            await guildConfig.save();
        }
    }
}

// --- Interval Handler (No changes needed) ---
module.exports = async (client) => {
    // ... (rest of the code is identical) ...
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
        }
        await updateStatus(client, guildConfig);
        const intervalTime = guildConfig.statusUpdateInterval;
        
        const newInterval = setInterval(async () => {
            const latestConfig = await GuildConfig.findOne({ guildId: guildConfig.guildId });
            if (latestConfig && latestConfig.statusChannelId && latestConfig.statusUpdateInterval) {
                await updateStatus(client, latestConfig);
            } else {
                clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
                client.statusUpdateIntervals.delete(guildConfig.guildId);
                console.log(`[StatusUpdater] Stopping updates for guild ${guildConfig.guildId}.`);
            }
        }, intervalTime);
        client.statusUpdateIntervals.set(guildConfig.guildId, newInterval);
    }
};
