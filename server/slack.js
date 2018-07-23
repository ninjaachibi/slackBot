const { RTMClient, WebClient } = require('@slack/client');

const token = process.env.BOT_OAUTH_TOKEN;

const rtm = new RTMClient(token);
rtm.start();

const web = new WebClient(token);

web.channels.list()
  .then((res) => {
    // Take any channel for which the bot is a member
    console.log(res)
    const channel = res.channels.find(c => c.is_member);

    if (channel) {
      rtm.sendMessage('Hello World!', channel.id)
        .then((msg) => console.log(`Message sent to channel ${channel.name} with ts:${msg.ts}`))
        .catch(console.error);
    } else {
      console.log('This bot does not belong to any channel, invite it')
    }
  });

rtm.on('message', (message) => {
  console.log(message)
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
         return;
       }
  let replyChannel = message.channel
  rtm.sendMessage('Hey Bro', replyChannel)
    .then((msg) => console.log(`Message sent to channel ${replyChannel} with ts:${msg.ts}`))
    .catch(console.error);
  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
})
