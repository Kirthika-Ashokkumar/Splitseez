import React, { useState } from "react";
import "./EventPage.css";

const API_BASE = "http://localhost:4000"; 

function EventPage() {
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState("");

  const [splitType, setSplitType] = useState("equal");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [percentages, setPercentages] = useState({});
  const [items, setItems] = useState([{ name: "", user: "", amount: "" }]);

  //receipt and tax/tip (optional)
  const [receiptFile, setReceiptFile] = useState(null);
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");

  // Add participant
  const handleAddParticipant = () => {
    const name = newParticipant.trim();
    if (!name) return;
    if (participants.includes(name)) {
      alert("Participant already added.");
      return;
    }
    setParticipants([...participants, name]);
    setNewParticipant("");
  };

  // Percentage & Item handlers
  const handlePercentageChange = (participant, value) => {
    setPercentages({ ...percentages, [participant]: value });
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", user: "", amount: "" }]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Optional receipt file change
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    setReceiptFile(file || null);
  };

  // Save event(POST /Event (JWT)). If receipt selected, POST /Receipt (multipart + JWT)
  const handleSaveEvent = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in. Missing token.");
      return;
    }

    // minimal checks
    if (!description.trim()) return alert("Please add a description.");
    if (!date.trim()) return alert("Please add a date (mm/dd/yyyy).");
    if (participants.length === 0) return alert("Please add at least one participant.");

    try {
      //Create the event
      const eventPayload = {
        title: description,
        date: date ? new Date(date).toISOString() : undefined,
        //map names/emails with userIds
        participants,
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
      const eventId = created?.event?._id || created?.event?.id || created?._id || created?.id;

      //upload receipt image (optional)
      if (receiptFile && eventId) {
        const formData = new FormData();
        formData.append("receiptImage", receiptFile);      
        formData.append("event", eventId);                  
        if (tax !== "") formData.append("tax", String(tax));
        if (tip !== "") formData.append("tip", String(tip));

        const receiptRes = await fetch(`${API_BASE}/Receipt`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, 
          },
          body: formData,
        });

        if (!receiptRes.ok) {
          const text = await receiptRes.text();
          console.error("Receipt upload failed:", receiptRes.status, text);
          alert("Event saved, but receipt upload failed.");
        } else {
          alert("Event and receipt uploaded successfully!");
        }
      } else {
        // No receipt selected
        alert("Event saved successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend server.");
    }
  };

  // Discard event
  const handleDiscard = () => {
    if (!window.confirm("Discard all changes?")) return;
    setDescription("");
    setDate("");
    setAmount(0);
    setParticipants([]);
    setNewParticipant("");
    setPercentages({});
    setItems([{ name: "", user: "", amount: "" }]);
    setReceiptFile(null);
    setTax("");
    setTip("");
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

        {/* Split Type*/}
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

        {/* Equal Split preview */}
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

        {/* Percentage inputs*/}
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
                        (Number(percentages[p]) / 100) * Number(amount || 0)
                      ).toFixed(2)}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Itemized inputs*/}
        {splitType === "itemize" && (
          <div className="split-section">
            <h4>Itemized Split:</h4>
            {items.map((item, index) => (
              <div key={index} className="item-entry">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, "name", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="User"
                  value={item.user}
                  onChange={(e) => handleItemChange(index, "user", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Amount ($)"
                  value={item.amount}
                  onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                />
              </div>
            ))}
            <button type="button" onClick={handleAddItem}>
              + Add Item
            </button>
          </div>
        )}

        {/* NEW: Optional Receipt Upload + Tax/Tip */}
        <div className="form-group">
          <label>Receipt (optional):</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tax">Tax (optional):</label>
          <input
            type="number"
            id="tax"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tip">Tip (optional):</label>
          <input
            type="number"
            id="tip"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          />
        </div>

        {/* Actions */}
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
