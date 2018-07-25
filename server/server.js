const bodyParser = require('body-parser')
const path = require('path')
import gCal, {refreshToken} from './calendar';
import calendarAuthRoutes, {generateAuthUrl} from './calendar-auth';
import mongoose from 'mongoose';
const slack = require('./slack')
import models from './models/models.js'
const {User, Task} = models

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
  console.log("PAYLOAD", payload)
  if (payload.actions[0].value === 'cancel' && payload.callback_id === 'reminder_confirm'){
    res.send(`I've cancelled your request, but if we're being honest, without that reminder, you're going to forget`)
  } else if (payload.actions[0].value === 'cancel' && payload.callback_id === 'meeting_confirm') {
    res.send(`I've cancelled the meeting but it could have been really important`)
  }else {
    const userId = payload.user.id
    const info = global.reminderInfo[userId]
    User.findOne({slackId: userId})
      .then(async (user) => {
        console.log('User is', user)
        console.log('Token is', !!user.gCalToken)
        if (!user.gCalToken) {
          let url = generateAuthUrl(payload); //argument is slackId
          //send to slack
          res.send(`Might want authorize Slack to access google calendars \n ${url}`)
        }
        else if (user.gCalToken.expiry_date < Date.now() + 60000) {
          console.log('**************************refreshing token***********************');
          //refresh token
          let token = refreshToken(user.gCalToken);
          console.log(token);
          user.gCalToken = token;
          await user.save();
        }
        else {
          slackFinish(payload)
          .then(() => {
            if (payload.callback_id === 'reminder_confirm'){
              res.send(`I've set a reminder but you should really remember things on your own`)
            } else if(payload.callback_id === 'meeting_confirm'){
              res.send(`The meeting is set, but it seems kinda pointless`)
            }
          })
        }
      })
  }
})

export default function slackFinish(payload) {
  return User.findOne({slackId: payload.user.id})
    .then((user) => {
      let token = user.gCalToken
      let info
      if (payload.callback_id === 'reminder_confirm') {
        info = global.reminderInfo[payload.user.id]
      } else if (payload.callback_id === 'meeting_confirm') {
        info = global.meetingInfo[payload.user.id]
      }
        return new Promise ((resolve, reject) => {
          gCal(token, info, payload.callback_id, (err, succ) => {
            if (err) {
              console.log('ERROR', err);
            } else {
              console.log('SUCCESS', succ.data.htmlLink)
            }
            resolve(true)
          })
        })
    }
  })
}





//Do Not Touch This Bottom Part
app.listen(process.env.port || 3000, () => {console.log('listening on port 3000') });

console.log('Server running at http://127.0.0.1:3000/')
