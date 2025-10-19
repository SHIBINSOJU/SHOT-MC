const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { fetch } = require('undici');

// --- Main Event Handler ---
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        
        // --- Handle Slash Commands ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command: ${interaction.commandName}`, error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                } catch (catchError) {
                    console.error('Error while sending error reply:', catchError);
                }
            }
            return; 
        }

        // --- NEW: Handle Button Clicks ---
        if (interaction.isButton()) {
            try {
                // Check if the button is for the player list (or its pages)
                if (interaction.customId.startsWith('status-player-list')) {
                    await handlePlayerList(interaction);
                }

                // You can add more button handlers here with 'else if'
                // else if (interaction.customId === 'another-button') { ... }

            } catch (buttonError) {
                console.error(`Error handling button: ${interaction.customId}`, buttonError);
                try {
                    await interaction.reply({ content: 'There was an error handling this button!', ephemeral: true });
                } catch (e) {
                    try {
                        await interaction.followUp({ content: 'There was an error handling this button!', ephemeral: true });
                    } catch (finalError) {
                        console.error('Failed to send any error message for button interaction:', finalError);
                    }
                }
            }
        }
    },
};

// --- NEW: Helper Function for Player List Pagination ---
async function handlePlayerList(interaction) {
    
    // --- 1. Parse Page Number ---
    let page = 0;
    const isPageTurn = interaction.customId.includes('-page-');
    if (isPageTurn) {
        page = parseInt(interaction.customId.split('-page-')[1], 10);
    }

    // --- 2. Defer Interaction ---
    // If it's the *first* click, defer a new ephemeral reply
    // If it's a *page turn*, defer an update to the existing ephemeral message
    if (isPageTurn) {
        await interaction.deferUpdate();
    } else {
        await interaction.deferReply({ ephemeral: true });
    }

    // --- 3. Fetch Data ---
    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!guildConfig) {
        return await interaction.editReply({ content: 'Server config not found.' });
    }

    try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${guildConfig.serverIp}:${guildConfig.serverPort}`);
        const data = await res.json();

        if (!data.online || !data.players.list || data.players.list.length === 0) {
            return await interaction.editReply({ content: 'No players are currently online.', embeds: [], components: [] });
        }

        const players = data.players.list.map(player => player.name); // Get just the names
        const playersPerPage = 10;
        const totalPages = Math.ceil(players.length / playersPerPage);
        
        // --- 4. Slice Player List for current page ---
        const startIndex = page * playersPerPage;
        const endIndex = startIndex + playersPerPage;
        const playersOnPage = players.slice(startIndex, endIndex);

        // Format: 1. PlayerName, 2. AnotherPlayer
        const description = playersOnPage
            .map((name, index) => `\`${startIndex + index + 1}.\` ${name.replace(/_/g, '\\_')}`) // Escape underscores
            .join('\n');

        // --- 5. Build Embed ---
        const playerListEmbed = new EmbedBuilder()
            .setTitle(`Player List (${data.players.online} / ${data.players.max})`)
            .setDescription(description)
            .setColor(0x5865F2) // Blue
            .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

        // --- 6. Build Pagination Buttons ---
        const backButton = new ButtonBuilder()
            .setCustomId(`status-player-list-page-${page - 1}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId(`status-player-list-page-${page + 1}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page + 1 >= totalPages);

        const row = new ActionRowBuilder().addComponents(backButton, nextButton);

        // --- 7. Send Reply ---
        await interaction.editReply({ embeds: [playerListEmbed], components: [row] });

    } catch (error) {
        console.error('Error in handlePlayerList:', error);
        await interaction.editReply({ content: 'Error fetching player list. The server may be offline.', embeds: [], components: [] });
    }
}
