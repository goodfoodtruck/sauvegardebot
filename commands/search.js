const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchByName, getGame } = require("../igdb");

const command = new SlashCommandBuilder()
    .setName("search")
    .setDescription("Chercher un jeu.")
    .addStringOption(option => 
        option
        .setName("titre")
        .setDescription("Entrer un titre de jeu pour le chercher.")
        .setRequired(true)
        .setAutocomplete(true)
    );

const execute = async (interaction) => {
    try {
        if (interaction.isAutocomplete()) {
            const focusedOption = interaction.options.getFocused();
            const choices = await searchByName(focusedOption);
            const filtered = choices.map(choice => ({ name: choice.name, value: choice.slug }));
            await interaction.respond(filtered);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'search') {
            const gameSlug = interaction.options.getString('titre');
            const game = await getGame(gameSlug);
            if (game) {
                const embed = new EmbedBuilder()
                    .setTitle(`${game.name} (${new Date(game.first_release_date * 1000).getFullYear()})`)
                    .setDescription(game.summary)
                    .setColor(0x66A0B5)
                    .addFields({
                        name: 'Développeurs',
                        value: game.involved_companies.filter(involved_company => involved_company.developer).map(developer => developer.company.name).join(", "),
                        inline: true
                    }, {
                        name: 'Genres',
                        value: game.genres.map(genre => genre.name).join(', '),
                        inline: false
                    }, {
                        name: 'Plateformes',
                        value: game.platforms.map(platform => platform.name).join(', '),
                        inline: false
                    })
                    .setThumbnail(`https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`)
                    .setFooter({ text: interaction.user.username })
                    .setTimestamp()
                    .setURL(game.url);
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: "Jeu non trouvé.", ephemeral: true });
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
};

module.exports = {
    command,
    execute
};
