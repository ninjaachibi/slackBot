const bodyParser = require('body-parser')
const path = require('path')
import gCal from './calendar';
import calendarAuthRoutes, {generateAuthUrl} from './calendar-auth';
import mongoose from 'mongoose';
// const slack = require('./slack')

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
  if (payload.callback_id === "reminder_confirm") {
    res.redirect('/createReminder')
  } else if (payload.callback_id === "meeting_confirm") {
    res.redirect('/createMeeting')
  } else {
    res.redirect('/ping')
  }
})

app.get('/createReminder', (req, res) => {
  const userId = payload.user.id
  const info = global.reminderInfo[userId]
  // User.findOne({slackid: userId})
  //.then( //check to see if there's an auth token)
  //if not slack asks the user to click the link
  gCal(token, info.task, info.time, (err, event) => {

  })
  res.send("Done")
})

app.get('/createMeeting', (req, res) => {
  const userId = payload.user.id
  const info = global.reminderInfo[userId]
  gCal(info.task, info.time)
  res.send("DoneIt")
})

app.post('/response', (req, res) => {
  console.log('---------------TEST------------');
  res.json(req)
})


//Do Not Touch This Bottom Part
app.listen(process.env.port || 3000, () => {console.log('listening on port 3000') });

console.log('Server running at http://127.0.0.1:3000/')
