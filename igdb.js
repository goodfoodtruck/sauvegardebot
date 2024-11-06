require("dotenv").config()

async function getToken() {
    try {
        const response = await fetch(
            `https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`,
            {
                method: "POST",
            }
        )
        const json = await response.json();
        return json.access_token;
    } catch (error) {
        console.error(error);
    }
}

async function headedRequest(endpoint, body) {
    const token = await getToken()
    try {
        const response = await fetch('https://api.igdb.com/v4/' + endpoint, {
            method: 'POST',
            headers: {
                'Client-ID': process.env.CLIENT_ID,
                'Authorization': `Bearer ${token}`
            },
            body
        })
        const json = await response.json();
        return json
    } catch (error) {
        console.error(error);
    }
}

async function searchByName(name) {
    const body = `fields
        name,
        slug;
        where name ~ *"${name}"*;
        sort rating_count desc;
    `
    const games = await headedRequest("games", body);
    if (games) return games;
}

async function getGame(gameSlug) {
    const body = `fields
                name,
                cover.image_id,
                screenshots.image_id,
                genres.name,
                platforms.name,
                first_release_date,
                involved_companies.developer,
                involved_companies.company.name,
                game_engines.name,
                url,
                summary;
                where slug = "${gameSlug}";
            `
    const game = await headedRequest("games", body);
    if (game) return game[0];
}

module.exports = {
    searchByName,
    getGame
}