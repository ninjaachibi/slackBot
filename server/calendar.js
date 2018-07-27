import axios from 'axios';
const express = require('express')
const app = express();
var router = express.Router();
const {google} = require('googleapis');
import models from './models/models.js'
const { User, Meeting } = models
import getNewTime from './slack.js'

export default function gCal(token, info, intent, cb) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');
    oAuth2Client.setCredentials(token);
    console.log('in calendar: token is ', token);
    // console.log('**************oAuth2Client IS *********************',oAuth2Client);

    const calendar = google.calendar({version: 'v3', auth: oAuth2Client})
    let event;

    if (intent === "reminder_confirm") {
      console.log('i', info);
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
    } else if (intent === "meeting_confirm") {
      let start = info.date;
      let end = addDuration(new Date(start), info.duration)
      //We can add the function that is being imported from Slack here to check the start and end.
      // console.log('END', end);
      //checkTime(start, end) { ---- }
      // let slackIdList;
      axios.get('https://slack.com/api/users.list', {
        'headers': {
          'Authorization': 'Bearer ' + process.env.BOT_OAUTH_TOKEN
        }
      })
        .then(async(userList) => {
          // userList = userList)
          // console.log('Inve', info.invitees);
          let gCalIds = []
          let emailList = info.invitees.map((invite) => {
            let email;
            // console.log('USERAS', userList.data.members);
            userList.data.members.forEach((user) => {
              // console.log('dn', user.profile.display_name, 'user', invite);
              // console.log(user)
              if (user.profile.display_name === invite.stringValue) {
                email = {'email': user.profile.email };
                gCalIds.push({'id': user.id, name: user.profile.display_name})
              }
            })
            return email
          })
          //push tokens for invitees into gCalTokens array
          let gCalTokens = [];
          gCalTokens = await Promise.all(
            gCalIds.map((id) => {
              return User.findOne({slackId: id.id})
              .then((user) => {
                console.log("Does This Finish?")
                return user.gCalToken;
              })
            })
          )
          gCalTokens.push(token) //include self in tokens

          console.log("Here first or?")
          console.log('gCalTokens array', gCalTokens);
          //look through people's busy times
          let allBusyTimes = []

          //add busy times for invitees and self
          gCalTokens.forEach(async(tempToken) => {
            try {
              console.log('inside forEach');
              let busyTimes = await getBusyTimes(tempToken, start);
              allBusyTimes.push(...busyTimes);
              console.log('allBusyTimes', allBusyTimes);
            }
            catch (err ) {
              console.log('ERROR', err);
            }
          })

          // console.log(slackReplyIds)
          // funcs.sendConfirmationEmails(slackReplyIds)

      Promise.all(emailList.map(email => {
        console.log('email', email);
        return Meeting.find({invitees: email})
      }))
      .then(result => {
        let free = true;
        // console.log('result', result);
        result[0].forEach(event => {
          // console.log('Event', event.startTime);
          if (overlap(event.startTime, event.endTime, start, end)){
            free = false
          }
        })
        console.log('THE EVENT IS FREE', free);

      })
      event = {
        'summary': info.title,
        'start': {
          'dateTime': start,
        },
        'end': {
          'dateTime': end
        },
        // 'location': info.location,
        'attendees': emailList
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

    })
    }


  }

  export function refreshToken (token) {
    let client = new google.auth.OAuth2(
      process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');
    client.setCredentials(token);
    return new Promise((resolve, reject) => {
      client.refreshAccessToken((err,token) => {
        if(err) reject(err)
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

  function overlap(start, end, stest, etest){
    let s = new Date(start).getTime();
    let e = new Date(end).getTime();
    let sT = new Date(stest).getTime();
    let eT = new Date(etest).getTime();
    let startOverlap = s <= sT && sT <= e;
    let endOverlap = s <= eT && eT <= e;
    let overlap = startOverlap || endOverlap;
    return overlap
  }

  function getBusyTimes(tempToken, start) {
    let tempBusyTimes = [];

    const tempOAuth = new google.auth.OAuth2(
      process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');
      tempOAuth.setCredentials(tempToken);
      console.log('@@@@@@@@@@@@@@@@@@tempOAuth', tempOAuth);
      const tempCalendar = google.calendar({version: 'v3', auth: tempOAuth});

      console.log('start', new Date(start).toISOString());
      let searchEnd = new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000
      console.log('end', new Date(searchEnd).toISOString());

      return new Promise((resolve, reject) => {
        tempCalendar.freebusy.query({
          "resource": {
            "timeMin": new Date(start).toISOString(),
            "timeMax": new Date(searchEnd).toISOString(),
            "items": [
              {
                "id": "primary"
              }
            ]
          }
        }, (err, res) => {
          if(err) reject(err)
          res.data.calendars.primary.busy.forEach((event) => {
            tempBusyTimes.push(event);
          })
          console.log('tempBusyTimes', tempBusyTimes);
          resolve(tempBusyTimes);
        })
      })
  }
