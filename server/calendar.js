const express = require('express')
const app = express();
var router = express.Router();
const {google} = require('googleapis');

export default function gCal(token, task, time, cb) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

    oAuth2Client.setCredentials(token);
    console.log('in calendar: token is ', token);
    const calendar = google.calendar({version: 'v3', auth: oAuth2Client})

    let endTime = new Date(time)
    endTime.setDate(time.getDate()+1)
    endTime = endTime.toISOString().substring(0, 10)
    time = time.toISOString().substring(0, 10)

    var event = {
      'summary': upper(task) ,
      'start': {
        'date': time,
      },
      'end': {
        'date': endTime,
      },
    }

    calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    }, function(err, event) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return cb(err);
      }
      console.log('Event created:', event.data.htmlLink);
      cb(null, event)
    });


  }

  function upper(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
  }
