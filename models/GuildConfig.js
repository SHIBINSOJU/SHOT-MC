
const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    serverIp: { type: String },
    serverPort: { type: Number },
    serverEdition: { type: String, enum: ['java', 'bedrock'] },
    rconPort: { type: Number },
    rconPassword: { type: String },
    statusChannelId: { type: String },
    statusMessageId: { type: String },
    statusUpdateInterval: { type: Number, default: 60000 }, // Default to 60 seconds
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
