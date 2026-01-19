const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../rss-config.json');

// Fonction pour lire la config
function readConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '{}');
        return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Fonction pour sauvegarder la config
function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const command = new SlashCommandBuilder()
    .setName('rss')
    .setDescription('Gérer les flux RSS')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
        subcommand
            .setName('config')
            .setDescription('Configurer le channel pour les flux RSS')
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('Le channel où poster les flux RSS')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Ajouter un flux RSS')
            .addStringOption(option =>
                option
                    .setName('url')
                    .setDescription('URL du flux RSS')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('nom')
                    .setDescription('Nom du flux (optionnel)')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Retirer un flux RSS')
            .addStringOption(option =>
                option
                    .setName('url')
                    .setDescription('URL du flux RSS à retirer')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Voir la configuration actuelle')
    );

async function execute(interaction) {
    if (!interaction.isCommand() || interaction.commandName !== 'rss') return;

    const guildId = interaction.guild.id;
    const config = readConfig();

    // Initialiser la config du serveur si elle n'existe pas
    if (!config[guildId]) {
        config[guildId] = {
            channelId: null,
            feeds: [],
            lastChecked: {}
        };
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'config') {
        const channel = interaction.options.getChannel('channel');
        config[guildId].channelId = channel.id;

        // Ajouter des flux par défaut si aucun flux n'existe encore
        if (config[guildId].feeds.length === 0) {
            const defaultFeeds = [
                { url: 'https://www.rockpapershotgun.com/feed/news', nom: 'Rock Paper Shotgun' },
                { url: 'https://www.gamesindustry.biz/feed/news', nom: 'GamesIndustry.biz' },
                { url: 'https://www.theverge.com/rss/games/index.xml', nom: 'The Verge' },
                { url: 'https://www.gameinformer.com/news.xml', nom: 'Game Informer' }
            ];

            config[guildId].feeds = defaultFeeds;
            saveConfig(config);

            await interaction.reply({
                content: `✅ Le channel ${channel} a été configuré pour recevoir les flux RSS.\n\n📰 **Flux par défaut ajoutés :**\n${defaultFeeds.map(f => `• ${f.nom}`).join('\n')}\n\nUtilisez \`/rss list\` pour voir tous les flux ou \`/rss add\` pour en ajouter d'autres.`,
                ephemeral: true
            });
        } else {
            saveConfig(config);
            await interaction.reply({
                content: `✅ Le channel ${channel} a été configuré pour recevoir les flux RSS.`,
                ephemeral: true
            });
        }
    }

    else if (subcommand === 'add') {
        if (!config[guildId].channelId) {
            await interaction.reply({
                content: '❌ Veuillez d\'abord configurer un channel avec `/rss config`',
                ephemeral: true
            });
            return;
        }

        const url = interaction.options.getString('url');
        const nom = interaction.options.getString('nom') || url;

        // Vérifier si le flux existe déjà
        if (config[guildId].feeds.some(feed => feed.url === url)) {
            await interaction.reply({
                content: '❌ Ce flux RSS est déjà configuré.',
                ephemeral: true
            });
            return;
        }

        config[guildId].feeds.push({ url, nom });
        saveConfig(config);

        await interaction.reply({
            content: `✅ Flux RSS "${nom}" ajouté avec succès !`,
            ephemeral: true
        });
    }

    else if (subcommand === 'remove') {
        const url = interaction.options.getString('url');
        const initialLength = config[guildId].feeds.length;

        config[guildId].feeds = config[guildId].feeds.filter(feed => feed.url !== url);

        if (config[guildId].feeds.length === initialLength) {
            await interaction.reply({
                content: '❌ Ce flux RSS n\'existe pas dans la configuration.',
                ephemeral: true
            });
            return;
        }

        saveConfig(config);
        await interaction.reply({
            content: '✅ Flux RSS retiré avec succès !',
            ephemeral: true
        });
    }

    else if (subcommand === 'list') {
        const guildConfig = config[guildId];

        if (!guildConfig.channelId) {
            await interaction.reply({
                content: '❌ Aucun channel configuré. Utilisez `/rss config` pour en définir un.',
                ephemeral: true
            });
            return;
        }

        const channel = await interaction.guild.channels.fetch(guildConfig.channelId);
        let message = `📰 **Configuration RSS**\n\n`;
        message += `**Channel:** ${channel}\n\n`;

        if (guildConfig.feeds.length === 0) {
            message += `Aucun flux RSS configuré. Utilisez \`/rss add\` pour en ajouter.`;
        } else {
            message += `**Flux RSS (${guildConfig.feeds.length}):**\n`;
            guildConfig.feeds.forEach((feed, index) => {
                message += `${index + 1}. **${feed.nom}**\n   ${feed.url}\n`;
            });
        }

        await interaction.reply({
            content: message,
            ephemeral: true
        });
    }
}

module.exports = { command: command.toJSON(), execute };