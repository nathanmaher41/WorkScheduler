import { useState } from 'react';
import axiosPublic from '../utils/axiosPublic';

export default function CheckEmail() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resendEmail = async () => {
    setMessage('');
    setLoading(true);
    try {
      const storedUsername = localStorage.getItem('username');
      if (!storedUsername) {
        setMessage('No username found. Please try registering again.');
        return;
      }

      const res = await axiosPublic.post('/api/resend-activation/', {
        username: storedUsername,
      });
      setMessage(res.data.message || 'Activation email resent.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to resend email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-white dark:bg-gray-900 text-black dark:text-white transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        We've sent a confirmation link to your email. Click it to activate your account.
      </p>

      <button
        onClick={resendEmail}
        className="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded transition"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Resend Email'}
      </button>

      {message && <p className="mt-3 text-sm text-blue-500">{message}</p>}
    </div>
  );
}
