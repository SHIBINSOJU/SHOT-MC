const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands.'),
    async execute(interaction) {
        // This line gets all the commands you've loaded
        const commands = interaction.client.commands;

        // This creates the list of commands, just like before
        const commandList = commands.map(command => {
            return `\`/${command.data.name}\` - ${command.data.description}`;
        }).join('\n');

        // Create the new embed
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2) // A nice Discord blue/purple color
            .setTitle('Help Menu')
            .setDescription(commandList) // The list of commands is the main body
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.username}` });

        // Reply with the embed
        await interaction.reply({
            embeds: [helpEmbed], // You send embeds in an array
            ephemeral: true, // This keeps the message visible only to the user
        });
    },
};
