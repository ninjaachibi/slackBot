const { RTMClient, WebClient } = require('@slack/client');

const projectId = process.env.DIALOGFLOW_PROJECT_ID;
const sessionId = 'quickstart-session-id';
const languageCode = 'en-US';

// Instantiate a DialogFlow client.
const dialogflow = require('dialogflow');
const sessionClient = new dialogflow.SessionsClient();
import mongoose from 'mongoose';
import models from './models/models.js'
const {User} = models;

//GCal WebClient
import gCal, {refreshToken} from './calendar';
import calendarAuthRoutes, {generateAuthUrl} from './calendar-auth';

// Define session path
const sessionPath = sessionClient.sessionPath(projectId, sessionId);

const token = process.env.BOT_OAUTH_TOKEN;

const rtm = new RTMClient(token);
rtm.start();

const web = new WebClient(token);

global.reminderInfo = {};
global.meetingInfo = {};

rtm.on('message', (message) => {
  // console.log(message)
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (message.subtype && message.subtype === 'message_changed') ||
       (!message.subtype && message.user === rtm.activeUserId) ||
       (message.channel[0] !== 'D') ) {
         return;
       }
  console.log('The MESSAGE IS', message)

  let replyChannel = message.channel //Slack Channel
  User.findOne({slackId: message.user})
    .then((user) => {
      if (!user) {
        return new User({
          slackId: message.user,
          channel: message.channel
        }).save()
      }
    })

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
    let intent = responses[0].queryResult.intent.displayName;
    if (intent === 'Reminder'){
      let date = responses[0].queryResult.parameters.fields.date.stringValue;
      let title = responses[0].queryResult.parameters.fields.Subject.stringValue;
      if (!title){
        return rtm.sendMessage("I need something to remind you about, otherwise I'm just going to be annoying you for no reason", replyChannel)
      }
      if (!date){
        return rtm.sendMessage(`I need a date to create a reminder on, otherwise you're going to ${title} on the wrong day and blame me`, replyChannel)
      }
      let prettyDate = new Date(date)
      global.reminderInfo[message.user] = {task: title, time: prettyDate, channel: replyChannel}
      prettyDate = prettyDate.toDateString();

      // Response Call

      web.chat.postMessage({
        channel: replyChannel,
        attachments: [
              {
                "text": `Would you like me to remind you to ${title}  on ${prettyDate}`,
                "fallback": "You were unable to set up a reminder",
                "callback_id": "reminder_confirm",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "response",
                        "text": "Confirm",
                        "type": "button",
                        "value": "confirm"
                    },
                    {
                        "name": "response",
                        "text": "Cancel",
                        "type": "button",
                        "value": "cancel"
                    }
                ]
              }
          ]
      })
    } else if (intent === 'Meeting') {
      let date = responses[0].queryResult.parameters.fields.date.stringValue;
      if (!date){
        return rtm.sendMessage('I need a date to create the meeting on, otherwise people will meet on the wrong day', replyChannel)
      }
      let title = responses[0].queryResult.parameters.fields.Subject.stringValue;
      // let location = responses[0].queryResult.parameters.fields.location.stringValue;
      let duration = 0;
      if (responses[0].queryResult.parameters.fields.duration.listValue.values.length !== 0){
        console.log('DURATION EXISTS');
        duration = responses[0].queryResult.parameters.fields.duration.listValue.values[0].structValue.fields;
      }
      let prettyDate = new Date(date)
      prettyDate = prettyDate.toDateString();
      // console.log('time', responses[0].queryResult.parameters.fields);
      let time = responses[0].queryResult.parameters.fields.time.stringValue
      if (!time){
        return rtm.sendMessage('I need a time for the meeting, otherwise no one will know when to meet', replyChannel)
      }
      let day = date.split('T')[0];
      let hour = time.split('T')[1];
      let actualDate = []
      actualDate.push(day)
      actualDate.push(hour)
      actualDate = actualDate.join('T');
      time = formatTimeString(new Date(time))
      let invitees = responses[0].queryResult.parameters.fields['given-name'].listValue.values;
      let names;
      if (invitees.length === 0){
        return rtm.sendMessage("I need some people for the meeting, otherwise you'll be bored all on your own", replyChannel)
      } else{
        names = invitees;
        invitees = invitees.map((person)=> (person.stringValue));
        let guests = invitees[0];
        for (let i = 1; i < invitees.length - 1; i++){
          guests += ', ' + invitees[i];
        }
        guests += ', and ' + invitees[invitees.length - 1];
        if (invitees.length === 1){
          guests = invitees[0]
        }
        invitees = guests;
      }
      global.meetingInfo[message.user] = {date: actualDate, invitees: names, channel: replyChannel}
      if (title){
        global.meetingInfo[message.user].title = title;
      } else {
        global.meetingInfo[message.user].title = 'Meeting';
      }
      // if (location) {
      //   global.meetingInfo[message.user].location = location
      // }
      if (duration !== 0){
	      global.meetingInfo[message.user].duration = duration;
      } else {
        global.meetingInfo[message.user].duration = {amount: 30, unit: 'min'};
      }
      web.chat.postMessage({
          channel: replyChannel,
          attachments: [
              {
                "text": `Would you like me to set a meeting with ${invitees} at ${time} on ${prettyDate}?`,
                "fallback": "You were unable to set up a meeting. Try again.",
                "callback_id": "meeting_confirm",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                  {
                    "name": "response",
                    "text": "Confirm",
                    "type": "button",
                    "value": "confirm"
                  },
                  {
                    "name": "response",
                    "text": "Cancel",
                    "type": "button",
                    "value": "cancel"
                  }
                ]
              }
          ]
        })
    } else {
      return rtm.sendMessage(responses[0].queryResult.fulfillmentText, replyChannel)
    }
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

