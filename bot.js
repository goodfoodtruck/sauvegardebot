require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startRSSChecker } = require('./rss-checker');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildIntegrations,
    ]
});

// Fonction pour déployer les commandes
async function deployCommands() {
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        // Vider le cache du require pour forcer le rechargement
        delete require.cache[require.resolve(`./commands/${file}`)];
        const { command } = require(`./commands/${file}`);
        commands.push(command);
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log(`Déploiement de ${commands.length} commande(s)...`);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log(`✅ Commandes déployées avec succès !`);
    } catch (error) {
        console.error('Erreur lors du déploiement des commandes:', error);
    }
}

client.on("ready", async () => {
    console.log("Bot is ready");

    // Déployer les commandes au démarrage
    await deployCommands();

    // Démarrer le vérificateur RSS
    startRSSChecker(client);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const { execute } = require(`./commands/${file}`);
        await execute(interaction);
    }
});

client.login(process.env.TOKEN)
    .catch(err => {
        console.error("Failed to login:", err);
    });