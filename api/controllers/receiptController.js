const Receipt = require('../models/receipt');
const Event = require('../models/event');

const uploadReceipt = async (req, res) => {
  try {
    const { eventId, tax, tip, items } = req.body;

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Event ID and items are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const receipt = new Receipt({
      event: event._id,
      tax: tax || 0,
      tip: tip || 0,
      items
    });

    await receipt.save();

    // Link receipt to event
    event.receipts.push(receipt._id);
    await event.save();

    res.status(201).json({ message: 'Receipt uploaded successfully', receipt });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { uploadReceipt };

