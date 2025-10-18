
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uuid')
        .setDescription('Fetches the Minecraft UUID of a player.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the player.')
                .setRequired(true)),
    async execute(interaction) {
        const username = interaction.options.getString('username');

        try {
            const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
            const data = await response.json();

            if (!data || data.error) {
                return await interaction.reply({
                    content: `Could not find a player with the username \`${username}\`.`,
                    ephemeral: true,
                });
            }

            await interaction.reply({
                content: `The UUID of \`${username}\` is \`${data.id}\`.`,
            });
        } catch (error) {
            console.error('Error fetching UUID:', error);
            await interaction.reply({
                content: 'There was an error while fetching the UUID. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
