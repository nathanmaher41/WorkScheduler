import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from '../utils/axios';
import ThemeToggle from '../components/ThemeToggle';

export default function UserSettingsModal({ onClose }) {
    const [form, setForm] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        pronouns: '',
        show_pronouns: true,
        show_middle_name: true,
        notify_email: true,
    });
    const [message, setMessage] = useState('');
    const [applied, setApplied] = useState(false);
    const [sectionsOpen, setSectionsOpen] = useState({
        personal: true,
        identity: true,
        preferences: true,
        about: false
    });
    const [userInfo, setUserInfo] = useState({ username: '', email: '' });

    useEffect(() => {
        axios.get('/api/user/settings/')
            .then(res => {
                setForm({
                    first_name: res.data.first_name || '',
                    middle_name: res.data.middle_name || '',
                    last_name: res.data.last_name || '',
                    pronouns: res.data.pronouns || '',
                    show_pronouns: res.data.show_pronouns ?? true,
                    show_middle_name: res.data.show_middle_name ?? true,
                    notify_email: res.data.notify_email ?? true,
                });
                setUserInfo({
                    username: res.data.username || '',
                    email: res.data.email || ''
                });
            })
            .catch(() => setMessage('Failed to load settings'));
    }, []);

    const getFullName = () => {
        const { first_name, middle_name, last_name, show_middle_name } = form;
        return `${first_name} ${show_middle_name && middle_name ? middle_name : ''} ${last_name}`.replace(/\s+/g, ' ').trim();
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const toggleSection = (section) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleApply = async () => {
        try {
            await axios.patch('/api/user/settings/', form);
            setMessage('Settings updated ✅');
            setApplied(true);
            setTimeout(() => setApplied(false), 2000);
        } catch (err) {
            setMessage('Error updating settings');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">User Settings</h2>

                <div className="grid gap-8">
                    {/* Personal Info Section */}
                    <div>
                        <button onClick={() => toggleSection('personal')} className="text-lg font-semibold mb-2 w-full text-left">
                            Personal Information {sectionsOpen.personal ? '▲' : '▼'}
                        </button>
                        <AnimatePresence>
                            {sectionsOpen.personal && (
                                <motion.div
                                    key="personal"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="grid gap-4 overflow-hidden"
                                >
                                    <div>
                                        <label className="block text-sm font-medium mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={form.first_name || ''}
                                            onChange={e => handleChange('first_name', e.target.value)}
                                            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Middle Name</label>
                                        <input
                                            type="text"
                                            value={form.middle_name || ''}
                                            onChange={e => handleChange('middle_name', e.target.value)}
                                            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                                        />
                                    </div>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={form.show_middle_name}
                                            onChange={e => handleChange('show_middle_name', e.target.checked)}
                                            className="mr-2"
                                        />
                                        Display middle name to others
                                    </label>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={form.last_name || ''}
                                            onChange={e => handleChange('last_name', e.target.value)}
                                            className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Identity Section */}
                    <div>
                        <button onClick={() => toggleSection('identity')} className="text-lg font-semibold mb-2 w-full text-left">
                            Identity & Display {sectionsOpen.identity ? '▲' : '▼'}
                        </button>
                        <AnimatePresence>
                            {sectionsOpen.identity && (
                                <motion.div
                                    key="identity"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <label className="block text-sm font-medium mb-1">Pronouns</label>
                                    <input
                                        type="text"
                                        value={form.pronouns || ''}
                                        onChange={e => handleChange('pronouns', e.target.value)}
                                        className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                                        placeholder="e.g. they/them"
                                    />
                                    <label className="inline-flex items-center mt-2">
                                        <input
                                            type="checkbox"
                                            checked={form.show_pronouns}
                                            onChange={e => handleChange('show_pronouns', e.target.checked)}
                                            className="mr-2"
                                        />
                                        Display pronouns to others
                                    </label>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Preferences Section */}
                    <div>
                        <button onClick={() => toggleSection('preferences')} className="text-lg font-semibold mb-2 w-full text-left">
                            Preferences {sectionsOpen.preferences ? '▲' : '▼'}
                        </button>
                        <AnimatePresence>
                            {sectionsOpen.preferences && (
                                <motion.div
                                    key="preferences"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-1">Notifications</label>
                                        <label className="block">
                                            <input
                                                type="checkbox"
                                                checked={form.notify_email}
                                                onChange={e => handleChange('notify_email', e.target.checked)}
                                                className="mr-2"
                                            />
                                            Email Notifications
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Theme</label>
                                        <ThemeToggle />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* About User Section */}
                    <div>
                        <button onClick={() => toggleSection('about')} className="text-lg font-semibold mb-2 w-full text-left">
                            About User {sectionsOpen.about ? '▲' : '▼'}
                        </button>
                        <AnimatePresence>
                            {sectionsOpen.about && (
                                <motion.div
                                    key="about"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-sm mb-1">Full Name: {getFullName()}</p>
                                    <p className="text-sm mb-1">Username: {userInfo.username}</p>
                                    <p className="text-sm">Email: {userInfo.email}</p>
                                    <div className="mt-4">
                                    <button
                                        onClick={() => window.location.href = '/reset-password?from=settings'}
                                        className="text-sm text-blue-600 dark:text-blue-400 underline"
                                    >
                                        Change Password
                                    </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>Close</button>
                        <button
                            className="px-4 py-2 bg-purple-600 text-white rounded relative"
                            onClick={handleApply}
                        >
                            {applied ? '✔' : 'Apply'}
                        </button>
                    </div>
                    {message && <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{message}</p>}
                </div>
            </div>
        </div>
    );
}
