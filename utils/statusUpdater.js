
const { EmbedBuilder } = require('discord.js');
const gamedig = require('gamedig');
const GuildConfig = require('../models/GuildConfig');

async function updateStatus(client) {
    const guilds = await GuildConfig.find({ statusChannelId: { $exists: true } });

    for (const guildConfig of guilds) {
        const channel = await client.channels.fetch(guildConfig.statusChannelId).catch(() => null);
        if (!channel) continue;

        let embed;
        try {
            const state = await gamedig.query({
                type: guildConfig.serverEdition === 'bedrock' ? 'minecraftbe' : 'minecraft',
                host: guildConfig.serverIp,
                port: guildConfig.serverPort,
            });

            embed = new EmbedBuilder()
                .setTitle('Server Status')
                .setColor('Green')
                .addFields(
                    { name: 'MOTD', value: state.name },
                    { name: 'Players', value: `${state.players.length}/${state.maxplayers}` },
                    { name: 'Version', value: state.raw.vanilla.raw.version.name },
                    { name: 'Latency', value: `${state.ping}ms` }
                )
                .setTimestamp();
        } catch (error) {
            embed = new EmbedBuilder()
                .setTitle('Server Status')
                .setColor('Red')
                .setDescription('The server is currently offline.')
                .setTimestamp();
        }

        let message;
        if (guildConfig.statusMessageId) {
            message = await channel.messages.fetch(guildConfig.statusMessageId).catch(() => null);
        }

        if (message) {
            await message.edit({ embeds: [embed] });
        } else {
            const newMessage = await channel.send({ embeds: [embed] });
            guildConfig.statusMessageId = newMessage.id;
            await guildConfig.save();
        }
    }
}

module.exports = (client) => {
    async function runUpdates() {
        const guilds = await GuildConfig.find({ statusChannelId: { $exists: true } });
        for (const guildConfig of guilds) {
            // Use a Map to store intervals for each guild
            if (!client.statusUpdateIntervals) {
                client.statusUpdateIntervals = new Map();
            }

            // Clear any existing interval for this guild
            if (client.statusUpdateIntervals.has(guildConfig.guildId)) {
                clearInterval(client.statusUpdateIntervals.get(guildConfig.guildId));
            }

            // Set a new interval with the updated time
            const interval = setInterval(() => updateStatus(client), guildConfig.statusUpdateInterval || 60000);
            client.statusUpdateIntervals.set(guildConfig.guildId, interval);
        }
    }
    // Initial update
    runUpdates();
};
