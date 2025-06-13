import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

export default function RolesPanel({ calendarId, roles: rolesProp = [] }) {
  //const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editedRoleName, setEditedRoleName] = useState('');
  const [deleteError, setDeleteError] = useState(null);

    const [roles, setRoles] = useState([]);

    useEffect(() => {
        setRoles(rolesProp); // rename the prop to avoid collision
    }, [rolesProp]);

  console.log(roles);
  const handleAddRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed || roles.some(r => r.name === trimmed)) return;

    try {
      const res = await axios.post(`/api/calendars/${calendarId}/roles/add/`, {
        name: trimmed,
      });
      setRoles(prev => [...prev, res.data]);
      setNewRoleName('');
    } catch (err) {
      console.error('Failed to add role:', err);
    }
  };

  const handleRemoveRole = async (roleId) => {
    try {
      await axios.delete(`/api/calendars/${calendarId}/roles/${roleId}/delete`);
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete role.';
      console.error('Delete failed:', err.response?.data || err);
      setDeleteError(message);
    }
  };

  const handleStartEditRole = (role) => {
    setEditingRoleId(role.id);
    setEditedRoleName(role.name);
  };

  const handleUpdateRole = async (roleId) => {
    try {
      const trimmed = editedRoleName.trim();
      if (!trimmed) return;

      const res = await axios.put(`/api/calendars/${calendarId}/roles/${roleId}/rename/`, {
        name: trimmed,
      });

      setRoles(prev => prev.map(r => r.id === roleId ? res.data : r));
      setEditingRoleId(null);
      setEditedRoleName('');
    } catch (err) {
      console.error('Rename failed:', err.response?.data || err);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Manage Roles</h2>

      <div className="flex gap-2 items-center mb-3">
        <input
          type="text"
          placeholder="e.g. Floor Supervisor"
          className="flex-1 border px-3 py-2 rounded dark:bg-gray-700 dark:text-white"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
        />
        <button
          type="button"
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={handleAddRole}
        >
          Add
        </button>
      </div>

      {roles.length > 0 && (
        <ul className="space-y-1 text-sm text-black dark:text-white">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded"
            >
              {editingRoleId === role.id ? (
                <input
                  type="text"
                  value={editedRoleName}
                  onChange={(e) => setEditedRoleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateRole(role.id);
                    if (e.key === 'Escape') {
                      setEditingRoleId(null);
                      setEditedRoleName('');
                    }
                  }}
                  className="flex-1 mr-2 border rounded px-2 py-1 dark:bg-gray-600 dark:text-white"
                />
              ) : (
                <span>{role.name}</span>
              )}

              <div className="flex gap-2">
                {editingRoleId === role.id ? (
                  <button
                    onClick={() => handleUpdateRole(role.id)}
                    className="text-green-600 hover:underline text-xs"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartEditRole(role)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleRemoveRole(role.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteError && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
          <p className="text-sm font-medium">{deleteError}</p>
          <button
            onClick={() => setDeleteError(null)}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
