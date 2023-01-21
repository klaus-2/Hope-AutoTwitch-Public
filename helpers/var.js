const { AutoTwitch } = require("../database/models"),
    { fetch } = require('undici');

const findGuild = async (req, res) => {
    const gdata = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const findUser = async (req, res) => {
    const udata = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}/members/${req.user.id}?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return udata;
}

const findLogs = async (req, res) => {
    const udata = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}/joinslogs?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/maintenance");
        }
    });

    return udata;
}

const getChannels = async (req, res) => {
    const ch = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}/channels?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return ch;
}

const getRoles = async (req, res) => {
    const rr = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}/roles?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return rr;
}

const getCommands = async (req, res) => {
    const cmd = await fetch(`http://127.0.0.1:80/commands?token=tokenherexD`).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return cmd;
}

// Update guilds settings
const updateSettings = async (req) => {
    const udata = await fetch(`http://127.0.0.1:80/guilds/${req.params.guildID}/update-settings?token=tokenherexD`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect(`/guilds/${req.params.guildID}`);
        }
    });

    return udata;
}

const findOrCreate = async (req, db, find) => {

    switch (db) {
        case 'AutoTwitch':
            try {
                if (req) {
                    let resp = await AutoTwitch.find({ guildID: req.id });
                    return resp;
                }
            } catch (err) {
                console.log(`FindOrCreate: AutoTwitch has error: ${err.message}.`);
            }
            break;
        case 'AutoTwitch-Find':
            try {
                if (req) {
                    let resp = await AutoTwitch.findOne({ guildID: req.guildID, ChannelName: req.ChannelName });
                    return resp;
                }
            } catch (err) {
                console.log(`FindOrCreate: AutoTwitch-Find has error: ${err.message}.`);
            }
            break;
        case 'AutoTwitch-Find2':
            try {
                if (req) {
                    let resp = await AutoTwitch.find(req);
                    return resp;
                }
            } catch (err) {
                console.log(`FindOrCreate: AutoTwitch-Find2 has error: ${err.message}.`);
            }
            break;
    }
}

const findAndDelete = async (req, db, find) => {

    switch (db) {
        case 'AutoTwitch':
            try {
                if (req) {
                    await AutoTwitch.deleteOne({
                        guildID: req.params.guildID,
                        ChannelName: find,
                    });
                }
            } catch (err) {
                console.log(`FindOrCreate: GuildSettings has error: ${err.message}.`);
            }
            break;
    }
}

const createMessage = async (channelID, token, data) => {
    const gdata = await fetch(`https://discord.com/api/channels/${channelID}/messages`, { method: 'POST', body: JSON.stringify(data), headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const editMessage = async (channelID, messageID, data, token) => {
    const gdata = await fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const putEmoji = async (channelID, token, messageID, emoji) => {
    const gdata = await fetch(`https://discord.com/api/channels/${channelID}/messages/${messageID}/reactions/${emoji}/@me`, { method: 'PUT', headers: { 'Authorization': `Bot ${token}` } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

module.exports = {
    findGuild,
    findUser,
    findLogs,
    getChannels,
    getRoles,
    getCommands,
    updateSettings,
    findOrCreate,
    findAndDelete,
    createMessage,
    editMessage,
    putEmoji
}

/* const getDiscordTokens = async (code, redirectUri) => {
    const tokensUrl = 'https://discord.com/api/oauth2/token'
    const data = new URLSearchParams()
    data.set('client_id', process.env.discord_client_id)
    data.set('client_secret', process.env.discord_client_secret)
    data.set('grant_type', 'authorization_code')
    data.set('code', code)
    data.set('redirect_uri', redirectUri)

    const response = await axios.post(tokensUrl, data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })


    return response.data
}
*/