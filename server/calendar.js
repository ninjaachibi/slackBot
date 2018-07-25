const express = require('express')
const app = express();
var router = express.Router();
const {google} = require('googleapis');

export default function gCal(token, info, intent, cb) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

    oAuth2Client.setCredentials(token);
    console.log('in calendar: token is ', token);
    const calendar = google.calendar({version: 'v3', auth: oAuth2Client})
    let event;

    if (intent === "reminder_confirm") {
      let endTime = new Date(info.time)
      endTime.setDate(info.time.getDate()+1)
      endTime = endTime.toISOString().substring(0, 10)
      let time = info.time.toISOString().substring(0, 10)

      event = {
        'summary': upper(info.task) ,
        'start': {
          'date': time,
        },
        'end': {
          'date': endTime,
        },
      }
    } else if (intent === "meeting_confirm") {
      let start = info.date;

      let end = addDuration(new Date(start), info.duration)

      event = {
        'summary': info.title,
        'start': {
          'dateTime': start,
        },
        'end': {
          'dateTime': end
        },
        'location': info.location,
        'attendees': [
          
        ]
      }
    }

    calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    }, function(err, event) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return cb(err);
      }
      console.log('Event created:');
      cb(null, event)
    });

  }

  export function refreshToken (token) {
    let client = new google.auth.OAuth2(
      process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');
    client.setCredentials(token);
    return new Promise((resolve, reject) => {
      client.refreshAccessToken((err,token) => {
        if(err) reject(err)
        console.log('refreshed token');
        resolve(token);
      })
    })
  }

  function upper(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function addDuration(startTime, duration) {
    let total = 0;
    let {unit, amount} = duration;
    if(unit.stringValue === 'h') {
      total = amount.numberValue * 3600 * 1000;
    }
    else if(unit.stringValue === 'min') {
      total = amount.numberValue * 60 * 1000;
    }
    else if(unit.stringValue === 'day' ) {
      total = amount.numberValue * 24 * 3600 * 1000;
    }
    else {
      total = 1800 * 1000;
    }
    let ret = startTime.getTime() + total;
    ret = new Date(ret).toISOString();
    return ret; //make this endTime
  }
