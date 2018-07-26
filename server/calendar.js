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
    console.log('**************oAuth2Client IS *********************',oAuth2Client);

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
      //checkTime(start, end) { ---- }
      console.log('END', end);
      // let slackIdList;
      axios.get('https://slack.com/api/users.list', {
        'headers': {
          'Authorization': 'Bearer ' + process.env.BOT_OAUTH_TOKEN
        }
      })
        .then((userList) => {
          // userList = userList)
          // console.log('Inve', info.invitees);
          let gCalIds = []
          let emailList = info.invitees.map((invite) => {
            let email;
            // console.log('USERAS', userList.data.members);
            userList.data.members.forEach((user) => {
              // console.log('dn', user.profile.display_name, 'user', invite);
              console.log(user)
              if (user.profile.display_name === invite.stringValue) {
                email = {'email': user.profile.email };
                gCalIds.push({'id': user.id, name: user.profile.display_name})
              }
            })
            return email
          })
          //push tokens for invitees into gCalTokens array
          let gCalTokens = [];
          gCalIds.forEach((id) => {
            User.findOne({slackId: id})
              .then((user) => {
                gCalTokens.push(user.gCalToken);
              })
          })
          //look through people's busy times
          gCalTokens.forEach((tempToken) => {
            const tempOAuth = new google.auth.OAuth2(
              process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');
            tempOAuth.setCredentials(tempToken);
            const tempCalendar = google.calendar({version: 'v3', auth: tempOAuth});

            let searchEnd = new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000
            tempCalendar.freebusy.query({
              "timeMin": start,
              "timeMax": new Date(searchEnd).toISOString(),
              "items": [
                {
                  "id": "primary"
                }
              ]
            })
              .then(resp => {
                console.log('busy times', resp);
              })


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
        let meet = new Meeting({
          startTime: start,
          endTime: end,
          invitees: emailList
        }).save()
        .then(()=>{
          cb(null, event)
        })
        .catch(err => {
          console.log('Error', err);
        })

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
