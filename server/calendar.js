const express = require('express')
const app = express();
var router = express.Router();

function gCal() {
  //OAuth2
  const {google} = require('googleapis');

  const SCOPES = ['https://www.googleapis.com/auth/calendar'];

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

  console.log(authUrl); //this needs to be sent to slack webhook

  router.get('/google/callback' , (req,res) => {
    console.log(req.query);

    oAuth2Client.getToken(req.query.code, (err, token) => {
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
          return;
        }
        console.log('Event created:', event.data.htmlLink);
      });

      res.send("Received code")
    })
  })

  return router;
}

module.exports = {
  gCal
}
