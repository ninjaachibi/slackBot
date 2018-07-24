const express = require('express')
const app = express();
var router = express.Router();
const {google} = require('googleapis');

export default function gCal(token, task, time, cb) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

    oAuth2Client.setCredentials(token);
    const calendar = google.calendar({version: 'v3', auth: oAuth2Client})
    var event = {
      'summary': 'Robert\'s naptime' ,
      'location': '800 Howard St., San Francisco, CA 94103',
      'description': 'zzzzzzZ',
      'start': {
        'date': '2018-07-29',
      },
      'end': {
        'date': '2018-07-30',
      },
    }

    calendar.events.insert({
      auth: oAuth2Client,
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
