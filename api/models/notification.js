const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
      },
      type: {
        type: String,
        required: [true, 'Notification type is required'],
        enum: [
          'expense_added', 'payment_received', 'payment_reminder',
          'event_invite', 'event_update', 'settlement', 'other'
        ],
        default: 'other'
      },
      title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true
      },
      message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true
      },
      eventId:
          {type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null},
      receiptId:
          {type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null},
      relatedUserId:
          {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
      read: {type: Boolean, default: false, index: true},
      actionUrl: {type: String, default: null},
      metadata: {type: mongoose.Schema.Types.Mixed, default: {}}
    },
    {timestamps: true});

// Index for efficient queries
notificationSchema.index({userId: 1, createdAt: -1});
notificationSchema.index({userId: 1, read: 1});

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return await this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);