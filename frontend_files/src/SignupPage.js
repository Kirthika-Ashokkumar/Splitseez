// src/SignupPage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css"; 

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("http://localhost:4000/Splitseez/Users/Signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (res.ok && (data.success === true || data.user)) {
        alert("Account created! Please log in.");
        navigate("/login");
      } else {
        alert(data.message || "Sign up failed. Try a different email.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Create Account</h2>

        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <div className="links" style={{ marginTop: "1rem" }}>
          <button
  className="link-button"
  onClick={() => navigate("/login")}
>
  Back to Login
</button>
        </div>
      </div>
    </div>
  );
}
