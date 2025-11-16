import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EventPage.css";

const API_BASE = "http://localhost:4000";

function EventPage() {
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  // Save event (creates the event only: title + date)
  const handleSaveEvent = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in. Missing token.");
      return;
    }

    if (!description.trim()) return alert("Please add a description.");
    if (!date.trim()) return alert("Please add a date (mm/dd/yyyy).");

    try {
      const eventPayload = {
        title: description,
        // backend EventSchema.date is a Date, so send ISO string
        date: date ? new Date(date).toISOString() : undefined,
      };

      const createRes = await fetch(`${API_BASE}/Event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventPayload),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        console.error("Create Event failed:", createRes.status, text);
        alert("Failed to save event.");
        return;
      }

      const created = await createRes.json();
      const eventId =
        created?.event?._id ||
        created?.event?.id ||
        created?._id ||
        created?.id;

      if (eventId) {
        // store so ReceiptPage can attach its receipt to this event
        localStorage.setItem("lastEventId", eventId);
      }

      alert("Event saved successfully!");
      // keep your existing behavior: go back to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend server.");
    }
  };

  // Discard
  const handleDiscard = () => {
    if (!window.confirm("Discard all changes?")) return;
    setDescription("");
    setDate("");
  };

  // go to receipt page (to upload receipt + add amount/participants/splits)
  const handleUploadReceiptClick = () => {
    navigate("/receipt");
  };

  return (
    <div className="event-container">
      <div className="container">
        <h2>Add Event</h2>

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
