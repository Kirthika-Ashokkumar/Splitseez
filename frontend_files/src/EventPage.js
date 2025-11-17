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
  const [participantsChanged, setParticipantsChanged] = useState(false);
  const [userEmail, setUserEmail] = useState(''); // Logged-in user's email

  useEffect(() => {
    const editingEventId = localStorage.getItem('editingEventId');
    const token = localStorage.getItem('token');

    if (token) {
      // Decode email from JWT (or fetch user profile if needed)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || '');
      } catch (err) {
        console.warn('Unable to decode token email:', err);
      }
    }

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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const event = await res.json();
        setTitle(event.title || '');
        setDescription(event.description || '');
        if (event.date) {
          const dateObj = new Date(event.date);
          setDate(`${String(dateObj.getMonth() + 1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}/${dateObj.getFullYear()}`);
        }
        if (event.participants?.length) {
          setParticipants(event.participants.map(p => ({ email: p.email, name: p.name, id: p._id })));
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save event backend helper
  const saveEventBackend = async (updatedParticipants = participants) => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = {
      title,
      description,
      date: date ? new Date(date).toISOString() : undefined,
      participant_emails: updatedParticipants.map(p => p.email),
    };

    try {
      let res;
      if (isEditing && eventId) {
        res = await fetch(`${API_BASE}/Event/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/Event`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const result = await res.json();
        const savedId = result?.event?._id || result?.event?.id || result?._id || result?.id || eventId;
        if (savedId) {
          setEventId(savedId);
          localStorage.setItem('lastEventId', savedId);
        }
        return savedId;
      } else {
        console.error('Failed to save event');
        return null;
      }
    } catch (err) {
      console.error('Error saving event:', err);
      return null;
    }
  };

  const handleAddParticipant = async () => {
    const email = participantEmail.trim().toLowerCase();
    if (!email) return alert('Please enter an email address.');
    if (email === userEmail.toLowerCase()) return alert('You cannot add yourself as a participant.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return alert('Please enter a valid email address.');
    if (participants.some(p => p.email === email)) return alert('This participant is already added.');

    const token = localStorage.getItem('token');
    if (!token) return alert('You must be logged in.');

    try {
      setValidatingEmail(true);
      const res = await fetch(`${API_BASE}/Users/ValidateEmails`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ emails: [email] }),
      });
      if (!res.ok) return alert('Failed to validate email.');

      const data = await res.json();
      if (data.invalidEmails?.length) return alert(`User with email "${email}" not found. They must sign up first.`);

      if (data.validUsers?.length) {
        const user = data.validUsers[0];
        const updatedParticipants = [...participants, { email: user.email, name: user.name, id: user.id }];
        setParticipants(updatedParticipants);
        setParticipantEmail('');
        setParticipantsChanged(true);
      }
    } catch (err) {
      console.error('Error validating participant:', err);
      alert('Could not validate participant email.');
    } finally {
      setValidatingEmail(false);
    }
  };

  const handleRemoveParticipant = (emailToRemove) => {
    setParticipants(prev => {
      const updated = prev.filter(p => p.email !== emailToRemove);
      setParticipantsChanged(true);
      return updated;
    });
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) return alert('Please add a title.');
    if (!description.trim()) return alert('Please add a description.');
    if (!date.trim()) return alert('Please add a date (mm/dd/yyyy).');

    const savedId = await saveEventBackend();
    if (!savedId) return alert('Failed to save event.');

    alert(isEditing ? 'Event updated successfully!' : 'Event saved successfully!');

    // Redirect to receipt only if participants changed
    if (participantsChanged) {
      setParticipantsChanged(false);
      localStorage.setItem('fromEventPage', 'true'); // flag for receipt page
      navigate('/receipt');
    } else {
      navigate('/dashboard');
    }

    localStorage.removeItem('editingEventId');
  };

  const handleDiscard = () => {
    if (participantsChanged || !isEditing) {
      if (!window.confirm('Discard all changes?')) return;
    }

    setTitle(''); setDescription(''); setDate(''); setParticipants([]); setParticipantEmail('');
    localStorage.removeItem('editingEventId');
    navigate('/dashboard');
  };

  const handleUploadReceiptClick = () => {
    if (!eventId) return alert("Please save the event first before uploading a receipt.");
    
    // Flag for ReceiptPage
    localStorage.setItem("fromEventPage", "true");
    localStorage.setItem("lastEventId", eventId);
    navigate("/receipt");
  };

  if (loading) return <div className="event-container"><div className="container">Loading event data...</div></div>;

  return (
    <div className="event-container">
      <div className="container">
        <h2>{isEditing ? 'Edit Event' : 'Add Event'}</h2>

        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input type="text" id="title" placeholder="Enter event title" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="form-group description-box">
          <label htmlFor="description">Add a Description:</label>
          <input type="text" id="description" placeholder="Enter a description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-group date-box">
          <label htmlFor="date">Date:</label>
          <input type="text" id="date" placeholder="mm/dd/yyyy" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group participants-box">
          <label htmlFor="participant">Add Participant:</label>
          <div className="participant-input-group">
            <input type="email" id="participant" placeholder="Enter participant email" value={participantEmail} onChange={e => setParticipantEmail(e.target.value)} onKeyPress={e => e.key==='Enter'&&(e.preventDefault(), handleAddParticipant())} disabled={validatingEmail} />
            <button type="button" className="add-participant-btn" onClick={handleAddParticipant} disabled={validatingEmail}>{validatingEmail ? 'Validating...' : 'Add'}</button>
          </div>

          {participants.length > 0 && (
            <div className="participants-list">
              <div className="participants-header">
                <span className="participants-count">{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
              </div>
              {participants.map((p,i) => (
                <div key={i} className="participant-item">
                  <div className="participant-info">
                    <span className="participant-name">{p.name}</span>
                    <span className="participant-email">{p.email}</span>
                  </div>
                  <button type="button" className="remove-participant-btn" onClick={() => handleRemoveParticipant(p.email)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="button-group">
          <button id="saveBtn" onClick={handleSaveEvent}>Save Event</button>
          <button type="button" id="uploadReceiptBtn" onClick={handleUploadReceiptClick}>Upload Receipt</button>
          <button id="discardBtn" className="discard" onClick={handleDiscard}>Discard</button>
        </div>
      </div>
    </div>
  );
}

export default EventPage;
