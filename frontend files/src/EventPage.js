import React, { useState } from "react";
import "./EventPage.css";

function EventPage() {
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [percentages, setPercentages] = useState({});
  const [items, setItems] = useState([{ name: "", user: "", amount: "" }]);

  // Add participant
  const handleAddParticipant = () => {
    if (newParticipant.trim() !== "") {
      setParticipants([...participants, newParticipant]);
      setNewParticipant("");
      //setShowDropdown(true);
    }
  };

  // Handle percentage and item changes
  const handlePercentageChange = (participant, value) => {
    setPercentages({ ...percentages, [participant]: value });
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", user: "", amount: "" }]);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

 // Save event
const handleSaveEvent = async () => {
  const eventData = {
    description,
    date,
    amount,
    participants,
    splitType,
    percentages,
    items,
  };

  try {
    const response = await fetch("http://localhost:5000/Events/Add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });

    if (response.ok) alert("Event saved successfully!");
    else alert("Failed to save event.");
  } catch (err) {
    console.error(err);
    alert("Could not connect to backend server.");
  }
};

// Discard event
const handleDiscard = () => {
  setDescription("");
  setDate("");
  setAmount(0);
  setParticipants([]);
  setNewParticipant("");
  setPercentages({});
  setItems([{ name: "", user: "", amount: "" }]);
  alert("Event discarded!");
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

        {/* Amount */}
        <div className="form-group">
          <label htmlFor="amount">Total Amount ($):</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Participants */}
        <div className="form-group participants">
  <label htmlFor="participants">Add Participants:</label>
  <input
    type="text"
    id="participants"
    placeholder="Enter participant name"
    value={newParticipant}
    onChange={(e) => setNewParticipant(e.target.value)}
  />
  <button type="button" onClick={handleAddParticipant}>
    Add
  </button>
</div>

{/* Dropdown for participants */}
{participants.length > 0 && (
  <div className="participant-dropdown">
    <label>Participants List:</label>
    <select id="participantDropdown">
      {participants.map((p, i) => (
        <option key={i}>{p}</option>
      ))}
    </select>
  </div>
)}

        

        {/* Split selection */}
        <div className="form-group">
          <label htmlFor="splitType">Split Type:</label>
          <select
            id="splitType"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
          >
            <option value="equal">Split Equally</option>
            <option value="percentage">Split by Percentage</option>
            <option value="itemize">Itemize</option>
          </select>
        </div>

        {/* Split Equally */}
        {splitType === "equal" && participants.length > 0 && (
          <div className="split-section">
            <h4>Split Equally:</h4>
            {participants.map((p, i) => (
              <p key={i}>
                {p} owes ${(amount / participants.length || 0).toFixed(2)}
              </p>
            ))}
          </div>
        )}

        {/* Split by Percentage */}
        {splitType === "percentage" && participants.length > 0 && (
          <div className="split-section">
            <h4>Split by Percentage:</h4>
            {participants.map((p, i) => (
              <div key={i} className="form-group">
                <label>{p} (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={percentages[p] || ""}
                  onChange={(e) => handlePercentageChange(p, e.target.value)}
                />
                <span>
                  {percentages[p]
                    ? ` = $${(
                        (Number(percentages[p]) / 100) *
                        amount
                      ).toFixed(2)}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Itemized Split */}
        {splitType === "itemize" && (
          <div className="split-section">
            <h4>Itemized Split:</h4>
            {items.map((item, index) => (
              <div key={index} className="item-entry">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    handleItemChange(index, "name", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="User"
                  value={item.user}
                  onChange={(e) =>
                    handleItemChange(index, "user", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={item.amount}
                  onChange={(e) =>
                    handleItemChange(index, "amount", e.target.value)
                  }
                />
              </div>
            ))}
            <button type="button" onClick={handleAddItem}>
              + Add Item
            </button>
          </div>
        )}

        {/* Save Button */}
<div className="button-group">
  <button id="saveBtn" onClick={handleSaveEvent}>
    Save
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



