const { fetch } = require('undici'),
    { logger } = require('../utils'),
    config = require("../config");

this.embedCollection = new Map();

const addEmbed = async (channelID, embed) => {
    // collect embeds
    if (!this.embedCollection.has(channelID)) {
        this.embedCollection.set(channelID, [embed]);
    } else {
        this.embedCollection.set(channelID, [...this.embedCollection.get(channelID), embed]);
    }
}

const getMe = async () => {
    const gdata = await fetch(`https://discord.com/api/users/@me`, { method: 'GET', headers: { 'Authorization': `Bot ${config.token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const getChannelWebhooks = async (channelID) => {
    const gdata = await fetch(`https://discord.com/api/channels/${channelID}/webhooks`, { method: 'GET', headers: { 'Authorization': `Bot ${config.token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const createWebhook = async (channelID, dados) => {
    const gdata = await fetch(`https://discord.com/api/channels/${channelID}/webhooks`, { method: 'POST', body: JSON.stringify(dados), headers: { 'Authorization': `Bot ${config.token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const postWebhook = async (data, webhookID, webhookToken) => {
    const gdata = await fetch(`https://discord.com/api/webhooks/${webhookID}/${webhookToken}`, { method: 'POST', body: JSON.stringify(data), headers: { 'Authorization': `Bot ${config.token}`, 'Content-Type': 'application/json' } }).then(res => res.json()).catch(e => {
        if (e.code === 'ETIMEDOUT') {
            return res.redirect("/dashboard");
        }
    });

    return gdata;
}

const cacheSystem = async (channelID) => {
    const bot = await getMe();
    // get list of channel ID's
    const channelIDs = Array.from(this.embedCollection.keys());

    // loop through each channel ID sending their embeds
    for (const channel of channelIDs) {
        try {
            const webhooks = await getChannelWebhooks(channel);
            let webhook = webhooks.find(wh => wh.name == bot.username);

            // create webhook if it doesn't exist
            if (!webhook) {
                let dados = {
                    "name": bot.username,
                    "avatar": 'https://cdn.discordapp.com/avatars/622812963572809771/704f3dea33149e67f1f477d728e33708.webp?size=1024' || bot.avatar
                };
                webhook = await createWebhook(channel, dados);
            }

            // send the embeds
            const repeats = Math.ceil(this.embedCollection.get(channel).length / 10);
            for (let j = 0; j < repeats; j++) {
                // Get embeds and files to upload via webhook
                const embeds = this.embedCollection.get(channel)?.slice(j * 10, (j * 10) + 10).map(f => f[0]);
                // const files = this.embedCollection.get(channelID)?.slice(j * 10, (j * 10) + 10).map(f => f[1]).filter(e => e != undefined);
                if (!embeds) return;

                // send webhook message
                const embed = {
                    "title": "title ~~(did you know you can have markdown here too?)~~",
                    "description": "this supports [named links](https://discordapp.com) on top of the previously shown subset of markdown. ```\nyes, even code blocks```",
                    "url": "https://discordapp.com",
                    "color": 6567024,
                    "timestamp": "2022-08-15T14:58:54.258Z",
                    "footer": {
                        "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
                        "text": "footer text"
                    },
                    "thumbnail": {
                        "url": "https://cdn.discordapp.com/embed/avatars/0.png"
                    },
                    "image": {
                        "url": "https://cdn.discordapp.com/embed/avatars/0.png"
                    },
                    "author": {
                        "name": "author name",
                        "url": "https://discordapp.com",
                        "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
                    },
                    "fields": [
                        {
                            "name": "🤔",
                            "value": "some of these properties have certain limits..."
                        },
                        {
                            "name": "😱",
                            "value": "try exceeding some of them!"
                        },
                        {
                            "name": "🙄",
                            "value": "an informative error should show up, and this view will remain as-is until all issues are fixed"
                        },
                        {
                            "name": "<:thonkang:219069250692841473>",
                            "value": "these last two",
                            "inline": true
                        },
                        {
                            "name": "<:thonkang:219069250692841473>",
                            "value": "are inline fields",
                            "inline": true
                        }
                    ]
                };

                let datamsg = {
                    "content": null,
                    "tts": false,
                    "embeds": embeds
                };

                // console.log(datamsg, webhook.id, webhook.token)

                await postWebhook(datamsg, webhook.id, webhook.token);
            }
            // delete from collection once sent
            this.embedCollection.delete(channel);
        } catch (err) {
            // It was likely they didn't have permission to create/send the webhook
            logger.error(err.message);
            this.embedCollection.delete(channel);
        }
    }
}

module.exports = {
    getMe,
    addEmbed,
    getChannelWebhooks,
    createWebhook,
    postWebhook,
    cacheSystem
}