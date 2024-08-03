require("dotenv").config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildIntegrations,
    ]
});

client.on("ready", () => {
    console.log("Bot is ready");

    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const { command } = require(`./commands/${file}`);
        client.application.commands.create(command);
    }
});

client.on("interactionCreate", async (interaction) => {
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
