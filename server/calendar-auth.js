const {google} = require('googleapis');
const express = require('express')
const app = express();
const router = express.Router();
import models from './models/models.js'
const {User, Task} = models

const oAuth2Client = new google.auth.OAuth2(
  process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

let payloadHolder;

export function generateAuthUrl(state) {

  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  payloadHolder = state

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

  return authUrl; //this needs to be sent to slack webhook
}

router.get('/google/callback' , (req,res) => {
  console.log(req.query);

  oAuth2Client.getToken(req.query.code, (err, token) => {
    User.findOneAndUpdate({slackId: payloadHolder.user.id},
      {$set:{gCalToken: token}},  {new: true}, 
      (err, success) => {
        console.log(success);
      }
    )
    // .then((user) => {
    //   console.log(user)
    // })
    console.log('Token IS', token)
    if(err) console.log('bad code');

    //save to DB req.query.state
    //call gcal();
    console.log(payloadHolder)
    res.send("Received code")
  })
})

export default router;
