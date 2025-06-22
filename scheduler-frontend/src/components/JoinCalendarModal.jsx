import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function JoinCalendarModal({ onClose, onJoin, prefilledCode }) {
    const [code, setCode] = useState(prefilledCode || '');
    const [calendar, setCalendar] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [errors, setErrors] = useState({});
    const [alreadyJoinedMessage, setAlreadyJoinedMessage] = useState('');
    const [inviteToken, setInviteToken] = useState(null);

    useEffect(() => {
        if (prefilledCode) {
            axios.get(`/api/calendars/lookup/?code=${prefilledCode}`)
                .then(res => {
                    setCalendar(res.data);
                    setInviteToken(res.data.invite_token || null);
                })
                .catch(() => {
                    setErrors({ general: 'Failed to lookup calendar with provided code.' });
                });
        }
    }, [prefilledCode]);

    const colors = [
        '#FF8A80', '#F8BBD0', '#E53935', '#B71C1C',
        '#D81B60', '#880E4F',
        '#FFD180', '#E65100', '#FFEB3B', '#F9A825',
        '#A5D6A7', '#43A047', '#1B5E20',
        '#B2DFDB', '#009688', '#004D40',
        '#90CAF9', '#1E88E5', '#0D47A1',
        '#CE93D8', '#8E24AA', '#4A148C',
        '#BCAAA4', '#8D6E63', '#3E2723'
    ];

    const usedColors = new Set((calendar?.used_colors || []).map(c => c.toUpperCase()));

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.get(`/api/calendars/lookup/?code=${code}`);
            setCalendar(res.data);
            setErrors({});
            setInviteToken(res.data.invite_token || null);
            if (res.data.already_joined) {
                setAlreadyJoinedMessage('You are already a member of this calendar.');
            } else {
                setAlreadyJoinedMessage('');
            }
        } catch (err) {
            setErrors({ general: 'Invalid join code or unauthorized.' });
            setCalendar(null);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!selectedRole) {
            newErrors.role = 'Title is required.';
        }
        if (!selectedColor) {
            newErrors.color = 'Color is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            if (inviteToken) {
                await axios.post(`/api/calendars/invite/accept/${inviteToken}/`, {
                    title_id: selectedRole,
                    color: selectedColor
                });
            } else {
                await axios.post('/api/calendars/join/', {
                    join_code: code,
                    title_id: selectedRole,
                    color: selectedColor,
                });
            }
            onJoin();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to join calendar.';
            setErrors({ general: errorMsg });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <form
                onSubmit={calendar && !alreadyJoinedMessage ? handleJoin : handleCodeSubmit}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md"
            >
                <h2 className="text-xl font-bold mb-4">Join Calendar</h2>

                {!calendar ? (
                    <>
                        <label className="block mb-2 font-medium">Join Code</label>
                        <input
                            type="text"
                            className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            placeholder="Enter code"
                        />
                        {errors.general && <p className="text-red-500 mb-2">{errors.general}</p>}
                    </>
                ) : (
                    <>
                        {alreadyJoinedMessage && (
                            <p className="text-blue-600 bg-blue-100 p-2 rounded mb-2">
                                {alreadyJoinedMessage}
                            </p>
                        )}

                        {!alreadyJoinedMessage && (
                            <>
                                <label className="block mb-2 font-medium">Select Role</label>
                                <select
                                    className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-white"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="">-- Choose a role --</option>
                                    {(calendar.roles || []).map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                                {errors.role && <p className="text-red-500 mb-2">{errors.role}</p>}

                                <label className="block mb-2 font-medium">Pick a Color</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {colors.map(color => {
                                        const normalizedColor = color.toUpperCase();
                                        const isUsed = usedColors.has(normalizedColor);
                                        return (
                                            <div className="relative" key={color}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedColor(color)}
                                                    disabled={isUsed}
                                                    className={`w-6 h-6 rounded-full border-2 transition ${
                                                        selectedColor === color ? 'border-black dark:border-white' :
                                                        isUsed ? 'border-red-600' : 'border-transparent'
                                                    }`}
                                                    style={{
                                                        backgroundColor: color,
                                                        opacity: isUsed ? 0.4 : 1,
                                                        cursor: isUsed ? 'not-allowed' : 'pointer'
                                                    }}
                                                />
                                                {isUsed && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-full h-0.5 bg-red-600 transform rotate-45" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {errors.color && <p className="text-red-500 mb-2">{errors.color}</p>}
                                {errors.general && <p className="text-red-500 mb-2">{errors.general}</p>}
                            </>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded"
                    >
                        Cancel
                    </button>
                    {!alreadyJoinedMessage && (
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            {calendar ? 'Join' : 'Next'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
