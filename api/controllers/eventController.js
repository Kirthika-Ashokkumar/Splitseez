const Event = require('../models/event');
const User = require('../models/user');

// Helper function to validate date
const isValidDate = (dateString) => {
  if (!dateString) return true; // Allow empty dates
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Create Event
const createEvent = async (req, res) => {
  try {
    const creator = req.user;  // from auth middleware
    const { title, description, date, participant_emails } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format. Please provide a valid date.' });
    }

    let participantIds = [];
    if (participant_emails?.length > 0) {
      const participants = await User.find({ email: { $in: participant_emails } });
      const foundEmails = participants.map(u => u.email);
      const missingEmails = participant_emails.filter(e => !foundEmails.includes(e));

      if (missingEmails.length > 0) {
        return res.status(400).json({ message: `These participants were not found: ${missingEmails.join(', ')}` });
      }

      participantIds = participants.map(u => u._id);
    }

    const newEvent = new Event({
      title,
      description,
      date,
      creator: creator._id,
      participants: participantIds
    });

    await newEvent.save();

    // Update creator and participants
    await User.findByIdAndUpdate(creator._id, { $addToSet: { createdEvents: newEvent._id } });
    if (participantIds.length > 0) {
      await User.updateMany(
        { _id: { $in: participantIds } },
        { $addToSet: { participatingEvents: newEvent._id } }
      );
    }

    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Event (with amountOwed for requesting user)
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const event = await Event.findById(id)
      .populate('creator', 'name email')
      .populate('participants', 'name email')
      .populate({
        path: 'receipt',
        populate: { path: 'owed.user', select: 'name email' }
      });

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Compute amount owed for this user
    let amountOwed = 0;
    if (event.receipt?.owed) {
      const entry = event.receipt.owed.find(o => {
        const uid = o.user?._id?.toString() || o.user?.toString();
        return uid === userId;
      });
      if (entry?.amount) amountOwed = Number(entry.amount);
    }

    const responseEvent = {
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      creator: event.creator,
      participants: event.participants,
      receipt: event.receipt,
      amountOwed,
      receiptAttached: !!event.receipt
    };

    res.status(200).json(responseEvent);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit Event (only creator)
const editEvent = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, description, date, participant_emails } = req.body;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to edit this event' });
    }

    if (title) event.title = title;
    if (description !== undefined) event.description = description;

    if (date !== undefined) {
      if (date && !isValidDate(date)) {
        return res.status(400).json({ message: 'Invalid date format. Please provide a valid date.' });
      }
      event.date = date;
    }

    if (participant_emails?.length > 0) {
      const participants = await User.find({ email: { $in: participant_emails } });
      const newParticipantIds = participants.map(u => u._id.toString());

      const oldParticipantIds = event.participants.map(id => id.toString());
      const removedParticipantIds = oldParticipantIds.filter(id => !newParticipantIds.includes(id));

      if (removedParticipantIds.length > 0) {
        await User.updateMany(
          { _id: { $in: removedParticipantIds } },
          { $pull: { participatingEvents: event._id } }
        );
      }

      await User.updateMany(
        { _id: { $in: newParticipantIds } },
        { $addToSet: { participatingEvents: event._id } }
      );

      event.participants = newParticipantIds;
    }

    await event.save();
    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Error editing event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Event (only creator)
const deleteEvent = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(id);

    await User.findByIdAndUpdate(user._id, { $pull: { createdEvents: id } });
    await User.updateMany(
      { participatingEvents: id },
      { $pull: { participatingEvents: id } }
    );

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvent,
  editEvent,
  deleteEvent
};
