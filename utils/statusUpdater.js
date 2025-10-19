const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

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

    // --- Create the "Join Discord" button (No Refresh button here) ---
    const joinDiscordButton = new ButtonBuilder()
        .setLabel('Join Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(guildConfig.discordInvite || 'https://discord.gg/placeholder');

    const row = new ActionRowBuilder().addComponents(joinDiscordButton);

    try {
        // --- Query the server ---
        const state = await gamedig.query({
            type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
            host: guildConfig.serverIp,
            port: guildConfig.serverPort,
        });

        // --- NEW Online Embed (More attractive) ---
        embed = new EmbedBuilder()
            .setTitle(`${guildConfig.serverName || state.name} | Server Status`)
            .setColor('Green')
            .setThumbnail(state.raw.favicon || null)
            .addFields(
                { name: '🏷️ Server Name', value: `\`${guildConfig.serverName || state.name}\``, inline: true },
                { name: '✅ Status', value: '`Online`', inline: true },
                { name: '🖥️ IP', value: `\`${guildConfig.serverIp}\``, inline: true },
                { name: '🔌 Port', value: `\`${guildConfig.serverPort}\``, inline: true },
                { name: '👥 Players', value: `\`${state.players.length} / ${state.maxplayers}\``, inline: true },
                { name: '🌐 Version', value: `\`${state.raw.version.name}\``, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '© Created by RgX' });

    } catch (error) {
        // --- NEW Offline Embed (Matches screenshot, more attractive) ---
        
        // Use server IP as fallback if name is not set
        const serverName = guildConfig.serverName || guildConfig.serverIp;
        
        embed = new EmbedBuilder()
            .setTitle(`${serverName} | Server Status`)
            .setColor('Red')
            .addFields(
                { name: '🏷️ Server Name', value: `\`${serverName}\``, inline: true },
                { name: '❌ Status', value: '`Offline`', inline: true },
                { name: '🖥️ IP', value: `\`${guildConfig.serverIp}\``, inline: true },
                { name: '🔌 Port', value: `\`${guildConfig.serverPort}\``, inline: true },
                { name: '👥 Players', value: '`N/A`', inline: true }, // Added Player field
                { name: '🌐 Version', value: '`N/A`', inline: true } // Added Version field
            )
            .setTimestamp()
            .setFooter({ text: '© Created by RgX' });
    }

    // --- Find the message and send/edit it ---
    try {
        if (guildConfig.statusMessageId) {
            const message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components: [row] });
            } else {
                const newMessage = await channel.send({ embeds: [embed], components: [row] });
                guildConfig.statusMessageId = newMessage.id;
                await guildConfig.save();
            }
        } else {
            const newMessage = await channel.send({ embeds: [embed], components: [row] });
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

// --- This part (the interval handler) remains the same ---
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
