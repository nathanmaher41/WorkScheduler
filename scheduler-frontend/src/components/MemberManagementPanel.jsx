// src/components/MembershipManagementPanel.jsx
import { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function MembershipManagementPanel({
  calendarId,
  currentUserId,
  permissions = [],
  roles = [], // passed in from AdminPanel
}) { 
    //
  const [members, setMembers] = useState([]);

  useEffect(() => {
    axios.get(`/api/calendars/${calendarId}/members/`).then((res) => setMembers(res.data));
  }, [calendarId]);

  const hasPermission = (perm) => permissions.includes(perm);

  const handleColorChange = async (memberId, newColor) => {
    try {
      await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, { color: newColor });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, color: newColor } : m))
      );
    } catch (err) {
      console.error('Failed to update color:', err);
    }
  };

  const handleRoleChange = async (memberId, newTitleId) => {
    try {
      await axios.patch(`/api/calendars/${calendarId}/members/${memberId}/`, { title: newTitleId });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, title_id: newTitleId } : m))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    // Placeholder — you'll build this out later
    alert(`🔴 Remove member ${memberId} (not yet implemented)`);
  };

  const availableColors = [
    '#FF8A80', '#F8BBD0', '#E53935', '#B71C1C', '#D81B60', '#880E4F',
    '#FFD180', '#E65100', '#FFF59D', '#FFEB3B', '#F9A825', '#A5D6A7',
    '#43A047', '#1B5E20', '#B2DFDB', '#009688', '#004D40', '#90CAF9',
    '#1E88E5', '#0D47A1', '#CE93D8', '#8E24AA', '#4A148C', '#BCAAA4',
    '#8D6E63', '#3E2723'
    ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-black dark:text-white">Manage Members</h3>
        {hasPermission('invite_remove_members') && (
          <button
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={() => alert('📨 Invite flow not implemented yet')}
          >
            Invite Member
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 dark:border-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-white">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Color</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.membership_id} className="border-t border-gray-300 dark:border-gray-600">
                <td className="p-2">{m.full_name || m.username}</td>
                <td className="p-2">
                  {hasPermission('manage_colors') ? (
                    <select
                      value={m.color || ''}
                      onChange={(e) => handleColorChange(m.id, e.target.value)}
                      className="border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">None</option>
                      {availableColors.map((c) => (
                        <option key={c} value={c} style={{ backgroundColor: c }}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: m.color || '#ccc' }}
                    />
                  )}
                </td>
                <td className="p-2">
                  {hasPermission('assign_roles') ? (
                    <select
                      value={m.title_id || ''}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">None</option>
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
                  {hasPermission('invite_remove_members') && m.id !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
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
    </div>
  );
}
