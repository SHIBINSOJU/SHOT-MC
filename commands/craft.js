const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetch } = require('undici'); // Used to check if the image exists

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Shows the crafting recipe for an item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item you want to see the recipe for (e.g., diamond_sword)')
                .setRequired(true)),
                
    async execute(interaction) {
        // Acknowledge the command immediately
        await interaction.deferReply();

        const itemName = interaction.options.getString('item');
        
        // Format the name for the API
        // "Diamond Sword" -> "diamond_sword"
        const formattedName = itemName.toLowerCase().replace(/ /g, '_');

        const imageUrl = `https://mc-recipe.com/c/${formattedName}.png`;

        try {
            // Check if the image exists before sending it
            const res = await fetch(imageUrl);

            if (!res.ok) {
                // Handle 404 Not Found
                if (res.status === 404) {
                    await interaction.editReply({
                        content: `Sorry, I couldn't find a crafting recipe for \`${itemName}\`. Make sure you spelled it correctly (e.g., \`diamond_sword\`).`,
                        ephemeral: true
                    });
                } else {
                    // Handle other errors
                    throw new Error(`API returned status ${res.status}`);
                }
                return;
            }

            // Build the embed if the image was found
            const embed = new EmbedBuilder()
                .setTitle(`Crafting Recipe: ${itemName}`)
                .setImage(imageUrl)
                .setColor(0x5865F2) // Blue
                .setFooter({ text: interaction.client.user.username });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error fetching crafting recipe:", error);
            await interaction.editReply({
                content: 'There was an error trying to fetch that recipe.',
                ephemeral: true
            });
        }
    },
};
