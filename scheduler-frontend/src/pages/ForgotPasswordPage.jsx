import { useState } from 'react';
import axios from '../utils/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false); // 🔄 NEW

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSending(true); // Start loading
    try {
      const res = await axios.post('/api/password-reset/request/', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link.');
    } finally {
      setIsSending(false); // Stop loading
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Forgot Password</h2>
        {message ? (
          <p className="text-green-600">{message}</p>
        ) : (
          <>
            <label className="block mb-2 font-medium text-gray-800 dark:text-gray-100">Email</label>
            <input
              type="email"
              className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-red-600 mb-2">{error}</p>}
            <button
              type="submit"
              disabled={isSending}
              className={`w-full p-2 rounded text-white ${
                isSending ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isSending ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
