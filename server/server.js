const bodyParser = require('body-parser')
const path = require('path')
import gCal, {refreshToken} from './calendar';
import calendarAuthRoutes, {generateAuthUrl} from './calendar-auth';
import mongoose from 'mongoose';
const slack = require('./slack')
const {rtm} = require('./slack')


import models from './models/models.js'
const { User, Meeting } = models
var cron = require('node-cron');

const token = process.env.BOT_OAUTH_TOKEN;

// For revoking refresh tokens
// import axios from 'axios';
// axios(`https://accounts.google.com/o/oauth2/revoke?token=ya29.GlwEBuE1TnVIoUiZ3l7dqgAmte-vlqKxMJ2kwAydOTHJmUDehpx7IBDI-_bs5uDe00bXZ-taHRFEzl61OmvOLaa7Peuv6bActSv9arUabgwwOGIdlCEBiADS-Ec35A`)

cron.schedule('*/15 * * * * *', () => {
  console.log('CRON');
  Meeting.find()
  .then(meetings => {
    if (meetings.length === 0 ){
      console.log('No Pending Meetings');
      return;
    }
    meetings.forEach(meeting => {
      console.log('Meeting', meeting);
      let userId = JSON.parse(meeting.user).id
      if (meeting.deadline < new Date().getTime()){
        if (meeting.action === '2hourCancel'){
          // console.log('Cancel');
          Meeting.deleteOne({_id: meeting.id})
          .then(()=>{
            User.findOne({slackId: userId})
            .then((creator) => {
              console.log(creator);
              rtm.sendMessage(`A pending event was deleted from the database`, creator.channel)})
          })
        } else {
          //Make the event without the people in meeting.info.noAccessUsers
          User.findOne({slackId: userId})
          .then((creator) => {
            let token = creator.gCalToken;
            let info = JSON.parse(meeting.info)
            let noAccess = JSON.parse(meeting.info).noAccessUsers;
            noAccess = noAccess.map(obj => (obj.slackId));
            Promise.all(noAccess.map(slackId => {
              return User.findOne({slackId: slackId})
            }))
            .then((result) => {
              let names = result.map(user => (user.displayName))
              info.invitees = info.invitees.filter((invitee) => {
                return names.indexOf(invitee.stringValue) !== -1
              })
              gCal(token, info, "meeting_confirm", (err, succ) => {
                if (err) {
                  console.log('ERROR', err);
                } else {
                  console.log('SUCCESS', succ.data.htmlLink)
                  console.log('Meeting created without no access users');
                  Meeting.deleteOne({_id: meeting.id})
                  .then(()=>{
                    User.findOne({slackId: userId})
                    .then((creator) => {
                      console.log(creator);
                      rtm.sendMessage(`A pending event was created without those who did not allow me access to their calendar`, creator.channel)})
                    })
                }
              })
            })
          })
          .catch(err => {
            console.log('Create without-error', err);
          })
        }
      } else {
        let noAccess = JSON.parse(meeting.info).noAccessUsers;
        noAccess = noAccess.map(obj => (obj.slackId));
        Promise.all(noAccess.map(slackId => {
          return User.findOne({slackId: slackId})
        }))
        .then((result) => {
          let allGood = true;
          let stillWrong = [];
          result.forEach(res => {
            if (!res.gCalToken){
              allGood = false;
              stillWrong.push(res);
            }
          })
          if (allGood){
            //Make the event as normal
            User.findOne({slackId: userId})
            .then((creator) => {
              let token = creator.gCalToken;
              let info = JSON.parse(meeting.info)
              gCal(token, info, "meeting_confirm", (err, succ) => {
                if (err) {
                  console.log('ERROR', err);
                } else {
                  console.log('SUCCESS', succ.data.htmlLink)
                  Meeting.deleteOne({_id: meeting.id})
                  .then(()=>{
                    User.findOne({slackId: userId})
                    .then((creator) => {
                      console.log(creator);
                      rtm.sendMessage(`A pending event was created with all invitees`, creator.channel)})
                    })
                  }
              })
            })

          } else {
            let updatedMeeting = JSON.parse(meeting.info)
            updatedMeeting.noAccessUsers = stillWrong
            Meeting.findOneAndUpdate({_id: meeting.id}, {info: JSON.stringify(updatedMeeting)})
            .then(()=> {console.log('MEETING HAS BEEN UPDated');})
          }
        })
      }
    })
  })
  .catch(err => {
    console.log('Cron Error', err);
  })
})

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not in the environmental variables")
}

mongoose.connection.on('connected', function() {
  console.log('Success: connected to MongoDb!');
});

mongoose.connection.on('error', function() {
  console.log('Error connecting to MongoDb. Check it')
})

mongoose.connect(process.env.MONGODB_URI)
//server Set Up
const express = require('express')
const app = express();

app.use(express.static(path.join(__dirname, 'build')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//create calendar event
app.use('/', calendarAuthRoutes)//need to somehow account for the route inside

// Test-Route
app.get('/ping', (req, res) => {
  res.send('pong')
})

let payload = ""
app.post('/slack', (req, res) => {
  payload = JSON.parse(req.body.payload)
  const userId = payload.user.id
  // console.log("PAYLOAD", payload.actions[0].selected_options[0].value)
  if (payload.actions[0].value === 'cancel' && payload.callback_id === 'reminder_confirm'){
    res.send(`I've cancelled your request, but if we're being honest, without that reminder, you're going to forget`)
  } else if (payload.actions[0].value === 'cancel' && payload.callback_id === 'meeting_confirm') {
    res.send(`I've cancelled the meeting but it could have been really important`)
  }else if (payload.actions[0].value === '2hourCancel' || payload.actions[0].value === '2hourCreate') {
    pending(payload)
    User.findOne({slackId: userId})
      .then( (user) => {
        if (!user.gCalToken) {
          let url = generateAuthUrl(userId); //argument is payload
          res.send(`Might want authorize Slack to access google calendars \n ${url}`)
        } else{
          res.send(`The meeting is now pending, I'll let you know what happens`)
        }
      })
  }else {
    // const info = global.reminderInfo[userId]
    User.findOne({slackId: userId})
      .then(async (user) => {
        console.log('User is', user)
        console.log('Token is', !!user.gCalToken)
        if (!user.gCalToken) {
          let url = generateAuthUrl(payload); //argument is payload
          //send to slack
          res.send(`Might want authorize Slack to access google calendars \n ${url}`)
        }
        else if(user.gCalToken.expiry_date < Date.now() - 60000) {
          console.log('**************************refreshing token***********************');
          //refresh token
          console.log('token is',user.gCalToken);

          try {
            let token = await refreshToken(user.gCalToken);
            console.log('new token is ',token);
            user.gCalToken = token;
            await user.save();
          } catch (e){
            console.log('Catch', e);
          }
        }
        else {
          slackFinish(payload)
          .then(() => {
            if (payload.callback_id === 'reminder_confirm'){
              res.send(`I've set a reminder but you should really remember things on your own`)
            } else if(payload.callback_id === 'meeting_confirm'){
              res.send(`The meeting is set, but it seems kinda pointless`)
            } else{
              console.log('else');
            }
          })
        }
      })
      .catch(err => {
        console.log('ERROR', err);
      })
  }
})

export default function slackFinish(payload) {
  return User.findOne({slackId: payload.user.id})
  .then((user) => {
    let token = user.gCalToken
    let info;
    if (payload.callback_id === 'reminder_confirm') {
      info = global.reminderInfo[payload.user.id]
    } else if (payload.callback_id === 'meeting_confirm') {
      info = global.meetingInfo[payload.user.id]
    }
    return new Promise ((resolve, reject) => {
      gCal(token, info, payload.callback_id, (err, succ) => {
        if (err) {
          console.log('ERROR', err);
          reject(err);
        } else {
          console.log('SUCCESS', succ.data.htmlLink)
          resolve(true)
        }
      })
    })
  }).catch(err => {
    console.log('slackFinishErr', err);
  })
}


function pending(payload){
  let action = payload.actions[0].value;
  let user = payload.user;
  let info = global.meetingInfo[payload.user.id];
  let deadline = new Date().getTime() + 7200000;
  let newPendingMeeting = new Meeting({
    info: JSON.stringify(info),
    user: JSON.stringify(user),
    action: action,
    deadline: deadline
  }).save()
  .then(() =>{
    console.log('Pending Meeting Saved');
  })
  .catch(err => {
    console.log('Pending Error', err);
  })

}


//Do Not Touch This Bottom Part
app.listen(process.env.port || 3000, () => {console.log('listening on port 3000') });

console.log('Server running at http://127.0.0.1:3000/')
