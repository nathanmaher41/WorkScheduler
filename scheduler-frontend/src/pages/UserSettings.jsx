import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function UserSettings() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/user/settings/')
      .then(res => {
        setPhone(res.data.phone_number || '');
      })
      .catch(() => setMessage('Failed to load settings'));
  }, []);

  const handleSave = async () => {
    try {
      await axios.patch('/api/user/settings/', { phone_number: phone });
      setMessage('Settings updated ✅');
    } catch (err) {
      setMessage('Error updating settings');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">User Settings</h2>
      <label className="block mb-2 text-sm font-medium">Phone Number</label>
      <input
        type="text"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="border p-2 rounded w-full mb-4"
        placeholder="e.g. +1234567890"
      />
      <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save
      </button>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
