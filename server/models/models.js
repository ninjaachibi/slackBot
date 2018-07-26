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
  gCalToken: {
    type: Object,
    default: ""
  },
})
//
// let taskSchema = new mongoose.Schema({
//   subject: {
//     type: String,
//     required: true,
//   },
//   day: {
//     type: String,
//     required: true,
//   },
//   gCalEventId: {
//     type: String,
//   },
//   //This will be the ID of the one who initially dialogues with the bot
//   requesterId: {
//     type: String,
//   }
// })

let meetingSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  invitees: {
    type: Array,
    required: true,
  },
  // subject: {
  //   type: String,
  // },
  // location: {
  //   type: String,
  // },
  // //This can be the default based on the user requesting, or if specified make it the specified time.
  // meetingLength: {
  //   type: Number,
  //   default: 30
  // },
  // gCalFields: {
  //   type: String,
  // },
  // status: {
  //   type: String,
  // },
  // createdAt: {
  //   type: Date,
  //   default: new Date(),
  // },
  // requesterId: {
  //   type: String,
  //   required: true
  // }
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
// let Task = mongoose.model('Task', taskSchema)
let Meeting = mongoose.model('Meeting', meetingSchema)
let Invitee = mongoose.model('Invitee', inviteeSchema)

export default {User: User,  Meeting: Meeting, Invitee: Invitee}
