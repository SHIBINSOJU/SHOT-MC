const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    serverName: { type: String },
    serverIp: { type: String },
    serverPort: { type: Number, default: 25565 },
    serverEdition: { type: String, default: 'java' },
    statusChannelId: { type: String },
    statusMessageId: { type: String },
    statusUpdateInterval: { type: Number, default: 60000 },
    
    // --- FIELDS FOR NEW EMBED ---
    serverDescription: { type: String },
    serverBannerUrl: { type: String }, // The big image at the bottom
    thumbnailUrl: { type: String },    // The small icon at the top right
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
