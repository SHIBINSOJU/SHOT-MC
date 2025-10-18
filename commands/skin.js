
const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skin')
        .setDescription('Shows the Minecraft skin of a player.')
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
                content: `Here is the skin for \`${username}\`: https://crafatar.com/skins/${data.id}`,
            });
        } catch (error) {
            console.error('Error fetching skin:', error);
            await interaction.reply({
                content: 'There was an error while fetching the skin. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
