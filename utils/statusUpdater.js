const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { fetch } = require('undici'); // Use undici for fetching

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

    // Set interval text
    const intervalSeconds = (guildConfig.statusUpdateInterval || 60000) / 1000;
    const footerText = `${client.user.username} | Auto-updates every ${intervalSeconds} seconds`;

    try {
        // --- THIS IS THE FIX ---
        // Check the edition and set the correct API URL
        const edition = guildConfig.serverEdition === 'bedrock' ? 'bedrock/3' : '3';
        const res = await fetch(`https://api.mcsrvstat.us/${edition}/${guildConfig.serverIp}:${guildConfig.serverPort}`);
        // --- END OF FIX ---

        const data = await res.json();
        
        const serverName = guildConfig.serverName || (data.motd && data.motd.clean[0]) || guildConfig.serverIp;

        // --- Build Online Embed ---
        if (data.online) {
            embed = new EmbedBuilder()
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
                .setFooter({ text: footerText });
        } 
        // --- Build Offline Embed ---
        else {
             throw new Error('Server is offline');
        }

    } catch (error) {
        // --- Build Offline Embed ---
        const serverName = guildConfig.serverName || guildConfig.serverIp;

        embed = new EmbedBuilder()
            .setColor(0xED4245) // Red
            .setTitle(`${serverName} | Server Status`)
            .setThumbnail(guildConfig.thumbnailUrl || null)
            .addFields(
                { name: 'Server Name', value: `\`${serverName}\`` },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Server Port', value: `\`${guildConfig.serverPort}\`` },
                { name: 'Players', value: '`N/A`' },
                { name: 'Status', value: '`❌ Offline`' }
            )
            .setTimestamp()
            .setFooter({ text: footerText });
    }

    // --- Send/Edit Message ---
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
