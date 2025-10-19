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
    const footerText = `© Created by RgX • Auto-updates every ${intervalSeconds} seconds`;

    try {
        // --- Fetch status from mcsrvstat.us API ---
        const res = await fetch(`https://api.mcsrvstat.us/3/${guildConfig.serverIp}:${guildConfig.serverPort}`);
        const data = await res.json();

        // --- Build Online Embed ---
        if (data.online) {
            embed = new EmbedBuilder()
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
                .setFooter({ text: footerText });
        } 
        // --- Build Offline Embed ---
        else {
             throw new Error('Server is offline');
        }

    } catch (error) {
        // --- Build Offline Embed ---
        embed = new EmbedBuilder()
            .setColor(0xED4245) // Red
            .setTitle(guildConfig.serverName || guildConfig.serverIp)
            .setThumbnail(guildConfig.thumbnailUrl || null)
            .setDescription(guildConfig.serverDescription || null)
            .addFields(
                { name: 'Status', value: '❌ Offline' },
                { name: 'Players', value: '`N/A`' },
                { name: 'Server IP', value: `\`${guildConfig.serverIp}\`` },
                { name: 'Next Restart', value: 'Not Scheduled' },
                { name: 'Server Uptime', value: 'N/A' } 
            )
            .setImage(guildConfig.serverBannerUrl || null)
            .setTimestamp()
            .setFooter({ text: footerText });
    }

    // --- Send/Edit Message ---
    try {
        if (guildConfig.statusMessageId) {
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components: [] }); // components: []
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
        }
        await updateStatus(client, guildConfig);
        const intervalTime = guildConfig.statusUpdateInterval;
        
        // --- THIS IS THE CORRECTED LINE ---
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
