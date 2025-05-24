// src/pages/CompleteProfile.jsx
import { useState } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

export default function CompleteProfile() {
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: ''
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
        e.preventDefault();
        try {
            await axios.patch('/api/profile/', form);
            navigate('/dashboard');
        } catch (err) {
            if (err.response?.data) {
                setErrors(err.response.data);
            } else {
                setErrors({ general: 'Could not save profile. Please try again.' });
            }
            }
    };

    return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300 px-4">
        <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md space-y-5 transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-2 text-center">Complete Your Profile</h1>

        <input
            name="first_name"
            placeholder="First Name"
            value={form.first_name}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
        />

        <input
            name="middle_name"
            placeholder="Middle Name (Optional)"
            value={form.middle_name}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
        />

        <input
            name="last_name"
            placeholder="Last Name"
            value={form.last_name}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
        />

        <div>
            <input
            name="phone_number"
            placeholder="Phone Number (Optional)"
            value={form.phone_number}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optional — provide this if you want to receive SMS updates later.
            </p>
        </div>

        {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name[0]}</p>}
        {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name[0]}</p>}
        {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}

        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded w-full transition">
            Finish Setup
        </button>
        </form>
    </div>
    );
}
