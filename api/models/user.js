const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  // phone: {type: String},
  // phoneHash: {type: String, unique: true, sparse: true},
  token: { type: String, default: null },
  createdEvents: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
  ],
  participatingEvents: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
  ]
});

module.exports = mongoose.model('User', UserSchema);
