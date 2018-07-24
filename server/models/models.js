import mongoose from 'mongoose';
let connect = process.env.MONGODB_URI;

mongoose.connect(connect)

let userSchema = new mongoose.Schema({
  slackId: {
    type: String,
    required: true
  },
  slackUsername: {
    type: String,
  },
  slackEmail: {
    type: String,
  },
  slackDMIds: {
    type: String,
  },
  defaultMeeting: 30,
  gCalAccount: {
    gCalToken: {
      type: String,
    },
    gCalRefreshToken: {
      type: String,
    },
    gPlusId: {
      type: String,
    }
  }
})

let taskSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  gCalEventId: {
    type: String,
  },
  //This will be the ID of the one who initially dialogues with the bot
  requesterId: {
    type: String,
  }
})

let meetingSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  invitees: {
    type: Array,
    required: true,
  },
  subject: {
    type: String,
  },
  location: {
    type: String,
  },
  //This can be the default based on the user requesting, or if specified make it the specified time.
  meetingLength: {
    type: String,
  },
  gCalFields: {
    type: String,
  },
  status: {
    type: String,
  },
  createdAt: new Date(),
  requesterId: {
    type: String,
    required: true
  }
})

let inviteeSchema = new mongoose.Schema({
  eventId: {
    type: String,
  },
  inviteeId: {
    type: String,
  },
  requesterId: {
    type: String,
  },
  status: {
    type: String,
  }
})



let User = mongoose.model('User', userSchema)
let Task = mongoose.model('Task', taskSchema)
let Meeting = mongoose.model('Meeting', meetingSchema)
let Invitee = mongoose.model('Invitee', inviteeSchema)

export default {User: User, Task: Task, Meeting: Meeting, Invitee: Invitee}
