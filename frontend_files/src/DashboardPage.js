import { useNavigate } from "react-router-dom";
//import { useEffect, useState } from "react";
import "./DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");   // remove JWT
    localStorage.removeItem("lastEventId"); // optional cleanup
    alert("You have been logged out.");
    navigate("/login");
  };

  const handleCreateEvent = () => navigate("/events");

  return (
    <div className="dashboard-shell">
      
      {/* 🔹 Logout button top-right */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>

      <header className="dash-header">
        <h1>Dashboard</h1>
        <p>Welcome! Manage your events and create new ones.</p>
      </header>

      <div className="dashboard-container">
        
        {/* Left tile: created events */}
        <section className="events-tile card">
          <h2>Created Events</h2>
          {events.length === 0 ? (
            <p className="empty">No events yet. Create your first one →</p>
          ) : (
            <ul className="event-list">
              {events.map((e) => (
                <li key={e.id} className="event-item">
                  <div className="event-name">{e.name}</div>
                  {e.date && <div className="event-date">{e.date}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right pane */}
        <aside className="right-pane">
          <button className="create-btn" onClick={handleCreateEvent}>
            Create Event
          </button>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;
