const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const parser = new Parser();
const configPath = path.join(__dirname, 'rss-config.json');

function readConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '{}');
        return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function checkFeeds(client, isFirstRun = false) {
    const config = readConfig();
    let hasChanges = false;

    for (const guildId in config) {
        const guildConfig = config[guildId];

        // Vérifier que le channel existe et que des flux sont configurés
        if (!guildConfig.channelId || guildConfig.feeds.length === 0) continue;

        try {
            const channel = await client.channels.fetch(guildConfig.channelId);

            for (const feed of guildConfig.feeds) {
                try {
                    const parsedFeed = await parser.parseURL(feed.url);

                    // Initialiser lastChecked si nécessaire
                    if (!guildConfig.lastChecked) {
                        guildConfig.lastChecked = {};
                    }

                    // Si c'est le premier lancement ou si le flux n'a jamais été vérifié,
                    // on enregistre juste la date du dernier article sans poster
                    if (isFirstRun || !guildConfig.lastChecked[feed.url]) {
                        if (parsedFeed.items.length > 0) {
                            const latestItem = parsedFeed.items.reduce((latest, item) => {
                                const itemDate = new Date(item.pubDate || item.isoDate);
                                const latestDate = new Date(latest.pubDate || latest.isoDate);
                                return itemDate > latestDate ? item : latest;
                            });
                            guildConfig.lastChecked[feed.url] = new Date(latestItem.pubDate || latestItem.isoDate).toISOString();
                            hasChanges = true;
                            console.log(`📚 Flux "${feed.nom}" initialisé (${parsedFeed.items.length} articles ignorés)`);
                        }
                        continue; // Passer au flux suivant sans poster
                    }

                    // Récupérer la date du dernier article vérifié
                    const lastCheckedDate = new Date(guildConfig.lastChecked[feed.url]);

                    // Trier les items par date (du plus récent au plus ancien)
                    const sortedItems = parsedFeed.items.sort((a, b) => {
                        return new Date(b.pubDate || b.isoDate) - new Date(a.pubDate || a.isoDate);
                    });

                    // Trouver les nouveaux articles
                    const newItems = sortedItems.filter(item => {
                        const itemDate = new Date(item.pubDate || item.isoDate);
                        return itemDate > lastCheckedDate;
                    });

                    // Poster les nouveaux articles (en ordre chronologique inverse pour poster du plus ancien au plus récent)
                    for (const item of newItems.reverse()) {
			const message = `📰 | **${item.title || 'Sans titre'}**\n${item.link}`;

                        await channel.send(message);

                        // Petit délai pour éviter le rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Mettre à jour la date du dernier article vérifié
                    if (sortedItems.length > 0) {
                        const latestItemDate = new Date(sortedItems[0].pubDate || sortedItems[0].isoDate);
                        guildConfig.lastChecked[feed.url] = latestItemDate.toISOString();
                        hasChanges = true;
                    }

                } catch (feedError) {
                    console.error(`Erreur lors de la lecture du flux ${feed.url}:`, feedError.message);
                }
            }

        } catch (channelError) {
            console.error(`Erreur lors de l'accès au channel ${guildConfig.channelId}:`, channelError.message);
        }
    }

    if (hasChanges) {
        saveConfig(config);
    }
}

function startRSSChecker(client) {
    console.log('🔍 RSS Checker démarré');

    // Premier lancement : initialiser sans poster
    setTimeout(() => {
        console.log('🚀 Initialisation des flux RSS...');
        checkFeeds(client, true).catch(err => console.error('Erreur lors de l\'initialisation des flux:', err));
    }, 10000);

    // Puis vérifier toutes les 10 minutes (en mode normal)
    setInterval(() => {
        checkFeeds(client, false).catch(err => console.error('Erreur lors de la vérification des flux:', err));
    }, 10 * 60 * 1000); // 10 minutes
}

module.exports = { startRSSChecker };
