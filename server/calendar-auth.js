const {google} = require('googleapis');
const express = require('express')
const app = express();
const router = express.Router();
import models from './models/models.js'
import slackFinish from './server.js'
const {User, Task} = models

const oAuth2Client = new google.auth.OAuth2(
  process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');



export function generateAuthUrl(state) {
  console.log('state is', state);
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];


  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: JSON.stringify(state)
    });

  return authUrl; //this needs to be sent to slack webhook
}

router.get('/google/callback' , (req,res) => {
  console.log(req.query);
  let parsedState = JSON.parse(req.query.state)
  let id;
  if (typeof(parsedState) !== 'string') {
    console.log('in callback, state is', parsedState);
    id = parsedState.user.id
  } else {
    id = parsedState
  }
  oAuth2Client.getToken(req.query.code, (err, token) => {
    User.findOneAndUpdate({slackId: id},
      {$set:{gCalToken: token}},  {new: true},
      (err, success) => {
        // console.log(success);
        if (typeof(parsedState) !== 'string') {
          slackFinish(parsedState)
          .then(() => {
            if (parsedState.callback_id === 'reminder_confirm'){
              res.send(`I've set a reminder but you should really remember things on your own`)
            } else if(parsedState.callback_id === 'meeting_confirm'){
              res.send(`The meeting is set, but it seems kinda pointless`)
            } else {
              res.send(`Uhm, You messed up`)
            }
          })
        } else {
          res.send(`You have been confirmed, thank you`)
        }
      }
    )
    console.log('Token IS', token)
    if(err) console.log('bad code');

    //save to DB parsedState
    //call gcal();
    // res.send("Received code")
  })
})

export default router;
