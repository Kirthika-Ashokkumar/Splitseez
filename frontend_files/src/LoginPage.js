import './LoginPage.css';

import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    const response =
        await fetch('http://localhost:4000/Splitseez/Users/Signin', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, password}),
        });

    const data = await response.json();

    if (response.ok && data.token) {
      // Save token for authenticated requests
      localStorage.setItem('token', data.token);

      // ✅ NEW: Save user object so dashboard can load
      localStorage.setItem('user', JSON.stringify(data.user));

      alert('Login successful!');
      navigate('/dashboard');
    } else {
      alert(data.message || 'Invalid email or password');
    }
  };

  return (
    <div className='login-container'>
      <div className='login-header'>
        <h1>SplitSeez</h1>
      </div>
      <div className='login-box'>
        <h2>Welcome Back</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
              required
            />
          </div>

          <button type="submit" className="btn">Login</button>
        </form>

        <div className="signup-link">
          <p>Don't have an account?</p>
          <button className='signup-btn' onClick={() => navigate('/signup')}>
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
