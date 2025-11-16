import './EventPage.css';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:4000/Splitseez';

function EventPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);

  // Load event data if editing
  useEffect(() => {
    const editingEventId = localStorage.getItem('editingEventId');
    if (editingEventId) {
      setIsEditing(true);
      setEventId(editingEventId);
      loadEventData(editingEventId);
    }
  }, []);

  const loadEventData = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/Event/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const event = await res.json();
        setTitle(event.title || '');
        setDescription(event.description || '');
        if (event.date) {
          const dateObj = new Date(event.date);
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const year = dateObj.getFullYear();
          setDate(`${month}/${day}/${year}`);
        }
        // Load participants
        if (event.participants && event.participants.length > 0) {
          const participantData = event.participants.map(p => ({
            email: p.email,
            name: p.name,
            id: p._id
          }));
          setParticipants(participantData);
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Validate and add participant one at a time
  const handleAddParticipant = async () => {
    const email = participantEmail.trim().toLowerCase();
    
    if (!email) {
      alert('Please enter an email address.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    // Check for duplicates
    if (participants.some(p => p.email === email)) {
      alert('This participant is already added.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in.');
      return;
    }

    try {
      setValidatingEmail(true);
      
      // Validate single email with backend
      const res = await fetch(`${API_BASE}/Users/ValidateEmails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emails: [email] }),
      });

      if (!res.ok) {
        alert('Failed to validate email.');
        return;
      }

      const data = await res.json();

      if (data.invalidEmails && data.invalidEmails.length > 0) {
        alert(`User with email "${email}" not found. They must sign up first.`);
        return;
      }

      if (data.validUsers && data.validUsers.length > 0) {
        const user = data.validUsers[0];
        setParticipants([...participants, { email: user.email, name: user.name, id: user.id }]);
        setParticipantEmail('');
      }
    } catch (err) {
      console.error('Error validating participant:', err);
      alert('Could not validate participant email.');
    } finally {
      setValidatingEmail(false);
    }
  };

  // Remove participant
  const handleRemoveParticipant = (emailToRemove) => {
    setParticipants(participants.filter(p => p.email !== emailToRemove));
  };

  // Save event (creates or updates)
  const handleSaveEvent = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in. Missing token.');
      return;
    }

    if (!title.trim()) return alert('Please add a title.');
    if (!description.trim()) return alert('Please add a description.');
    if (!date.trim()) return alert('Please add a date (mm/dd/yyyy).');

    try {
      const eventPayload = {
        title,
        description,
        date: date ? new Date(date).toISOString() : undefined,
        participant_emails: participants.map(p => p.email),
      };

      let res;
      if (isEditing && eventId) {
        // Update existing event
        res = await fetch(`${API_BASE}/Event/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(eventPayload),
        });
      } else {
        // Create new event
        res = await fetch(`${API_BASE}/Event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(eventPayload),
        });
      }

      if (!res.ok) {
        // Try to parse the error message from backend
        try {
          const errorData = await res.json();
          alert(errorData.message || 'Failed to save event.');
        } catch {
          // If parsing fails, show generic error
          alert('Failed to save event.');
        }
        return;
      }

      const result = await res.json();
      const savedEventId =
        result?.event?._id ||
        result?.event?.id ||
        result?._id ||
        result?.id ||
        eventId;

      if (savedEventId) {
        // store so ReceiptPage can attach its receipt to this event
        localStorage.setItem('lastEventId', savedEventId);
      }

      // Clear editing state
      localStorage.removeItem('editingEventId');

      alert(isEditing ? 'Event updated successfully!' : 'Event saved successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Could not connect to backend server.');
    }
  };

  // Discard
const handleDiscard = () => {
  if (!window.confirm('Discard all changes?')) return;

  // Clear all form state
  setTitle('');
  setDescription('');
  setDate('');
  setParticipants([]);
  setParticipantEmail('');
  localStorage.removeItem('editingEventId');

  // Redirect to dashboard in all cases
  navigate('/dashboard');
};

  // go to receipt page (to upload receipt + add amount/participants/splits)
  const handleUploadReceiptClick = () => {
    if (eventId) {
      localStorage.setItem('lastEventId', eventId);
    }
    navigate('/receipt');
  };

  if (loading) {
    return (
      <div className="event-container">
        <div className="container">
          <div>Loading event data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-container">
      <div className="container">
        <h2>{isEditing ? 'Edit Event' : 'Add Event'}</h2>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            placeholder="Enter event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="form-group description-box">
          <label htmlFor="description">Add a Description:</label>
          <input
            type="text"
            id="description"
            placeholder="Enter a description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date */}
        <div className="form-group date-box">
          <label htmlFor="date">Date:</label>
          <input
            type="text"
            id="date"
            placeholder="mm/dd/yyyy"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Participants */}
        <div className="form-group participants-box">
          <label htmlFor="participant">Add Participant:</label>
          <div className="participant-input-group">
            <input
              type="email"
              id="participant"
              placeholder="Enter participant email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddParticipant();
                }
              }}
              disabled={validatingEmail}
            />
            <button 
              type="button" 
              className="add-participant-btn"
              onClick={handleAddParticipant}
              disabled={validatingEmail}
            >
              {validatingEmail ? 'Validating...' : 'Add'}
            </button>
          </div>

          {/* Participants List */}
          {participants.length > 0 && (
            <div className="participants-list">
              <div className="participants-header">
                <span className="participants-count">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </span>
              </div>
              {participants.map((participant, index) => (
                <div key={index} className="participant-item">
                  <div className="participant-info">
                    <span className="participant-name">{participant.name}</span>
                    <span className="participant-email">{participant.email}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-participant-btn"
                    onClick={() => handleRemoveParticipant(participant.email)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="button-group">
          <button id="saveBtn" onClick={handleSaveEvent}>
            Save Event
          </button>

          <button
            type="button"
            id="uploadReceiptBtn"
            onClick={handleUploadReceiptClick}
          >
            Upload Receipt
          </button>
          <button id="discardBtn" className="discard" onClick={handleDiscard}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventPage;