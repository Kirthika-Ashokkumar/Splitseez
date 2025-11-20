import "./ReceiptPage.css";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from 'tesseract.js';

const API_BASE = "http://localhost:4000/Splitseez";

function ReceiptPage() {
  const navigate = useNavigate();

  const [receiptFile, setReceiptFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");
  const [amount, setAmount] = useState("");

  const [splitType, setSplitType] = useState("equal");
  const [eventParticipants, setEventParticipants] = useState([]);
  const [eventCreator, setEventCreator] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [receiptId, setReceiptId] = useState(null);

  // For itemized split
  const [items, setItems] = useState([{ name: "", amount: "", sharedBy: [] }]);
  // For percentage split
  const [percentages, setPercentages] = useState({});

  // Flag from EventPage
  const fromEventPage = localStorage.getItem("fromEventPage") === "true";

  // Helper function to format number to 2 decimal places
  const formatToTwoDecimals = (value) => {
    if (!value) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return num.toFixed(2);
  };

  // Helper function to validate and format input
  const handleNumberInput = (value) => {
    if (value === "") return "";
    let cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 2) cleaned = parts[0] + "." + parts[1].substring(0, 2);
    return cleaned;
  };

  // Load event participants and receipt data if editing
  useEffect(() => {
    loadEventParticipants();
    checkForExistingReceipt();
  }, []);

  const loadEventParticipants = async () => {
    const token = localStorage.getItem("token");
    const eventId = localStorage.getItem("lastEventId");

    if (!token || !eventId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/Event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const event = await res.json();
        const participants = event.participants || [];
        setEventCreator(event.creator);

        const allParticipants = [...participants];
        const creatorAlreadyIncluded = participants.some((p) => p._id === event.creator._id);
        if (!creatorAlreadyIncluded) allParticipants.unshift(event.creator);

        setEventParticipants(
          allParticipants.map((p) => ({
            id: p._id,
            email: p.email,
            name: p.name,
            isCreator: p._id === event.creator._id,
          }))
        );

        if (event.receipt) loadReceiptData(event.receipt._id || event.receipt);
      }
    } catch (err) {
      console.error("Error loading event participants:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkForExistingReceipt = async () => {
    const editingReceiptId = localStorage.getItem("editingReceiptId");
    if (editingReceiptId) await loadReceiptData(editingReceiptId);
  };

  const loadReceiptData = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/Receipt/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const receipt = data.receipt;

        setIsEditing(true);
        setReceiptId(id);
        setAmount(receipt.total?.toString() || "");
        setTax(receipt.tax?.toString() || "");
        setTip(receipt.tip?.toString() || "");
        setSplitType(receipt.split_type || "equal");

        if (receipt.split_type === "item" && receipt.items) {
          setItems(
            receipt.items.map((item) => ({
              name: item.name || "",
              amount: item.amount?.toString() || "",
              sharedBy: item.shared_by.map((user) => user._id || user),
            }))
          );
        }

        if (receipt.split_type === "percent" && receipt.split_details) {
          const percentMap = {};
          receipt.split_details.forEach((detail) => {
            const userId = detail.user._id || detail.user;
            percentMap[userId] = detail.percent?.toString() || "";
          });
          setPercentages(percentMap);
        }
      }
    } catch (err) {
      console.error("Error loading receipt:", err);
    } finally {
      setLoading(false);
    }
  };

  /*
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    setReceiptFile(file || null);
  };
  */
  
const handleReceiptChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    setReceiptFile(null);
    return;
  }
  
  setReceiptFile(file);
  setIsProcessing(true);
  setExtractedText("");
  setShowExtractedData(false);

  try {
    // Run OCR on the image
    const result = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m) => {
          // You can see progress in console
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      }
    );

    const text = result.data.text;
    setExtractedText(text);
    
    // Try to auto-fill fields from the extracted text
    parseReceiptText(text);
    
    setShowExtractedData(true);
  } catch (error) {
    console.error('OCR Error:', error);
    alert('Failed to read receipt. Please enter values manually.');
  } finally {
    setIsProcessing(false);
  }
};

  ///Text Parsing
  const parseReceiptText = (text) => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  const lowerText = text.toLowerCase();
  
  let foundTax = null;
  let foundTip = null;
  let foundTotal = null;
  let itemLines = [];
  
  // Keywords to exclude (these aren't items)
  const excludeKeywords = ['tax', 'tip', 'total', 'subtotal', 'change', 'cash', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'balance', 'payment'];
  
  // Process each line
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();
    
    // Check for tax (more flexible patterns)
    if (lowerLine.includes('tax')) {
      const taxMatch = line.match(/\$?(\d+\.\d{2})/);
      if (taxMatch && !foundTax) {
        foundTax = taxMatch[1];
      }
    }
    
    // Check for tip (more flexible patterns)
    if (lowerLine.includes('tip')) {
      const tipMatch = line.match(/\$?(\d+\.\d{2})/);
      if (tipMatch && !foundTip) {
        foundTip = tipMatch[1];
      }
    }
    
    // Check for total (more flexible patterns)
    if (lowerLine.includes('total') && !lowerLine.includes('subtotal')) {
      const totalMatch = line.match(/\$?(\d+\.\d{2})/);
      if (totalMatch) {
        foundTotal = totalMatch[1];
      }
    }
    
    // Find all prices in the line
    const priceMatches = line.match(/\$?\d+\.\d{2}/g);
    
    if (priceMatches && priceMatches.length > 0) {
      // Check if this line should be excluded
      const shouldExclude = excludeKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (!shouldExclude) {
        // Get the last price on the line (usually the item price)
        const price = priceMatches[priceMatches.length - 1].replace('$', '');
        
        // Extract item name (everything before the last price)
        let itemName = line;
        
        // Remove the price from the name
        const lastPriceIndex = line.lastIndexOf(priceMatches[priceMatches.length - 1]);
        if (lastPriceIndex !== -1) {
          itemName = line.substring(0, lastPriceIndex).trim();
        }
        
        // Remove any quantity indicators (like "2x", "3 x", etc.)
        itemName = itemName.replace(/^\d+\s*x\s*/i, '').trim();
        
        // Remove leading numbers and special characters
        itemName = itemName.replace(/^[\d\s\-\*\.#]+/, '').trim();
        
        // Only add if we have a reasonable item name
        if (itemName.length > 1 && /[a-zA-Z]/.test(itemName) && parseFloat(price) > 0) {
          itemLines.push({
            name: itemName,
            amount: price
          });
        }
      }
    }
  });
  
  // Remove duplicate items (sometimes OCR reads the same line twice)
  const uniqueItems = [];
  const seenItems = new Set();
  
  itemLines.forEach(item => {
    const key = `${item.name.toLowerCase()}-${item.amount}`;
    if (!seenItems.has(key)) {
      seenItems.add(key);
      uniqueItems.push(item);
    }
  });
  
  // Set tax and tip
  if (foundTax) setTax(foundTax);
  if (foundTip) setTip(foundTip);
  if (foundTotal) setAmount(foundTotal);
  
  // If we found items, switch to itemized mode
  if (uniqueItems.length > 0) {
    setSplitType('item');
    
    const formattedItems = uniqueItems.map(item => ({
      name: item.name,
      amount: item.amount,
      sharedBy: []
    }));
    
    setItems(formattedItems);
    
    console.log(`Found ${uniqueItems.length} items on the receipt!`);
    console.log('Items:', uniqueItems); // So you can see what was extracted
  } else {
    console.log('No line items detected. Staying in equal split mode.');
    
    if (!foundTotal) {
      const amountRegex = /\$?\d+\.\d{2}/g;
      const amounts = text.match(amountRegex) || [];
      const cleanAmounts = amounts.map(a => a.replace('$', ''));
      
      if (cleanAmounts.length > 0) {
        const largest = cleanAmounts.reduce((max, curr) => 
          parseFloat(curr) > parseFloat(max) ? curr : max
        );
        setAmount(largest);
      }
    }
  }
};

  // Itemized logic
  const handleAddItem = () => setItems((prev) => [...prev, { name: "", amount: "", sharedBy: [] }]);
  const handleDeleteItem = (index) => {
    if (items.length === 1) return alert("You must have at least one item.");
    setItems((prev) => prev.filter((_, i) => i !== index));
  };
  const handleItemChange = (index, field, value) => {
    if (field === "amount") value = handleNumberInput(value);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const handleAddParticipantToItem = (index, participantId) => {
    if (!participantId) return;
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (!item.sharedBy.includes(participantId)) item.sharedBy = [...item.sharedBy, participantId];
      updated[index] = item;
      return updated;
    });
  };
  const handleRemoveParticipantFromItem = (index, participantId) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.sharedBy = item.sharedBy.filter((id) => id !== participantId);
      updated[index] = item;
      return updated;
    });
  };

  const itemsTotal = useMemo(() => items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0), [items]);
  const computedFromItems = useMemo(() => itemsTotal + (Number(tax) || 0) + (Number(tip) || 0), [itemsTotal, tax, tip]);
  const effectiveTotal = amount ? Number(amount) : computedFromItems;

  const handlePercentageChange = (userId, value) => setPercentages((prev) => ({ ...prev, [userId]: value }));

  const itemizedTotals = useMemo(() => {
    const totals = {};
    eventParticipants.forEach((p) => (totals[p.id] = 0));

    items.forEach((item) => {
      const price = Number(item.amount) || 0;
      if (!price) return;

      const sharedBy = item.sharedBy || [];
      if (sharedBy.length === 0) return;

      const share = price / sharedBy.length;
      sharedBy.forEach((id) => {
        totals[id] = (totals[id] || 0) + share;
      });
    });

    const subtotalSum = Object.values(totals).reduce((acc, val) => acc + val, 0);
    if (subtotalSum > 0) {
      const extras = (Number(tax) || 0) + (Number(tip) || 0);
      Object.keys(totals).forEach((id) => {
        const ratio = totals[id] / subtotalSum;
        totals[id] += ratio * extras;
      });
    }

    return totals;
  }, [items, eventParticipants, tax, tip]);

  const handleSubmitReceipt = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("You must be logged in.");

    const eventId = localStorage.getItem("lastEventId");
    if (!eventId) return alert("No event found.");

    if (eventParticipants.length === 0) return alert("No participants found for this event.");
    if (effectiveTotal <= 0) return alert("Total amount must be greater than 0.");

    try {
      let payload = {
        eventId,
        tax: Number(tax) || 0,
        tip: Number(tip) || 0,
        total: effectiveTotal,
        split_type: splitType,
      };

      if (splitType === "equal") {
        payload.split_details = eventParticipants.map((p) => ({ user: p.id, percent: null }));
      } else if (splitType === "percent") {
        const totalPercent = Object.values(percentages).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) return alert("Percentages must add up to 100%");
        payload.split_details = eventParticipants.filter((p) => percentages[p.id]).map((p) => ({ user: p.id, percent: Number(percentages[p.id]) }));
      } else if (splitType === "item") {
        const validItems = items.filter((i) => i.name && i.amount);
        if (validItems.length === 0) return alert("Please add at least one item with name and amount.");
        const itemsWithoutParticipants = validItems.filter((i) => !i.sharedBy || i.sharedBy.length === 0);
        if (itemsWithoutParticipants.length > 0) return alert("Each item must have at least one participant sharing it.");

        payload.items = validItems.map((i) => ({ name: i.name, amount: Number(i.amount), shared_by: i.sharedBy }));
        payload.split_details = [];
      }

      let res;
      if (isEditing && receiptId) {
        res = await fetch(`${API_BASE}/Receipt/${receiptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/Receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Save failed:", errorData);
        return alert(errorData.message || "Failed to save receipt.");
      }

      localStorage.removeItem("editingReceiptId");
      localStorage.removeItem("fromEventPage"); // clear flag
      alert(isEditing ? "Receipt updated successfully!" : "Receipt saved successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Cannot connect to server.");
    }
  };

  const handleDiscard = () => {
    if (fromEventPage) return alert("You cannot discard until you save the receipt from EventPage.");

    if (!window.confirm("Discard all changes?")) return;
    
    setAmount("");
    setTax("");
    setTip("");
    setSplitType("equal");
    setItems([{ name: "", amount: "", sharedBy: [] }]);
    setPercentages({});
    setReceiptFile(null);
    localStorage.removeItem("editingReceiptId");

    if (isEditing) navigate("/dashboard");
  };

  if (loading) return <div className="receipt-container"><div className="container">Loading event data...</div></div>;
  if (eventParticipants.length === 0) return <div className="receipt-container"><div className="container"><h2>Upload Receipt</h2><p style={{ color: "red" }}>No participants found for this event. Please add participants first.</p></div></div>;

  // --- Render ---
  return (
    <div className="receipt-container">
      <div className="container">
        <h2>{isEditing ? "Edit Receipt" : "Upload Receipt"}</h2>
        {eventCreator && <div className="creator-info"><strong>Event Creator (Payer):</strong> {eventCreator.name} ({eventCreator.email})</div>}

        {/* Amount / Tax / Tip / Receipt File */}
        <div className="form-group">
          <label htmlFor="amount">Total Amount ($) (optional):</label>
          <input type="text" id="amount" placeholder="0.00" value={amount} onChange={(e) => setAmount(handleNumberInput(e.target.value))} />
          <small>If left empty, total = items + tax + tip.</small>
        </div>
        
        <div className="form-group">
  <label>Receipt Image (optional):</label>
  <input 
    type="file" 
    accept="image/*" 
    onChange={handleReceiptChange}
    disabled={isProcessing}
  />
  {isProcessing && (
    <div className="processing-indicator">
      <p>🔄 Processing receipt image... This may take 10-30 seconds.</p>
    </div>
  )}
  {showExtractedData && extractedText && (
    <div className="extracted-text-box">
      <h4>📄 Extracted Text from Receipt:</h4>
      <div className="extracted-text-content">
        {extractedText}
      </div>
      <p className="text-helper">
        ✓ Fields above have been auto-filled. Please review and adjust if needed!
      </p>
    </div>
  )}
</div>
        
        <div className="form-group">
          <label htmlFor="tax">Tax (optional):</label>
          <input type="text" id="tax" placeholder="0.00" value={tax} onChange={(e) => setTax(handleNumberInput(e.target.value))} />
        </div>
        <div className="form-group">
          <label htmlFor="tip">Tip (optional):</label>
          <input type="text" id="tip" placeholder="0.00" value={tip} onChange={(e) => setTip(handleNumberInput(e.target.value))} />
        </div>

        {/* Split Type */}
        <div className="form-group">
          <label htmlFor="splitType">Split Type:</label>
          <select id="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
            <option value="equal">Split Equally</option>
            <option value="percent">Split by Percentage</option>
            <option value="item">Itemize</option>
          </select>
        </div>

        {/* --- Render splits --- */}
        {/* Equal Split */}
        {splitType === "equal" && (
          <div className="split-section">
            <h4>Split Equally (Preview):</h4>
            <p>Effective Total: ${effectiveTotal.toFixed(2)}</p>
            {eventParticipants.map((p) => <p key={p.id}>{p.name} ({p.email}){p.isCreator && " 👑 (Creator/Payer)"} owes ${(effectiveTotal / eventParticipants.length).toFixed(2)}</p>)}
          </div>
        )}

        {/* Percentage Split */}
        {splitType === "percent" && (
          <div className="split-section">
            <h4>Split by Percentage:</h4>
            <p>Effective Total: ${effectiveTotal.toFixed(2)}</p>
            {eventParticipants.map((p) => (
              <div key={p.id} className="form-group">
                <label>{p.name} ({p.email}){p.isCreator && " 👑 (Creator/Payer)"} (%):</label>
                <input type="number" min="0" max="100" step="1" value={percentages[p.id] || ""} onChange={(e) => handlePercentageChange(p.id, e.target.value)} />
                {percentages[p.id] && <span> = ${(Number(percentages[p.id])/100*effectiveTotal).toFixed(2)}</span>}
              </div>
            ))}
            <p><strong>Total Percentage: {Object.values(percentages).reduce((sum,val)=>sum+(Number(val)||0),0).toFixed(0)}%</strong></p>
          </div>
        )}

        {/* Itemized Split */}
        {splitType === "item" && (
          <div className="split-section">
            <h4>Itemized Items:</h4>
            {items.map((item, index) => (
              <div key={index} className="item-entry">
                <div className="item-header">
                  <div className="item-inputs">
                    <input type="text" placeholder="Item name" value={item.name} onChange={(e)=>handleItemChange(index,"name",e.target.value)} />
                    <input type="text" placeholder="0.00" value={item.amount} onChange={(e)=>handleItemChange(index,"amount",e.target.value)} />
                  </div>
                  {items.length > 1 && <button type="button" className="delete-item-btn" onClick={()=>handleDeleteItem(index)} title="Delete item">×</button>}
                </div>

                {/* Add participants dropdown */}
                <div className="add-participant-dropdown">
                  <label>Add participants sharing this item:</label>
                  <select onChange={(e)=>{handleAddParticipantToItem(index,e.target.value); e.target.value="";}} value="">
                    <option value="" disabled>Select a participant...</option>
                    {eventParticipants.filter(p=>!item.sharedBy.includes(p.id)).map(p=> <option key={p.id} value={p.id}>{p.name} ({p.email}){p.isCreator && " 👑"}</option>)}
                  </select>
                </div>

                {/* Selected participants */}
                {item.sharedBy.length>0 && (
                  <div className="selected-participants">
                    <label>Shared by:</label>
                    <div className="participant-tags">
                      {item.sharedBy.map(pid=>{
                        const participant = eventParticipants.find(p=>p.id===pid);
                        return participant?<div key={pid} className="participant-tag">
                          <span>{participant.name}{participant.isCreator && " 👑"}</span>
                          <button type="button" onClick={()=>handleRemoveParticipantFromItem(index,pid)} title="Remove participant">×</button>
                        </div>:null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={handleAddItem}>+ Add Item</button>

            <div className="itemized-summary">
              <h4>Final Itemized Split:</h4>
              {eventParticipants.map(p=>{
                const total = itemizedTotals[p.id] || 0;
                return <p key={p.id}>{p.name} ({p.email}) owes ${total.toFixed(2)}</p>
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="button-group">
          <button type="button" onClick={handleSubmitReceipt}>Save Receipt</button>
          <button type="button" className="discard" onClick={handleDiscard}>Discard</button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptPage;
