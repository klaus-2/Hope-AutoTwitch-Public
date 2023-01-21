const CronJob = require('cron').CronJob,
    config = require("./config"),
    { logger } = require('./utils'),
    { discordAPI: { getGuilds }, var: { createMessage, editMessage, findOrCreate }, cache: { cacheSystem, addEmbed }, Auth, Channel, Stream, cache } = require("./helpers");

// connect to database
require('./database/mongoose').init();

//update the authorization key on startup
UpdateAuthConfig()

logger.ready('[AUTO-TWITCH]: Worker inicializado.')

// Executa a loop e envia a fila de cash pelo webhook
/* setInterval(async () => {
    await cacheSystem('1002606377807650906');
}, 10000); */

const queue = new Map();

let Check = new CronJob("* * * * *", async function () {
    try {

        const bot_guilds = await getGuilds();
        logger.log(`Existem atualmente ${queue.size} posts de twitches em andamento.`);
        bot_guilds.forEach(async (guild) => {
            /** ------------------------------------------------------------------------------------------------
            * SE CONECTA AO BANCO DE DADOS DO AUTO-TWITCH
            * ------------------------------------------------------------------------------------------------ */
            let results = await findOrCreate(guild, 'AutoTwitch');
            /** ------------------------------------------------------------------------------------------------
            * VERIFICA A LISTA DE STREAMERS DO SERVIDOR
            * ------------------------------------------------------------------------------------------------ */
            if (results.length > 0) {
                /** ------------------------------------------------------------------------------------------------
                * OBTEM E SEPARA CADA ANIVERSARIANTE PARA TER SUA PROPRIA MENSAGEM DE ANIVERSARIO
                * ------------------------------------------------------------------------------------------------ */
                results.map(async function (chan, i) {

                    if (!chan.ChannelName) return;

                    let StreamData = await Stream.getData(chan.ChannelName, config.api_keys.twitch.clientID, chan.authToken);
                    if (!StreamData) return;

                    if (StreamData.data.length == 0) {

                        const dbsave = await findOrCreate(chan, 'AutoTwitch-Find');
                        const viewers = dbsave.cacheData.viewers;

                        var SendEmbed = {
                            "title": `🔴 ${dbsave.cacheData.title} is offline`,
                            "description": dbsave.cacheData.description || 'No description',
                            "url": `${dbsave.cacheData.url}`,
                            "color": 16711684,
                            "fields": [
                                {
                                    "name": "Playing:",
                                    "value": `${dbsave.cacheData.playing || 'No game'}`,
                                    "inline": true
                                },
                                {
                                    "name": "Viewers:",
                                    "value": `${viewers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`,
                                    "inline": true
                                },
                                {
                                    "name": "Started",
                                    "value": `${dbsave.cacheData.started}`,
                                    "inline": true
                                },
                                {
                                    "name": "Ended",
                                    "value": `<t:${Math.round(new Date(Date.now()).getTime() / 1000)}:R>`,
                                    "inline": true
                                },
                                {
                                    "name": "Twitch:",
                                    "value": `${dbsave.cacheData.twitch}`
                                },
                                (chan.DiscordServer ? {
                                    "name": "Discord Server:",
                                    "value": `[Join here](https://discord.gg/${chan.DiscordServer})`
                                } : {
                                    "name": "** **",
                                    "value": "** **"
                                })
                            ],
                            "footer": {
                                "text": "Powered by hopebot.xyz"
                            },
                            "image": {
                                "url": `${dbsave.cacheData.image}`
                            },
                            "thumbnail": {
                                "url": `${dbsave.cacheData.thumbnail}`
                            }
                        }

                        let datamsg = {
                            "content": null,
                            "tts": false,
                            "embeds": [SendEmbed]
                        };

                        await editMessage(dbsave.ChannelToPost, dbsave.discord_message_id, datamsg, config.token).then(async (s) => {
                            if (s.code === 10008) {
                                return;
                            } else {
                                if (config.debug) logger.log(`[SAVING]: Twitch offline in channelID = ${dbsave.ChannelToPost} | guildID = ${guild.id}`);
                            }
                        });

                        queue.delete(dbsave.discord_message_id, dbsave.twitch_stream_id);

                        dbsave.discord_message_id = '00';
                        dbsave.twitch_stream_id = StreamData.id;

                        //save config with new data
                        await dbsave.save().catch(() => { });

                        return;
                    }

                    StreamData = StreamData.data[0];

                    //get the channel data for the thumbnail image
                    const ChannelData = await Channel.getData(chan.ChannelName, config.api_keys.twitch.clientID, chan.authToken);
                    // console.log(ChannelData.is_live)
                    if (!ChannelData) return;

                    const viewers = StreamData.viewer_count;

                    //structure for the embed
                    var SendEmbed = {
                        "title": `🟢 ${StreamData.user_name} is now live`,
                        "description": StreamData.title || 'No title',
                        "url": `https://www.twitch.tv/${StreamData.user_login}`,
                        "color": 9442302,
                        "fields": [
                            {
                                "name": "Playing:",
                                "value": `${StreamData.game_name || 'No game'}`,
                                "inline": true
                            },
                            {
                                "name": "Viewers:",
                                "value": `${viewers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`,
                                "inline": true
                            },
                            {
                                "name": "Started",
                                "value": `<t:${Math.round(new Date(StreamData.started_at).getTime() / 1000)}:R>`,
                                "inline": true
                            },
                            {
                                "name": "Twitch:",
                                "value": `[Watch stream](https://www.twitch.tv/${StreamData.user_login})`
                            },
                            (chan.DiscordServer ? {
                                "name": "Discord Server:",
                                "value": `[Join here](https://discord.gg/${chan.DiscordServer})`
                            } : {
                                "name": "** **",
                                "value": "** **"
                            })
                        ],
                        "footer": {
                            "text": "Powered by hopebot.xyz"
                        },
                        "image": {
                            "url": `https://static-cdn.jtvnw.net/previews-ttv/live_user_${StreamData.user_login}-640x360.jpg?cacheBypass=${(Math.random()).toString()}`
                        },
                        "thumbnail": {
                            "url": `${ChannelData.thumbnail_url}`
                        }
                    }

                    let datamsg = {
                        "content": null,
                        "tts": false,
                        "embeds": [SendEmbed]
                    };

                    //get the assigned channel
                    const dbsave = await findOrCreate(chan, 'AutoTwitch-Find');

                    if (chan.twitch_stream_id == StreamData.id) {
                        // verifica se esta na fila // adiciona a fila
                        if (!queue.has(dbsave.discord_message_id, StreamData.id)) queue.set(dbsave.discord_message_id, StreamData.id);
                        let time;
                        if (queue.size > 5) time = randomTime(60000, 600000);
                        // console.log(time)
                        if (time) sleep(time); //isNaN(123)

                        if (config.debug) logger.log(`[EDIT-POST]: channelID = ${dbsave.ChannelToPost} | messageID = ${dbsave.discord_message_id} | guildID = ${guild.id}`);
                        await editMessage(dbsave.ChannelToPost, dbsave.discord_message_id, datamsg, config.token);
                        // Adiciona o embed na fila de cache do webhook.
                        // await addEmbed(dbsave.ChannelToPost, [SendEmbed]);
                        // await cacheSystem(dbsave.ChannelToPost);

                        // Create Streamer Cache in DB
                        if (dbsave.cacheData.title !== SendEmbed.title) dbsave.cacheData.title = `${StreamData.user_name}`;
                        if (dbsave.cacheData.description !== SendEmbed.description) dbsave.cacheData.description = StreamData.title || 'No title';
                        if (dbsave.cacheData.url !== SendEmbed.url) dbsave.cacheData.url = `https://www.twitch.tv/${StreamData.user_login}`;
                        if (dbsave.cacheData.playing !== SendEmbed.fields[0].value) dbsave.cacheData.playing = `${StreamData.game_name || 'No game'}`;
                        if (dbsave.cacheData.viewers !== SendEmbed.fields[1].value) dbsave.cacheData.viewers = `${viewers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
                        if (dbsave.cacheData.started !== SendEmbed.fields[2].value) dbsave.cacheData.started = `<t:${Math.round(new Date(StreamData.started_at).getTime() / 1000)}:R>`;
                        if (dbsave.cacheData.twitch !== SendEmbed.fields[3].value) dbsave.cacheData.twitch = `[Watch stream](https://www.twitch.tv/${StreamData.user_login})`;
                        if (dbsave.cacheData.discord !== SendEmbed.fields[4].value) dbsave.cacheData.discord = chan.DiscordServer ? `[Join here](https://discord.gg/${chan.DiscordServer})` : '** **';
                        if (dbsave.cacheData.image !== SendEmbed.image.url) dbsave.cacheData.image = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${StreamData.user_login}-640x360.jpg?cacheBypass=${(Math.random()).toString()}`;
                        if (dbsave.cacheData.thumbnail !== SendEmbed.thumbnail.url) dbsave.cacheData.thumbnail = `${ChannelData.thumbnail_url}`;
                    } else {
                        // await editMessage(dbsave.ChannelToPost, dbsave.discord_message_id, datamsg, config.token); ou await getOldAndEdit(dbsave.ChannelToPost, dbsave.discord_message_id, datamsg, config.token)
                        //this is the message when a streamer goes live. It will tag the assigned role
                        if (dbsave.roleNotify) {
                            let datamsg = {
                                "content": `<@&${dbsave.roleNotify}>`,
                                "tts": false,
                                "embeds": null,
                            };
                            if (config.debug) logger.log(`[NEW-POST]: Role Notify in channelID = ${dbsave.ChannelToPost} | guildID = ${guild.id}`);
                            await createMessage(dbsave.ChannelToPost, config.token, datamsg);
                        };

                        if (dbsave.customMsg) {
                            let datamsg = {
                                "content": `${dbsave.customMsg
                                    .replace(/{streamer}/g, `${StreamData.user_name}`)
                                    .replace(/{everyone}/g, `@everyone`)
                                    .replace(/{here}/g, `@here`)
                                    .replace(/{link}/g, `https://www.twitch.tv/${StreamData.user_login}`)
                                    .replace(/{title}/g, `${StreamData.title}`)
                                    .replace(/{viewer}/g, `${StreamData.viewer_count}`)}`,
                                "tts": false,
                                "embeds": null,
                            };
                            if (config.debug) logger.log(`[NEW-POST]: Custom Message in channelID = ${dbsave.ChannelToPost} | guildID = ${guild.id}`);
                            await createMessage(dbsave.ChannelToPost, config.token, datamsg);
                        }

                        await createMessage(dbsave.ChannelToPost, config.token, datamsg).then(async (s) => {
                            // verifica se ja esta na fila // adiciona a fila
                            if (!queue.has(s.id, StreamData.id)) queue.set(s.id, StreamData.id);
                            let time;
                            if (queue.size > 5) time = randomTime(10000, 30000);
                            if (time) sleep(time);

                            if (config.debug) logger.log(`[NEW-POST]: Twitch online in channelID = ${dbsave.ChannelToPost} | guildID = ${guild.id}`);
                            dbsave.discord_message_id = s.id;
                            dbsave.twitch_stream_id = StreamData.id;

                            // Create Streamer Cache in DB
                            if (dbsave.cacheData.title !== SendEmbed.title) dbsave.cacheData.title = `${StreamData.user_name}`;
                            if (dbsave.cacheData.description !== SendEmbed.description) dbsave.cacheData.description = StreamData.title || 'No title';
                            if (dbsave.cacheData.url !== SendEmbed.url) dbsave.cacheData.url = `https://www.twitch.tv/${StreamData.user_login}`;
                            if (dbsave.cacheData.playing !== SendEmbed.fields[0].value) dbsave.cacheData.playing = `${StreamData.game_name || 'No game'}`;
                            if (dbsave.cacheData.viewers !== SendEmbed.fields[1].value) dbsave.cacheData.viewers = `${viewers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
                            if (dbsave.cacheData.started !== SendEmbed.fields[2].value) dbsave.cacheData.started = `<t:${Math.round(new Date(StreamData.started_at).getTime() / 1000)}:R>`;
                            if (dbsave.cacheData.twitch !== SendEmbed.fields[3].value) dbsave.cacheData.twitch = `[Watch stream](https://www.twitch.tv/${StreamData.user_login})`;
                            if (dbsave.cacheData.discord !== SendEmbed.fields[4].value) dbsave.cacheData.discord = chan.DiscordServer ? `[Join here](https://discord.gg/${chan.DiscordServer})` : '** **';
                            if (dbsave.cacheData.image !== SendEmbed.image.url) dbsave.cacheData.image = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${StreamData.user_login}-640x360.jpg?cacheBypass=${(Math.random()).toString()}`;
                            if (dbsave.cacheData.thumbnail !== SendEmbed.thumbnail.url) dbsave.cacheData.thumbnail = `${ChannelData.thumbnail_url}`;

                            await dbsave.save().catch(() => { });
                        });

                    }
                    //save config with new data
                    await dbsave.save().catch(() => { });
                })
            }
        })
    } catch (error) {
        console.log('error aqui', error)
    }
})


//update the authorization key every hour
let updateAuth = new CronJob('* * * * *', async function () {
    if (config.debug) logger.log(`[UPDATE]: Generate a new Authorization Key in channelID = ${dbsave.ChannelToPost} | guildID = ${guild.id}`);
    UpdateAuthConfig()
});

//get a new authorization key and update the config
async function UpdateAuthConfig() {
    const conditional = {
        enabled: "true",
    }
    const results = await findOrCreate(conditional, 'AutoTwitch-Find2');

    if (results && results.length) {
        for (const result of results) {

            //get the auth key
            const authKey = await Auth.getKey(config.api_keys.twitch.clientID, config.api_keys.twitch.clientSecret);
            if (!authKey) return;

            //write the new auth key
            result.authToken = authKey.access_token;
            await result.save().catch(() => { });
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomTime(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//start the timers
updateAuth.start()
Check.start();

process.on('unhandledRejection', error => logger.error('unhandledRejection', error));
process.on('uncaughtException', error => logger.error('uncaughtException', error));