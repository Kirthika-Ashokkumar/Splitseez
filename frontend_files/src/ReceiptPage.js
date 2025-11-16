// src/ReceiptPage.js
import React, { useState, useMemo } from "react";
import "./EventPage.css"; // reuse styling

const API_BASE = "http://localhost:4000";

function ReceiptPage() {
  const [receiptFile, setReceiptFile] = useState(null);
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");

  // total amount (optional override)
  const [amount, setAmount] = useState("");

  // participants for splitting (emails)
  const [participantEmails, setParticipantEmails] = useState("");
  const [splitType, setSplitType] = useState("itemize"); // default

  // manual items
  // sharedByMap: { [email]: true } for included participants
  const [items, setItems] = useState([
    { name: "", amount: "", sharedByMap: {} },
  ]);

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    setReceiptFile(file || null);
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", amount: "", sharedByMap: {} }]);
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // side-by-side item participant selection
  const handleItemParticipantSelection = (itemIndex, email, includeOrExclude) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const map = { ...(item.sharedByMap || {}) };

      if (includeOrExclude === "include") {
        map[email] = true;
      } else {
        delete map[email];
      }

      item.sharedByMap = map;
      updated[itemIndex] = item;
      return updated;
    });
  };

  // compute total from items + tax + tip
  const itemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
    [items]
  );

  const computedFromItems = useMemo(
    () => itemsTotal + (Number(tax) || 0) + (Number(tip) || 0),
    [itemsTotal, tax, tip]
  );

  // Effective total used for splits
  const effectiveTotal = amount ? Number(amount) : computedFromItems;

  // parsed participants as array of emails
  const splitParticipants = useMemo(
    () =>
      participantEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0),
    [participantEmails]
  );

  // percentage per participant
  const [percentages, setPercentages] = useState({});

  const handlePercentageChange = (email, value) => {
    setPercentages((prev) => ({ ...prev, [email]: value }));
  };

  // 🔹 NEW: final per-participant totals for ITEMIZE split
  const itemizedTotals = useMemo(() => {
    const totals = {};
    splitParticipants.forEach((email) => {
      totals[email] = 0;
    });

    items.forEach((item) => {
      const price = Number(item.amount) || 0;
      if (!price) return;

      const included = splitParticipants.filter(
        (email) => item.sharedByMap?.[email]
      );
      const count = included.length;
      if (count === 0) return;

      const share = price / count;
      included.forEach((email) => {
        totals[email] += share;
      });
    });

    return totals;
  }, [items, splitParticipants]);

  const handleSubmitReceipt = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in. Missing token.");
      return;
    }

    const eventId = localStorage.getItem("lastEventId");
    if (!eventId) {
      alert("No event found. Please create an event first.");
      return;
    }

    if (!receiptFile && items.every((i) => !i.name || !i.amount)) {
      alert("Please upload a file or add at least one item.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("event", eventId); // event ObjectId

      if (receiptFile) {
        formData.append("receiptImage", receiptFile);
      }

      if (tax !== "") formData.append("tax", String(tax));
      if (tip !== "") formData.append("tip", String(tip));
      formData.append("totalAmount", String(effectiveTotal));
      formData.append("splitType", splitType);
      formData.append(
        "splitParticipants",
        JSON.stringify(splitParticipants)
      );

      // send items as JSON; convert sharedByMap -> array
      const itemsPayload = items
        .filter((i) => i.name && i.amount)
        .map((i) => ({
          name: i.name,
          amount: Number(i.amount),
          shared_by: Object.keys(i.sharedByMap || {}).filter(
            (email) => i.sharedByMap[email]
          ),
        }));

      formData.append("items", JSON.stringify(itemsPayload));

      const res = await fetch(`${API_BASE}/Receipt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Receipt upload failed:", res.status, text);
        alert("Failed to upload receipt.");
        return;
      }

      alert("Receipt saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Could not connect to backend server.");
    }
  };

  return (
    <div className="event-container">
      <div className="container">
        <h2>Upload Receipt</h2>

        {/* Total amount (optional override) */}
        <div className="form-group">
          <label htmlFor="amount">Total Amount ($) (optional):</label>
          <input
            type="number"
            id="amount"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <small>
            If left empty, total = items + tax + tip.
          </small>
        </div>

        {/* Choose File */}
        <div className="form-group">
          <label>Receipt Image (optional):</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleReceiptChange}
          />
        </div>

        {/* Tax / Tip */}
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

        {/* Participants for splitting */}
        <div className="form-group">
          <label>Participants for Split (emails, comma-separated):</label>
          <input
            type="text"
            placeholder="alice@example.com, bob@example.com"
            value={participantEmails}
            onChange={(e) => setParticipantEmails(e.target.value)}
          />
        </div>

        {/* Split type selector */}
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
        {splitType === "equal" && splitParticipants.length > 0 && (
          <div className="split-section">
            <h4>Split Equally (Preview):</h4>
            <p>Effective Total: ${effectiveTotal.toFixed(2)}</p>
            {splitParticipants.map((email, i) => (
              <p key={email + i}>
                {email} owes $
                {(effectiveTotal / splitParticipants.length || 0).toFixed(2)}
              </p>
            ))}
          </div>
        )}

        {/* Percentage Split preview */}
        {splitType === "percentage" && splitParticipants.length > 0 && (
          <div className="split-section">
            <h4>Split by Percentage (Preview):</h4>
            <p>Effective Total: ${effectiveTotal.toFixed(2)}</p>
            {splitParticipants.map((email, i) => (
              <div key={email + i} className="form-group">
                <label>{email} (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={percentages[email] || ""}
                  onChange={(e) =>
                    handlePercentageChange(email, e.target.value)
                  }
                />
                <span>
                  {percentages[email]
                    ? ` = $${(
                        (Number(percentages[email]) / 100) *
                        effectiveTotal
                      ).toFixed(2)}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Itemized Items (manual) + side-by-side participant dropdowns */}
        {splitType === "itemize" && (
          <div className="split-section">
            <h4>Itemized Items (Manual):</h4>
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
                  type="number"
                  placeholder="Amount ($)"
                  value={item.amount}
                  onChange={(e) =>
                    handleItemChange(index, "amount", e.target.value)
                  }
                />

                {/* row of dropdowns, one for each participant */}
                {splitParticipants.length > 0 && (
                  <div className="item-participant-row">
                    {splitParticipants.map((email, i) => {
                      const included = item.sharedByMap?.[email]
                        ? "include"
                        : "exclude";
                      return (
                        <div
                          key={email + i}
                          className="item-participant-cell"
                        >
                          <label>{email}</label>
                          <select
                            value={included}
                            onChange={(e) =>
                              handleItemParticipantSelection(
                                index,
                                email,
                                e.target.value
                              )
                            }
                          >
                            <option value="exclude">Exclude</option>
                            <option value="include">Include</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddItem}>
              + Add Item
            </button>

            {/* 🔹 NEW: final per-participant summary for itemized split */}
            {splitParticipants.length > 0 && (
              <div className="itemized-summary">
                <h4>Final Split by Participant:</h4>
                {splitParticipants.map((email) => (
                  <p key={email}>
                    {email} owes $
                    {(itemizedTotals[email] || 0).toFixed(2)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total info */}
        <p style={{ marginTop: "10px", fontWeight: "bold" }}>
          Items Total: ${itemsTotal.toFixed(2)} | Effective Total Used for Split: $
          {effectiveTotal.toFixed(2)}
        </p>

        <div className="button-group">
          <button id="saveReceiptBtn" onClick={handleSubmitReceipt}>
            Save Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptPage;
