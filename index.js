require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

// --- MODIFIED COMMAND LOADER ---
console.log('--- Loading Commands ---');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        
        // Check if command has data and a name
        if (command.data && command.data.name) {
            client.commands.set(command.data.name, command);
            
            // Capitalize the first letter for cleaner logging
            const commandName = command.data.name;
            const capitalizedName = commandName.charAt(0).toUpperCase() + commandName.slice(1);
            
            // This is the log you wanted
            console.log(`+ ${capitalizedName} command loaded.`);
            
        } else {
            console.warn(`[WARNING] The command at ./commands/${file} is missing "data" or "data.name".`);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to load command at ./commands/${file}:`, error);
    }
}
// This is the summary log you wanted
console.log(`--- Successfully loaded ${client.commands.size} commands ---`);
console.log('\n'); // Adds a space for cleaner logs
// --- END OF COMMAND LOADER ---


// --- MODIFIED EVENT LOADER (for consistency) ---
console.log('--- Loading Events ---');
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    try {
        const event = require(`./events/${file}`);
        
        // Check if event has a name
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
console.log('\n'); // Adds a space
// --- END OF EVENT LOADER ---


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ Connected to MongoDB!');
}).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
});

client.login(process.env.DISCORD_TOKEN);

const statusUpdater = require('./utils/statusUpdater');
statusUpdater(client);
