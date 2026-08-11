import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(mobile.trim(), password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/staff');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>KISAN MALL</h1>
        <div className="tag">Stock Audit</div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={onSubmit}>
          <label>
            Mobile Number
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="numeric"
              placeholder="Enter mobile"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>
          <button className="btn block" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
