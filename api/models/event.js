const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  title: { type: String, required: true },
  date: { type: Date },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  receipt: { type: Schema.Types.ObjectId, ref: 'Receipt' } // link receipts
});

module.exports = mongoose.model('Event', EventSchema);
