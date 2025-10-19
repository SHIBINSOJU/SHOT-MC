require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// --- NEW: Require and load minecraft-data ---
const mcData = require('minecraft-data');
// ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- NEW: Load data onto the client object ---
// You can change the version here if needed, e.g., '1.19.4'
// It's best to use a version supported by the minecraft-data library.
try {
    client.mcData = mcData('1.20.1'); 
    console.log(`[MCData] Loaded Minecraft data for version ${client.mcData.version.minecraftVersion}`);
} catch (e) {
    console.error("[MCData] Failed to load Minecraft data! Craft command may not work.", e);
    // Assign a dummy object or handle this error as appropriate
    client.mcData = null; 
}
// ---

client.commands = new Collection();

// --- COMMAND LOADER ---
console.log('--- Loading Commands ---');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        
        if (command.data && command.data.name) {
            client.commands.set(command.data.name, command);
            const commandName = command.data.name;
            const capitalizedName = commandName.charAt(0).toUpperCase() + commandName.slice(1);
            console.log(`+ ${capitalizedName} command loaded.`);
        } else {
            console.warn(`[WARNING] The command at ./commands/${file} is missing "data" or "data.name".`);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to load command at ./commands/${file}:`, error);
    }
}
console.log(`--- Successfully loaded ${client.commands.size} commands ---`);
console.log('\n'); 
// --- END OF COMMAND LOADER ---


// --- EVENT LOADER ---
console.log('--- Loading Events ---');
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    try {
        const event = require(`./events/${file}`);
        
        if (event.name) {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`+ ${event.name} event loaded.`);
        } else {
             console.warn(`[WARNING] The event at ./events/${file} is missing a "name".`);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to load event at ./events/${file}:`, error);
    }
}
console.log(`--- Successfully loaded ${eventFiles.length} events ---`);
console.log('\n'); 
// --- END OF EVENT LOADER ---


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB!');
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
});

client.login(process.env.DISCORD_TOKEN);

// Only start the status updater if mcData loaded successfully
if (client.mcData) {
    const statusUpdater = require('./utils/statusUpdater');
    statusUpdater(client);
} else {
    console.warn("[StatusUpdater] Skipping initialization due to missing Minecraft data.");
}