//export this function out to Calendar

const funcs = {
  //GetTimeSlots For Message Options
  getNewTime(channel, timeSlots) {
    let times = timeSlots
    web.chat.postMessage({
        channel: channel,
        attachments: [
            {
              "text": `Do any of these other times work?`,
              "fallback": "You were unable to set up a meeting. Try again.",
              "callback_id": "meeting_confirm",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "actions": [
                      {
                        "name": "times_list",
                        "text": "Pick a time...",
                        "type": "select",
                        "options": [
                          {
                            "text": times[0],
                            "value": times[0]
                          },
                          {
                            "text": times[1],
                            "value": times[1]
                          },
                          {
                            "text": times[2],
                            "value": times[2]
                          },
                          {
                            "text": times[3],
                            "value": times[3]
                          },
                          {
                            "text": times[4],
                            "value": times[4]
                          },
                          {
                            "text": times[5],
                            "value": times[5]
                          },
                          {
                            "text": times[6],
                            "value": times[6]
                          },
                          {
                            "text": times[7],
                            "value": times[7]
                          },
                          {
                            "text": times[8],
                            "value": times[8]
                          },
                          {
                            "text": times[9],
                            "value": times[9]
                          },
                        ]
                      }
                  ]
            }
        ]
      })
  },

  //Send Confirmation Emails to Each User to make sure they are registered

  sendConfirmationEmails(ids) {
    ids.forEach((id) => {
      console.log(id)
      User.findOne({slackId: id.id})
      .then((user) => {
        if (!user.gCal) {
          let url = generateAuthUrl(id.id);
          rtm.sendMessage(`Might want authorize Slack to access google calendars \n ${url}`, user.channel)
        }
      })
    })
  }
}


function formatTimeString(date) {
  function pad(s) { return ((''+s).length < 2 ? '0' : '') + s; }
  function fixHour(h) { return (h==0?'12':(h>12?h-12:h)); }
  let h=date.getHours(), m=date.getMinutes(), s=date.getSeconds()
    , timeStr=[fixHour(h), pad(m)].join(':');
  return timeStr + ' ' + (h < 12 ? 'AM' : 'PM');
}

export default funcs
