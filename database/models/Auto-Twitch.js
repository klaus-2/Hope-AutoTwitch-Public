const { Schema, model } = require('mongoose');

const autoTwitchSchema = Schema({
    guildID: String,
    ChannelName: { type: String, default: null },
    DiscordServer: { type: String, default: null },
    twitch_stream_id: { type: String, default: null },
    discord_message_id: { type: String, default: null },
    ChannelToPost: { type: String, default: null },
    authToken: { type: String, default: null },
    enabled: { type: String, default: "true" },
    customMsg: { type: String, default: null },
    roleNotify: { type: String, default: null },
    cacheData: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        url: { type: String, default: null },
        playing: { type: String, default: null },
        viewers: { type: String, default: null },
        started: { type: String, default: null },
        twitch: { type: String, default: null },
        discord: { type: String, default: null },
        image: { type: String, default: null },
        thumbnail: { type: String, default: null },
    }
});

module.exports = model('AutoTwitch', autoTwitchSchema);