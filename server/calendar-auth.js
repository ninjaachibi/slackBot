const {google} = require('googleapis');
const express = require('express')
const app = express();
const router = express.Router();

export function generateAuthUrl(state) {
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, process.env.NGROK + '/google/callback');

  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

  return authUrl; //this needs to be sent to slack webhook
}

router.get('/google/callback' , (req,res) => {
  console.log(req.query);

  oAuth2Client.getToken(req.query.code, (err, token) => {
    //save to DB req.query.state

    res.send("Received code")
  })
})

export default router;
