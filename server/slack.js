const { RTMClient, WebClient } = require('@slack/client');

const projectId = process.env.DIALOGFLOW_PROJECT_ID;
const sessionId = 'quickstart-session-id';
const languageCode = 'en-US';

// Instantiate a DialogFlow client.
const dialogflow = require('dialogflow');
const sessionClient = new dialogflow.SessionsClient();

// Define session path
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

const token = process.env.BOT_OAUTH_TOKEN;

const rtm = new RTMClient(token);
rtm.start();

const web = new WebClient(token);


global.reminderInfo = {}
//Sent Message to General
// web.channels.list()
//   .then((res) => {
//     // Take any channel for which the bot is a member
//     console.log(res)
//     const channel = res.channels.find(c => c.is_member);
//
//     if (channel) {
//       rtm.sendMessage('Hello World!', channel.id)
//         .then((msg) => console.log(`Message sent to channel ${channel.name} with ts:${msg.ts}`))
//         .catch(console.error);
//     } else {
//       console.log('This bot does not belong to any channel, invite it')
//     }
//   });


rtm.on('message', (message) => {
  console.log(message)
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (message.subtype && message.subtype === 'message_changed') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
         return;
       }
  let replyChannel = message.channel
  let request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message.text,
        languageCode: languageCode,
      },
    },
  };
  sessionClient
  .detectIntent(request)
  .then(responses => {
    console.log(responses[0].queryResult.parameters);
    let date = responses[0].queryResult.parameters.fields.date.stringValue;
    let title = responses[0].queryResult.parameters.fields.Subject.stringValue;
    let prettyDate = new Date(date)
    prettyDate = prettyDate.toDateString()
    // Response Call
    global.reminderInfo[message.user] = {task: title, time: date}
    web.chat.postMessage({
      channel: replyChannel,
      attachments: [
            {
              "text": `Would you like me to remind you to ${title}on ${prettyDate}`,
              "fallback": "You were unable to set up a reminder. Try again.",
              "callback_id": "reminder_confirm",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "actions": [
                  {
                      "name": "response",
                      "text": "Confirm",
                      "type": "button",
                      "value": "true"
                  },
                  {
                      "name": "response",
                      "text": "Cancel",
                      "type": "button",
                      "value": "false"
                  }
              ]
            }
        ]
    })

    // web.chat.postMessage({
    //   channel: replyChannel,
    //   attachments: [
    //       {
    //         "text": `Would you like me to set a meeting with {Enter Invitees} at {Time} on {Day}?`,
    //         "fallback": "You were unable to set up a meeting. Try again.",
    //         "callback_id": "meeting-confirm",
    //         "color": "#3AA3E3",
    //         "attachment_type": "default",
    //         "actions": [
    //           {
    //             "name": "response",
    //             "text": "Confirm",
    //             "type": "button",
    //             "value": "true"
    //           },
    //           {
    //             "name": "response",
    //             "text": "Cancel",
    //             "type": "button",
    //             "value": "false"
    //           }
    //         ]
    //       }
    //   ]
    // })
  })
  .catch(err => {
    console.error('ERROR:', err);
  });

  // How to send a simple message
  // rtm.sendMessage('Hey Bro', replyChannel)
  //   .then((msg) => console.log(`Message sent to channel ${replyChannel} with ts:${msg.ts}`))
  //   .catch(console.error);
  // console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
})
