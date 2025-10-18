
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands.'),
    async execute(interaction) {
        const commands = interaction.client.commands;
        const commandList = commands.map(command => {
            return `\`/${command.data.name}\` - ${command.data.description}`;
        }).join('\n');

        await interaction.reply({
            content: `**Available Commands:**\n${commandList}`,
            ephemeral: true,
        });
    },
};
