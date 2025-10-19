const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Define emojis for empty slots and items (you can customize these)
const EMPTY_SLOT = '⬛'; // Or use a transparent emoji '<:_:ID>' if you have one

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Shows the crafting recipe for an item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item name (e.g., diamond_sword, crafting_table)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const itemName = interaction.options.getString('item').toLowerCase().replace(/ /g, '_');
        const mcData = interaction.client.mcData; // Get loaded data

        // --- Find the Item ---
        const item = mcData.itemsByName[itemName];
        if (!item) {
            return await interaction.editReply(`Could not find an item named \`${itemName}\`.`);
        }

        // --- Find Crafting Table Recipes ---
        // mcData.recipesForItem gives ALL recipes (furnace, etc.)
        // We filter for crafting table recipes (shaped or shapeless)
        const recipes = mcData.recipes[item.id]?.filter(r => r.inShape || r.ingredients);

        if (!recipes || recipes.length === 0) {
            return await interaction.editReply(`No crafting table recipes found for \`${itemName}\`.`);
        }

        // --- Build Embeds for each recipe (usually just one) ---
        const embeds = [];
        for (const recipe of recipes) {
            const embed = new EmbedBuilder()
                .setTitle(`Recipe: ${item.displayName}`)
                .setColor(0x5865F2)
                .setFooter({ text: interaction.client.user.username });

            let description = '';
            const ingredientsMap = new Map(); // Store unique ingredients for a key

            // --- Shaped Recipe (Grid) ---
            if (recipe.inShape) {
                // Determine grid size (usually 3x3)
                const rows = recipe.inShape.length;
                const cols = Math.max(...recipe.inShape.map(row => row.length));
                
                description += `**Shaped Crafting (${rows}x${cols})**\n`;
                
                let ingredientIndex = 1;
                for (let r = 0; r < 3; r++) { // Always display 3 rows
                    for (let c = 0; c < 3; c++) { // Always display 3 cols
                        const ingredientId = (recipe.inShape[r] && recipe.inShape[r][c]) ? recipe.inShape[r][c] : null;
                        
                        if (ingredientId) {
                            const ingredientItem = mcData.items[ingredientId];
                            // Get a generic emoji or use item name
                            const emoji = getItemEmoji(ingredientItem); 
                            description += emoji;
                            if (!ingredientsMap.has(emoji)) {
                                ingredientsMap.set(emoji, ` ${ingredientItem.displayName}`);
                            }
                        } else {
                            description += EMPTY_SLOT;
                        }
                    }
                    description += '\n'; // New row
                }
            }
            // --- Shapeless Recipe (List) ---
            else if (recipe.ingredients) {
                description += '**Shapeless Crafting**\nRequires:\n';
                const ingredientCounts = {};
                for (const id of recipe.ingredients) {
                    ingredientCounts[id] = (ingredientCounts[id] || 0) + 1;
                }

                for (const id in ingredientCounts) {
                    const ingredientItem = mcData.items[id];
                    const emoji = getItemEmoji(ingredientItem);
                    description += `${emoji} ${ingredientItem.displayName} x${ingredientCounts[id]}\n`;
                }
            }

            // Add the ingredient key/legend if needed
            if (ingredientsMap.size > 0) {
                 description += '\n**Key:**\n';
                 ingredientsMap.forEach((name, emoji) => {
                     description += `${emoji} = ${name}\n`;
                 });
            }

            // Add result count
            const resultItem = mcData.items[recipe.result.id];
            description += `\n**Result:** ${getItemEmoji(resultItem)} ${resultItem.displayName} x${recipe.result.count || 1}`;

            embed.setDescription(description);
            embeds.push(embed);
        }

        await interaction.editReply({ embeds: embeds });
    },
};

// --- Helper function to get an emoji (placeholder) ---
// You might want to create a map of item names to actual Discord emojis
function getItemEmoji(item) {
    // Simple placeholder - just use the first letter, or a default emoji
    if (!item) return '❓';
    // You could expand this with a switch or map for common items
    switch (item.name) {
        case 'stick': return '🪵'; // Example
        case 'diamond': return '💎'; // Example
        case 'crafting_table': return '🛠️'; // Example
        // Add more specific emojis here
        default: return '🧱'; // Generic block emoji
    }
}
