import './NotificationPage.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:4000/Splitseez';

function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  // Form state
  const [formData, setFormData] = useState({
    recipientEmail: '',
    type: 'other',
    title: '',
    message: '',
    eventId: ''
  });

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    const id = user._id || user.id;
    setUserId(id);

    try {
      setLoading(true);
      const queryParam = filter === 'unread' ? '?unreadOnly=true' : '';
      const res = await fetch(`${API_BASE}/notifications/${id}${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      alert('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [navigate, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/notifications/${userId}/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('All notifications marked as read!');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm('Delete this notification?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Notification deleted!');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!formData.recipientEmail || !formData.title || !formData.message) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // First, find user by email
      const userRes = await fetch(`${API_BASE}/Users/email/${formData.recipientEmail}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) {
        alert('User not found with that email');
        return;
      }

      const userData = await userRes.json();
      const recipientId = userData._id || userData.id;

      // Create notification
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: recipientId,
          type: formData.type,
          title: formData.title,
          message: formData.message,
          eventId: formData.eventId || null,
          relatedUserId: userId
        }),
      });

      if (res.ok) {
        alert('Notification sent successfully!');
        setShowCreateForm(false);
        setFormData({
          recipientEmail: '',
          type: 'other',
          title: '',
          message: '',
          eventId: ''
        });
        fetchNotifications();
      } else {
        alert('Failed to send notification');
      }
    } catch (err) {
      console.error('Error creating notification:', err);
      alert('Error sending notification');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      expense_added: '💰',
      payment_received: '✅',
      payment_reminder: '⏰',
      event_invite: '🎉',
      event_update: '📝',
      settlement: '💵',
      other: '📬'
    };
    return icons[type] || '📬';
  };

  if (loading) {
    return (
      <div className="event-shell">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="event-shell">
      <header className="event-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Notifications</h1>
        </div>
      </header>

      <div className="event-container">
        <div className="event-form-wrapper">

          {/* Actions Bar */}
          <div className="notification-actions-bar">
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
            </div>

            <div className="action-buttons">
              <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                Mark All Read
              </button>
              <button className="send-notif-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? 'Cancel' : '+ Send Notification'}
              </button>
            </div>
          </div>

          {/* Create Notification Form */}
          {showCreateForm && (
            <div className="notification-create-form">
              <h2>Send New Notification</h2>
              <form onSubmit={handleCreateNotification}>
                <div className="form-group">
                  <label>Recipient Email *</label>
                  <input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="other">General</option>
                    <option value="expense_added">Expense Added</option>
                    <option value="payment_received">Payment Received</option>
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="event_invite">Event Invite</option>
                    <option value="event_update">Event Update</option>
                    <option value="settlement">Settlement</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Notification title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Notification message"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Event ID (optional)</label>
                  <input
                    type="text"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    placeholder="Related event ID"
                  />
                </div>

                <button type="submit" className="submit-btn">
                  Send Notification
                </button>
              </form>
            </div>
          )}

          {/* Notifications List */}
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                >
                  <div className="notif-icon">{getNotificationIcon(notif.type)}</div>
                  
                  <div className="notif-content">
                    <div className="notif-header">
                      <h3>{notif.title}</h3>
                      <span className="notif-time">{formatDate(notif.createdAt)}</span>
                    </div>
                    <p className="notif-message">{notif.message}</p>
                    
                    {notif.relatedUserId && (
                      <span className="notif-from">
                        From: {notif.relatedUserId.name || notif.relatedUserId.email}
                      </span>
                    )}
                  </div>

                  <div className="notif-actions">
                    {!notif.read && (
                      <button 
                        className="read-btn"
                        onClick={() => handleMarkAsRead(notif._id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteNotification(notif._id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default NotificationPage;