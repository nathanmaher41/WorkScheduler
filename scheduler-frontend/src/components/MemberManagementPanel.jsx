// src/components/MembershipManagementPanel.jsx
import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import ShareInviteModal from './ShareInviteModal';

export default function MembershipManagementPanel({
  calendarId,
  currentUserId,
  permissions = [],
  roles = [], // passed in from AdminPanel
  allPermissions = [],
  members = [],
  onMemberUpdate
}) {
    const [localMembers, setLocalMembers] = useState(members);
    const [editingColorMemberId, setEditingColorMemberId] = useState(null);
    const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
    const currentUserMembership = members.find(m => m.user_id === currentUserId);
    const [showShareModal, setShowShareModal] = useState(false);

    const isAdmin = currentUserMembership?.is_admin;
    const handleColorChange = async (memberId, newColor) => {
    try {
        await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, { color: newColor });
        setLocalMembers((prev) =>
        prev.map((m) => (m.user_id === memberId ? { ...m, color: newColor } : m))
        );
        onMemberUpdate();
    } catch (err) {
        console.error('Failed to update color:', err);
    }
    };

    const handleRoleChange = async (memberId, newTitleId) => {
    try {
        await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, { title: newTitleId });
        setLocalMembers((prev) =>
        prev.map((m) => (m.user_id === memberId ? { ...m, title_id: newTitleId } : m))
        );
        onMemberUpdate();
    } catch (err) {
        console.error('Failed to update role:', err);
    }
    };
    const availableColors = [
    '#FF8A80', '#F8BBD0', '#E53935', '#B71C1C', '#D81B60', '#880E4F',
    '#FFD180', '#E65100', '#FFEB3B', '#F9A825', '#A5D6A7',
    '#43A047', '#1B5E20', '#B2DFDB', '#009688', '#004D40', '#90CAF9',
    '#1E88E5', '#0D47A1', '#CE93D8', '#8E24AA', '#4A148C', '#BCAAA4',
    '#8D6E63', '#3E2723'
    ];

    const handleRemoveMember = async (memberId, memberName) => {
        try {
            await axios.delete(`/api/calendars/${calendarId}/members/${memberId}/remove/`);
            setLocalMembers(prev => prev.filter(m => m.user_id !== memberId));
            setConfirmRemoveMember(null); // close the modal
        } catch (err) {
            console.error('Failed to remove member:', err);
        }
    };

    useEffect(() => {
        setLocalMembers(members);
    }, [members]);

    console.log(permissions);

    return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-black dark:text-white">Manage Members</h3>
        {(isAdmin || permissions.some(p => p.codename === 'invite_remove_members')) && (
            <button
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={() => setShowShareModal(true)}
            >
            Invite Member
            </button>
        )}
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-white sticky top-0 z-10">
                <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Actions</th>
                </tr>
                </thead>
            </table>
            <div className="max-h-[400px] overflow-y-auto border-t border-gray-300 dark:border-gray-600">
            <table className="min-w-full">
            <tbody>
            {localMembers.map((m) => (
                <tr key={m.membership_id} className="border-t border-gray-300 dark:border-gray-600">
                <td className="p-2">{m.full_name || m.username}</td>
                <td className="p-2 relative">
                <button
                    className="w-5 h-5 rounded-full border-2"
                    style={{ backgroundColor: m.color || '#ccc' }}
                    onClick={() =>
                    (isAdmin || permissions.some(p => p.codename === 'manage_colors')) && setEditingColorMemberId(m.user_id)
                    }
                />
                {editingColorMemberId === m.user_id && (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full relative">
                        <h4 className="text-md font-semibold mb-4 text-black dark:text-white text-center">
                            Change {m.full_name || m.username}'s Color
                        </h4>
                        <div className="grid grid-cols-6 gap-3 justify-items-center">
                            {availableColors.map((color) => {
                            const isUsed = members.some(mem => mem.user_id !== m.user_id && mem.color === color);
                            const isSelected = m.color === color;

                            return (
                                <div key={color} className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                    handleColorChange(m.user_id, color);
                                    setEditingColorMemberId(null);
                                    }}
                                    disabled={isUsed && !isSelected}
                                    className={`w-7 h-7 rounded-full border-2 transition ${
                                    isSelected ? 'border-black dark:border-white ring-2 ring-white' : 'border-transparent'
                                    }`}
                                    style={{
                                    backgroundColor: color,
                                    opacity: isUsed && !isSelected ? 0.4 : 1,
                                    cursor: isUsed && !isSelected ? 'not-allowed' : 'pointer'
                                    }}
                                />
                                {isUsed && !isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-full h-0.5 bg-red-600 transform rotate-45" />
                                    </div>
                                )}
                                </div>
                            );
                            })}
                        </div>
                        <button
                            className="mt-6 block mx-auto px-4 py-1 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
                            onClick={() => setEditingColorMemberId(null)}
                        >
                            Close
                        </button>
                        </div>
                    </div>
                    )}
                </td>
                <td className="p-2">
                    {isAdmin || permissions.some(p => p.codename === 'assign_roles') ? (
                    <select
                        value={m.title_id ?? ''}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
                        >
                        {(m.title_id === null || m.title_id === undefined) && (
                            <option value="">None</option>
                        )}
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                            {r.name}
                            </option>
                        ))}
                        </select>
                    ) : (
                    roles.find((r) => r.id === m.title_id)?.name || 'None'
                    )}
                </td>
                <td className="p-2">
                    {(isAdmin || permissions.some(p => p.codename === 'invite_remove_members')) && m.user_id !== currentUserId && (
                    <button
                    onClick={() => setConfirmRemoveMember({ id: m.user_id, name: m.full_name || m.username })}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                    Remove
                    </button>
                    )}
                </td>
                </tr>
            ))}
            </tbody>
             </table>
            </div>
        {confirmRemoveMember && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h4 className="text-lg font-semibold mb-4 text-black dark:text-white text-center">
                    Remove {confirmRemoveMember.name} from calendar?
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 text-center">
                    This will <strong>remove all of their shifts</strong>. Are you sure you want to continue?
                </p>
                <div className="flex justify-center gap-3">
                    <button
                    onClick={() => setConfirmRemoveMember(null)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
                    >
                    Cancel
                    </button>
                    <button
                        onClick={() => handleRemoveMember(confirmRemoveMember.id, confirmRemoveMember.name)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                        Remove
                    </button>
                </div>
                </div>
            </div>
            )}
        </div>
        {showShareModal && (
        <ShareInviteModal
            calendarId={calendarId}
            onClose={() => setShowShareModal(false)}
        />
        )}
    </div>
    );
}
