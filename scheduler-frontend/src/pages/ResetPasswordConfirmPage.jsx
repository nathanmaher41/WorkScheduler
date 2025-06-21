import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import PasswordInput from '../components/PasswordInput'; // 👈 import it

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const fromSettings = new URLSearchParams(location.search).get('from') === 'settings';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      await axios.post('/api/password-reset/confirm-auth/', { password });
      setMessage('Password reset successful!');
      setTimeout(() => {
        navigate(fromSettings ? '/dashboard?modal=settings' : '/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Reset Your Password</h2>
        {message ? (
          <p className="text-green-600">{message}</p>
        ) : (
          <>
            <label className="block mb-1 font-medium text-sm text-black dark:text-white">New Password</label>
            <PasswordInput
              name="new-password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="block mb-1 font-medium text-sm mt-4 text-black dark:text-white">Confirm Password</label>
            <PasswordInput
              name="confirm-password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            <button type="submit" className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded">
              Reset Password
            </button>
          </>
        )}
      </form>
    </div>
  );
}
