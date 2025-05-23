import { useState } from 'react';
import axiosPublic from '../utils/axiosPublic';

export default function ResendActivation() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await axiosPublic.post('/api/resend-activation/', { username });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error resending activation email');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <form onSubmit={handleSubmit} className="w-64">
        <h1 className="text-xl font-bold mb-4">Resend Activation Email</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">Send</button>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </form>
    </div>
  );
}
