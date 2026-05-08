import { useState, useCallback } from 'react';
import { validateEmail, validatePassword } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

/**
 * useAuth
 * Handles login/signup via the Python Flask backend -> Neon PostgreSQL.
 * Falls back gracefully if the backend is unreachable (offline mode).
 */
export function useAuth() {
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async (email, password) => {
    setError('');
    if (!validateEmail(email)) { setError('Enter a valid email address.'); return false; }
    if (!validatePassword(password)) { setError('Password must be at least 6 characters.'); return false; }

    setLoading(true);
    try {
      const userData = await api.login({ email, password });
      if (userData.error) throw new Error(userData.error);
      // Store user with DB id so future API calls can use it
      await login({ ...userData, createdAt: new Date().toISOString() });
      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials or connection.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const handleSignup = useCallback(async (email, password, confirmPassword) => {
    setError('');
    if (!validateEmail(email)) { setError('Enter a valid email address.'); return false; }
    if (!validatePassword(password)) { setError('Password must be at least 6 characters.'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }

    setLoading(true);
    try {
      const name = email.split('@')[0];
      const userData = await api.register({ name, email, password });
      if (userData.error) throw new Error(userData.error);
      await login({ ...userData, createdAt: new Date().toISOString() });
      return true;
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const clearError = useCallback(() => setError(''), []);

  return { loading, error, handleLogin, handleSignup, clearError };
}
