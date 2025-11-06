const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReceiptSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  tax: { type: Number, default: 0 },
  tip: { type: Number, default: 0 },
  total: { type: Number, default: 0 }, 
  items: [
    {
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      shared_by: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    }
  ],
  created_at: { type: Date, default: Date.now }
});

// Pre-save middleware to calculate total
ReceiptSchema.pre('save', function(next) {
  const itemsTotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  this.total = itemsTotal + (this.tax || 0) + (this.tip || 0);
  next();
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
