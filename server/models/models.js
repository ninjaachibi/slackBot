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
  info: {
    type: String,
    required: true,
  },
  user: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  deadline: {
    type: Number,
    required: true,
  },
})
//
// let inviteeSchema = new mongoose.Schema({
//   eventId: {
//     type: String,
//   },
//   inviteeId: {
//     type: String,
//   },
//   requesterId: {
//     type: String,
//   },
//   status: {
//     type: String,
//   }
// })



let User = mongoose.model('User', userSchema)
// let Task = mongoose.model('Task', taskSchema)
let Meeting = mongoose.model('Meeting', meetingSchema)
// let Invitee = mongoose.model('Invitee', inviteeSchema)

export default {User: User,  Meeting: Meeting}
