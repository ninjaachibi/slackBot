const bodyParser = require('body-parser')
const path = require('path')

const slack = require('./slack')

//server Set Up
const express = require('express')
const app = express();

app.use(express.static(path.join(__dirname, 'build')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  const gCal = require('./calendar').gCal;
  gCal(info.task, info.time)
  res.send("Done")
})

app.get('/createMeeting', (req, res) => {
  const userId = payload.user.id
  const info = global.reminderInfo[userId]
  const gCal = require('./calendar').gCal;
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
