import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();

  const handleCreateEvent = () => {
    navigate("/events"); // navigates to EventPage
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome to the dashboard. More features coming soon!</p>

      <button className="create-btn" onClick={handleCreateEvent}>
        Create Event
      </button>
    </div>
  );
}

export default DashboardPage;