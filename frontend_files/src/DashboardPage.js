import './DashboardPage.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:4000/Splitseez';

function DashboardPage() {
  const navigate = useNavigate();

  const [createdEvents, setCreatedEvents] = useState([]);
  const [participatingEvents, setParticipatingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    const name = user.name || (user.email ? user.email.split('@')[0] : 'User');
    const id = user._id || user.id;

    setUserName(name);
    setUserId(id);

    try {
      setLoading(true);

      const [createdRes, partRes] = await Promise.all([
        fetch(`${API_BASE}/Users/CreatedEvents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/Users/ParticipatingEvents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (createdRes.ok) {
        const createdData = await createdRes.json();
        const eventsWithDetails = await Promise.all(
          (createdData.createdEvents || []).map(async (event) => {
            const res = await fetch(`${API_BASE}/Event/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return res.ok ? await res.json() : event;
          })
        );
        setCreatedEvents(eventsWithDetails);
      }

      if (partRes.ok) {
        const partData = await partRes.json();
        const eventsWithDetails = await Promise.all(
          (partData.participatingEvents || []).map(async (event) => {
            const res = await fetch(`${API_BASE}/Event/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return res.ok ? await res.json() : event;
          })
        );
        setParticipatingEvents(eventsWithDetails);
      }

    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      alert('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleEditEvent = (id) => {
    localStorage.setItem('editingEventId', id);
    navigate('/events');
  };

  const handleDeleteEvent = async (id, eventTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/Event/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to delete event.');
        return;
      }

      alert('Event deleted successfully!');
      fetchUserData();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Cannot connect to server.');
    }
  };

  const handleEditReceipt = (eventId) => {
    localStorage.setItem('lastEventId', eventId);
    navigate('/receipt');
  };

  const handleCreateEvent = () => {
    localStorage.removeItem('editingEventId');
    navigate('/events');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastEventId');
    localStorage.removeItem('editingEventId');
    localStorage.removeItem('editingReceiptId');
    alert('Logged out');
    navigate('/login');
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>SplitSeez</h1>
          <div className="header-right">
            <span className="welcome-text">Welcome {userName}!</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-main">

          {/* Created Events */}
          <section className="events-section">
            <div className="section-header">
              <h2>My Created Events</h2>
              <button className="create-btn" onClick={handleCreateEvent}>
                + Create New Event
              </button>
            </div>

            {createdEvents.length === 0 ? (
              <div className="empty-state">
                <p>No events created yet.</p>
              </div>
            ) : (
              <div className="events-grid">
                {createdEvents.map((event) => (
                  <div key={event._id} className="event-card created-event">
                    <div className="event-card-header">
                      <h3 className="event-title">{event.title}</h3>
                      <span className="edit-badge">Your Event</span>
                    </div>

                    {event.description && <p className="event-description">{event.description}</p>}

                    <div className="event-meta">
                      <span className="event-date">{formatDate(event.date)}</span>
                      {event.participants?.length > 0 && (
                        <span className="event-participants">
                          {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {event.receiptAttached && <div className="event-receipts">Receipt attached</div>}

                    <div className="event-actions">
                      <button className="action-btn edit-btn" onClick={() => handleEditEvent(event._id)}>
                        Edit Event
                      </button>

                      <button className="action-btn receipt-btn" onClick={() => handleEditReceipt(event._id)}>
                        {event.receiptAttached ? 'Edit Receipt' : 'Add Receipt'}
                      </button>

                      <button className="action-btn delete-btn" onClick={() => handleDeleteEvent(event._id, event.title)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Participating Events */}
          <section className="events-section">
            <div className="section-header">
              <h2>Events I'm Participating In</h2>
            </div>

            {participatingEvents.length === 0 ? (
              <div className="empty-state">
                <p>You're not participating in any events yet.</p>
              </div>
            ) : (
              <div className="events-grid">
                {participatingEvents.map((event) => (
                  <div key={event._id} className="event-card participating-event">
                    <div className="event-card-header">
                      <h3 className="event-title">{event.title}</h3>
                      {event.creator && (
                        <span className="creator-badge">
                          Created by {event.creator.name || event.creator.email}
                        </span>
                      )}
                    </div>

                    {event.description && <p className="event-description">{event.description}</p>}

                    <div className="event-meta">
                      <span className="event-date">{formatDate(event.date)}</span>
                    </div>

                    <div className="amount-owed">
                      <span className="owed-label">You Owe:</span>
                      <span className="owed-amount">${event.amountOwed?.toFixed(2) || '0.00'}</span>
                    </div>

                    {event.receiptAttached && <div className="event-receipts">💰 Receipt attached</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
