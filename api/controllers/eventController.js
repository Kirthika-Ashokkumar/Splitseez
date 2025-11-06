const Event = require('../models/event');
const User = require('../models/user');

// Create Event
const createEvent = async (req, res) => {
  try {
    const creator = req.user; // comes from auth middleware
    const { title, date, participant_emails } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let participantIds = [];
    if (participant_emails && participant_emails.length > 0) {
      const participants = await User.find({ email: { $in: participant_emails } });
      const foundEmails = participants.map(u => u.email);
      const missingEmails = participant_emails.filter(e => !foundEmails.includes(e));

      if (missingEmails.length > 0) {
        return res.status(400).json({
          message: `These participants were not found: ${missingEmails.join(', ')}`
        });
      }

      participantIds = participants.map(u => u._id);
    }

    const newEvent = new Event({
      title,
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

// Get Event
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate('creator', 'name email')
      .populate('participants', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json(event);
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
    const { title, date, participant_emails } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to edit this event' });
    }

    if (title) event.title = title;
    if (date) event.date = date;

    if (participant_emails && participant_emails.length > 0) {
      const participants = await User.find({ email: { $in: participant_emails } });
      const newParticipantIds = participants.map(u => u._id);

      // Update participant lists in User documents
      await User.updateMany(
        { participatingEvents: event._id },
        { $pull: { participatingEvents: event._id } }
      );

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
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(id);

    // Remove event from all users’ lists
    await User.findByIdAndUpdate(user._id, { $pull: { createdEvents: id } });
    await User.updateMany({ participatingEvents: id }, { $pull: { participatingEvents: id } });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join Event (for participants)
const joinEvent = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params; // event ID

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // If already a participant
    if (event.participants.includes(user._id)) {
      return res.status(400).json({ message: 'You already joined this event' });
    }

    // Add user to event participants
    event.participants.push(user._id);
    await event.save();

    // Add event to user’s participatingEvents
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { participatingEvents: event._id }
    });

    res.status(200).json({ message: 'Successfully joined the event', event });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvent,
  editEvent,
  deleteEvent,
  joinEvent
};
