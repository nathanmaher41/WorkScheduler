import React, { useEffect, useState } from 'react';
import ConfirmDeleteCalendarModal from './ConfirmDeleteCalendarModal';
import CollapsibleSection from './CollapsibleSection';
import axios from '../utils/axios';


export default function CalendarSettingsModal({ isOpen, onClose, calendar, members, currentUserId, roles = [], onRename, onUpdateColor, onUpdateRole, onUpdateSettings, currentMember }) {
    if (!isOpen) return null;

    const [newRoleName, setNewRoleName] = useState('');
    const [localRoles, setLocalRoles] = useState([...roles]);
    const [requireTakeApproval, setRequireTakeApproval] = useState(true);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [newCalendarName, setNewCalendarName] = useState('');
    const [selfRoleChangeAllowed, setSelfRoleChangeAllowed] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [deleteError, setDeleteError] = useState(null);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [editedRoleName, setEditedRoleName] = useState('');
    const [permissionMode, setPermissionMode] = useState('Members');
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [permissionMap, setPermissionMap] = useState({
    Members: {},
    Roles: {},
    });
    

    const togglePermission = (type, id, key) => {
    setPermissionMap((prev) => ({
        ...prev,
        [type]: {
        ...prev[type],
        [id]: {
            ...prev[type]?.[id],
            [key]: !prev[type]?.[id]?.[key],
        },
        },
    }));
    };

    const formatPermissionLabel = (key) =>
    ({
        manage_calendar_settings: 'Can manage calendar settings (rename calendar, toggle rules)',
        manage_roles: 'Can manage roles (create, rename, delete roles)',
        manage_colors: 'Can manage colors (edit member display colors)',
        edit_schedules: 'Can create/edit/delete schedules',
        edit_shifts: 'Can create/edit/delete shifts',
        approve_swaps: 'Can approve/reject shift swap requests',
        approve_takes: 'Can approve/reject take shift requests',
        approve_time_off: 'Can approve/reject time off requests',
        manage_holidays: 'Can mark holidays or altered work hours',
        manage_members: 'Can invite/remove members',
        assign_roles: 'Can assign/change roles for others',
        toggle_admin: 'Can promote/demote members to/from admin',
        send_notifications: 'Can send announcements/notifications to calendar.',
    }[key]);

    const grantFullAdmin = (type, id) => {
    const allKeys = [
        'manage_calendar_settings', 'manage_roles', 'manage_colors',
        'edit_schedules', 'edit_shifts', 'approve_swaps', 'approve_takes',
        'approve_time_off', 'manage_holidays',
        'manage_members', 'assign_roles', 'toggle_admin',
        'send_notifications'
    ];
    setPermissionMap((prev) => ({
        ...prev,
        [type]: {
        ...prev[type],
        [id]: Object.fromEntries(allKeys.map(k => [k, true])),
        },
    }));
    };


    
    const handleAddRole = async () => {
        const trimmed = newRoleName.trim();
        if (!trimmed || localRoles.some(r => r.name === trimmed)) return;

        try {
            const res = await axios.post(`/api/calendars/${calendar.id}/roles/add/`, {
            name: trimmed,
            });
            setLocalRoles(prev => [...prev, res.data]);
            setNewRoleName('');
        } catch (err) {
            console.error('Failed to add role:', err);
        }
    };

    const handleRemoveRole = async (roleId) => {
        try {
            console.log("🗑️ Attempting to delete role ID:", roleId);
            await axios.delete(`/api/calendars/${calendar.id}/roles/${roleId}/delete`);
            setLocalRoles(prev => prev.filter(r => r.id !== roleId));
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to delete role.';
            console.error("🧨 Delete failed:", err.response?.data || err);
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

        const res = await axios.put(`/api/calendars/${calendar.id}/roles/${roleId}/rename/`, {
        name: trimmed,
        });

        setLocalRoles(prev => prev.map(r => r.id === roleId ? res.data : r));
        setEditingRoleId(null);
        setEditedRoleName('');
    } catch (err) {
        console.error("Rename failed:", err.response?.data || err);
    }
    };



    useEffect(() => {
    if (isOpen) {
        setNewCalendarName(calendar.name);
        setSelfRoleChangeAllowed(calendar.self_role_change_allowed);
    }
    }, [isOpen]);

   useEffect(() => {
        setSelfRoleChangeAllowed(calendar?.self_role_change_allowed ?? false);
    }, [calendar?.id, calendar?.self_role_change_allowed]);

    const colors = [
    '#FF8A80', '#F8BBD0', '#E53935', '#B71C1C', '#D81B60', '#880E4F',
    '#FFD180', '#E65100', '#FFF59D', '#FFEB3B', '#F9A825', '#A5D6A7',
    '#43A047', '#1B5E20', '#B2DFDB', '#009688', '#004D40', '#90CAF9',
    '#1E88E5', '#0D47A1', '#CE93D8', '#8E24AA', '#4A148C', '#BCAAA4',
    '#8D6E63', '#3E2723'
    ];

    const usedColors = new Set(members.map(m => m.color).filter(Boolean));
    const [selectedColor, setSelectedColor] = useState(
    members.find(m => m.id === currentUserId)?.color || ''
    );

    // const currentMember = members.find(m => m.id === currentUserId);

    function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    useEffect(() => {
    if (currentMember?.title_id) {
        setSelectedRoleId(currentMember.title_id);
    }
    }, [currentMember]);

    


    const handleApplyChanges = async () => {
        try {
            if (selectedColor !== currentMember?.color) {
                await onUpdateColor(calendar.id, currentUserId, selectedColor);
            }
            if (selectedRoleId && selectedRoleId !== currentMember?.title_id) {
                await onUpdateRole(calendar.id, currentUserId, selectedRoleId);
            }
            await onUpdateSettings(calendar.id, {
                self_role_change_allowed: selfRoleChangeAllowed,
            });
            console.log('✅ Color and/or role updated successfully');
        } catch (err) {
            console.error('Error applying changes:', err);
        }
    };

    const selfCanChange = calendar.self_role_change_allowed || currentMember?.is_admin;


    return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Calendar Settings</h2>

        <CollapsibleSection title="General">
            <label className="block text-sm font-medium text-black dark:text-white mb-1">Calendar Name</label>
            <input
            type="text"
            value={newCalendarName}
            onChange={(e) => setNewCalendarName(e.target.value)}
            className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:text-white"
            />
        </CollapsibleSection>

        <CollapsibleSection title="Your Identity">
            <label className="block text-sm font-medium text-black dark:text-white mb-1">Your Display Color</label>
            <div className="flex flex-wrap gap-2 mb-4">
            {colors.map((color) => {
                const isUsed = usedColors.has(color) && color !== selectedColor;
                return (
                <div className="relative" key={color}>
                    <button
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    disabled={isUsed}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                        selectedColor === color ? 'border-white ring-2 ring-white' :
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
            <label className="block text-sm font-medium text-black dark:text-white mb-1">Your Role</label>
           <select
                className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:text-white"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                disabled={!selfCanChange}
                >
                {!selectedRoleId && <option value="">-- Choose a role --</option>}
                {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
        </CollapsibleSection>

       <CollapsibleSection title="Role Management">
        {/* Add Role Input */}
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

        {/* Role List */}
        {localRoles.length > 0 && (
            <ul className="space-y-1 text-sm text-black dark:text-white">
            {localRoles.map((role) => (
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
        </CollapsibleSection>

        <CollapsibleSection title="Rules">
            <label className="flex items-center gap-2 text-sm text-black dark:text-white mb-2">
                <input
                    type="checkbox"
                    className="accent-purple-600"
                    checked={selfRoleChangeAllowed}
                    onChange={async () => {
                    const newVal = !selfRoleChangeAllowed;
                    setSelfRoleChangeAllowed(newVal);
                    try {
                        await onUpdateSettings(calendar.id, { self_role_change_allowed: newVal });
                    } catch (err) {
                        console.error("Failed to update self-role-change:", err);
                    }
                    }}
                />
                Allow users to change their own role
            </label>
            <label className="flex items-center gap-2 text-sm text-black dark:text-white mb-2">
            <input type="checkbox" className="accent-purple-600" />
            Allow shift swaps without admin approval
            </label>
            <label className="flex items-center gap-2 text-sm text-black dark:text-white">
            <input
                type="checkbox"
                className="accent-purple-600"
                checked={requireTakeApproval}
                onChange={() => setRequireTakeApproval(prev => !prev)}
            />
            Require admin approval for take shift requests
            </label>
        </CollapsibleSection>

        <CollapsibleSection title="Permissions">
        {/* View Mode Toggle */}
        <div className="flex space-x-2 mb-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            {['Members', 'Roles', 'Overview'].map((mode) => (
            <button
                key={mode}
                className={`flex-1 py-2 text-sm font-medium transition ${
                permissionMode === mode
                    ? 'bg-white dark:bg-gray-900 text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setPermissionMode(mode)}
            >
                {mode}
            </button>
            ))}
        </div>

        {/* Selector Dropdown */}
        {permissionMode !== 'Overview' && (
            <select
            className="w-full mb-4 px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(Number(e.target.value))}
            >
            <option value="">-- Select a {permissionMode === 'Members' ? 'member' : 'role'} --</option>
            {(permissionMode === 'Members' ? members : roles).map((entity) => (
                <option key={entity.id} value={entity.id}>
                {permissionMode === 'Members' ? entity.full_name || entity.username : entity.name}
                </option>
            ))}
            </select>
        )}

        {/* Promote Button */}
        {permissionMode !== 'Overview' && selectedTargetId && (
            <div className="mb-4">
            <button
                onClick={() => setShowPromoteConfirm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
                Promote to Full Admin
            </button>
            </div>
        )}

        {/* Permissions Group */}
        {permissionMode !== 'Overview' && selectedTargetId && (
            <div className="space-y-4">
            {[
                {
                section: '🔐 General Admin Permissions',
                keys: [
                    'manage_calendar_settings',
                    'manage_roles',
                    'manage_colors',
                ],
                },
                {
                section: '📅 Schedule & Shift Management',
                keys: [
                    'edit_schedules',
                    'edit_shifts',
                    'approve_swaps',
                    'approve_takes',
                ],
                },
                {
                section: '📆 Time Off & Holiday Management',
                keys: ['approve_time_off', 'manage_holidays'],
                },
                {
                section: '👥 Member Management',
                keys: ['manage_members', 'assign_roles', 'toggle_admin'],
                },
                {
                section: '🔔 Notification & Communication',
                keys: ['send_notifications'],
                },
            ].map(({ section, keys }) => (
                <div key={section}>
                <h4 className="font-semibold text-black dark:text-white mb-1">{section}</h4>
                <div className="space-y-1">
                    {keys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-black dark:text-white">
                        <input
                        type="checkbox"
                        className="accent-purple-600"
                        checked={permissionMap?.[permissionMode]?.[selectedTargetId]?.[key] || false}
                        onChange={() => togglePermission(permissionMode, selectedTargetId, key)}
                        />
                        {formatPermissionLabel(key)}
                    </label>
                    ))}
                </div>
                </div>
            ))}
            </div>
        )}

        {/* Promote Confirmation Modal */}
        {showPromoteConfirm && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow max-w-sm w-full">
                <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Admin Promotion</h3>
                <p className="text-sm text-gray-800 dark:text-gray-300 mb-4">
                Are you sure you want to grant full admin access to this {permissionMode === 'Members' ? 'member' : 'role'}?
                This gives full control over settings, shifts, and members.
                </p>
                <div className="flex justify-end gap-2">
                <button
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded"
                    onClick={() => setShowPromoteConfirm(false)}
                >
                    Cancel
                </button>
                <button
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    onClick={() => {
                    grantFullAdmin(permissionMode, selectedTargetId);
                    setShowPromoteConfirm(false);
                    }}
                >
                    Confirm
                </button>
                </div>
            </div>
            </div>
        )}
        </CollapsibleSection>


        <CollapsibleSection title="Danger Zone" defaultOpen={false}>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Deleting the calendar will remove it for all members and delete all associated data.
            </p>
            <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => setShowConfirmDelete(true)}
            >
            Delete Calendar
            </button>
        </CollapsibleSection>

        <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded">
            Cancel
            </button>
            <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={async () => {
                await handleApplyChanges();
                try {
                await onRename(calendar.id, newCalendarName);
                onClose();
                } catch (err) {
                alert('Error updating calendar name');
                }
            }}
            >
            Save Changes
            </button>
        </div>
        </div>

        {showConfirmDelete && (
        <ConfirmDeleteCalendarModal
            calendarName={calendar.name}
            onDelete={() => console.log("🔴 Delete calendar triggered")}
            onClose={() => setShowConfirmDelete(false)}
        />
        )}

        {deleteError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Cannot Delete Role</h3>
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-4">
                    {deleteError}
                </p>
                <div className="flex justify-end">
                    <button
                    onClick={() => setDeleteError(null)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                    Got it
                    </button>
                </div>
                </div>
            </div>
            )}
    </div>
    );
}
