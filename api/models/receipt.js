const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReceiptSchema = new Schema({
  // Reference to the event this receipt belongs to
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },

  // Tax applied to the receipt (user-provided)
  tax: { type: Number, default: 0 },

  // Tip applied to the receipt (user-provided)
  tip: { type: Number, default: 0 },

  // Total amount of the receipt (user-provided)
  // For itemized split, must match sum(items) + tax + tip
  total: { type: Number, required: true },

  // Split type determines how the total is divided among users
  // 'equal' - split total equally
  // 'percent' - split total based on percent values in split_details
  // 'item' - split by individual items
  split_type: { type: String, enum: ['equal', 'percent', 'item'], default: 'equal' },

  // Items in the receipt (only required for itemized split)
  items: [{
    // Name/description of the item
    name: { type: String },
    // Amount of the item
    amount: { type: Number },
    // Array of user IDs who share this item
    shared_by: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],

  // Details for splitting the receipt
  split_details: [{
    // User who owes part of the receipt
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Percent of total for 'percent' split type
    percent: { type: Number }
  }],

  // Calculated amount each user owes
  owed: [
    {
      // Reference to user who owes money
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      // Amount owed by this user
      amount: { type: Number },
      // Whether this user has paid their share
      paid: { type: Boolean, default: false }
    }
  ],

  // Timestamp when receipt was created
  created_at: { type: Date, default: Date.now }
});

// -------------------------
// Pre-save hook
// -------------------------
// For itemized split, ensure that the user-provided total matches
// sum of all item amounts + tax + tip. Also ensures total > 0.
ReceiptSchema.pre('save', function(next) {
  if (this.split_type === 'item') {
    const itemsTotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const calculatedTotal = itemsTotal + (this.tax || 0) + (this.tip || 0);

    if (Math.abs(calculatedTotal - this.total) > 0.01) {
      return next(new Error(`Total mismatch: provided total (${this.total}) does not match calculated total from items + tax + tip (${calculatedTotal}).`));
    }
  }

  if (this.total <= 0) {
    return next(new Error(
      'Total must be greater than 0. Cannot split a zero-cost receipt.'
    ));
  }

  next();
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
