const Receipt = require('../models/receipt');
const Event = require('../models/event');

/**
 * calculateSplit
 * Adds `paid: false` to each owed entry
 */
function calculateSplit(receipt) {
  const tax = Number(receipt.tax || 0);
  const tip = Number(receipt.tip || 0);
  const total = Number(receipt.total);

  if (total <= 0) throw new Error('Total must be greater than 0.');

  let results = [];

  if (receipt.split_type === 'equal') {
    const users = receipt.split_details.map(d => d.user.toString());
    const amountPerUser = total / users.length;
    results = users.map(user => ({ user, amount: Number(amountPerUser.toFixed(2)), paid: false }));
  } else if (receipt.split_type === 'percent') {
    results = receipt.split_details.map(detail => ({
      user: detail.user.toString(),
      amount: Number((total * detail.percent / 100).toFixed(2)),
      paid: false
    }));
  } else if (receipt.split_type === 'item') {
    const map = {};
    receipt.items.forEach(item => {
      const share = Number(item.amount || 0) / item.shared_by.length;
      item.shared_by.forEach(userId => {
        userId = userId.toString();
        map[userId] = (map[userId] || 0) + share;
      });
    });

    const subtotalSum = Object.values(map).reduce((acc, val) => acc + val, 0);
    const totalWithExtras = subtotalSum + tax + tip;
    if (totalWithExtras <= 0) throw new Error('Total including items, tax, and tip must be > 0.');

    results = Object.entries(map).map(([userId, subtotal]) => {
      const ratio = subtotal / subtotalSum;
      const extraShare = ratio * (tax + tip);
      return { user: userId, amount: Number((subtotal + extraShare).toFixed(2)), paid: false };
    });
  }

  return results;
}

/**
 * uploadReceipt
 */
const uploadReceipt = async (req, res) => {
  try {
    const { eventId, tax = 0, tip = 0, items = [], split_type = 'equal', split_details = [], total } = req.body;
    if (!eventId) return res.status(400).json({ message: 'Event ID is required' });
    if (total === undefined || total <= 0) return res.status(400).json({ message: 'Total must be > 0' });
    if (split_type === 'item' && (!items || items.length === 0)) return res.status(400).json({ message: 'Items are required for itemized split.' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const receipt = new Receipt({ event: event._id, tax, tip, items: split_type === 'item' ? items : [], split_type, split_details, total });
    await receipt.save();

    receipt.owed = calculateSplit(receipt);
    await receipt.save();

    event.receipt = receipt._id;
    await event.save();

    res.status(201).json({ message: 'Receipt uploaded successfully', receipt });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * markPaid
 * Update a user's payment status for a receipt
 */
const markPaid = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { userId, paid } = req.body;

    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const receipt = await Receipt.findById(receiptId);
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

    const entry = receipt.owed.find(o => o.user.toString() === userId);
    if (!entry) return res.status(404).json({ message: 'User not found in owed list' });

    entry.paid = Boolean(paid);
    await receipt.save();

    res.json({ message: 'Payment status updated', owed: receipt.owed });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * updateReceipt
 */
const updateReceipt = async (req, res) => {
  try {
    const {receiptId} = req.params;
    const {tax, tip, items, split_type, split_details, total} = req.body;

    const receipt = await Receipt.findById(receiptId);
    if (!receipt) return res.status(404).json({message: 'Receipt not found'});

    if (split_type !== undefined) receipt.split_type = split_type;
    if (tax !== undefined) receipt.tax = tax;
    if (tip !== undefined) receipt.tip = tip;
    if (total !== undefined) {
      if (total <= 0)
        return res.status(400).json({message: 'Total must be greater than 0.'});
      receipt.total = total;
    }
    if (items !== undefined && receipt.split_type === 'item')
      receipt.items = items;
    if (split_details !== undefined) receipt.split_details = split_details;

    await receipt.save();

    receipt.owed = calculateSplit(receipt);
    await receipt.save();

    res.json({message: 'Receipt updated successfully', receipt});
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(400).json({message: error.message});
  }
};

/**
 * deleteReceipt
 */
const deleteReceipt = async (req, res) => {
  try {
    const {receiptId} = req.params;

    const receipt = await Receipt.findById(receiptId);
    if (!receipt) return res.status(404).json({message: 'Receipt not found'});

    const eventId = receipt.event;

    await Receipt.findByIdAndDelete(receiptId);
    await Event.findByIdAndUpdate(eventId, {receipt: null});

    res.json({message: 'Receipt deleted successfully'});
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({message: 'Server error', error: error.message});
  }
};

/**
 * getReceipt
 * Fetch a single receipt by ID for editing
 * Populates event date and user names only
 */
const getReceipt = async (req, res) => {
  try {
    const {receiptId} = req.params;

    const receipt =
        await Receipt.findById(receiptId)
            .populate('event', 'date')  // only include event.date
            .populate(
                'split_details.user',
                'name')  // only include user.name for split
            .populate(
                'items.shared_by', 'name');  // only include user.name for items

    if (!receipt) return res.status(404).json({message: 'Receipt not found'});

    res.json({receipt});
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({message: 'Server error', error: error.message});
  }
};

/**
 * getOwedList
 * Fetch only the owed amounts for a receipt
 * Populates user name for each entry in owed
 */
const getOwedList = async (req, res) => {
  try {
    const {receiptId} = req.params;

    const receipt = await Receipt.findById(receiptId).populate(
        'owed.user', 'name');  // populate user name only

    if (!receipt) return res.status(404).json({message: 'Receipt not found'});

    res.json({owed: receipt.owed});
  } catch (error) {
    console.error('Error fetching owed list:', error);
    res.status(500).json({message: 'Server error', error: error.message});
  }
};

module.exports = {
  uploadReceipt,
  updateReceipt,
  deleteReceipt,
  getReceipt,
  getOwedList,
  markPaid
};
