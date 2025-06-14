import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { PERMISSION_SECTIONS } from '../utils/constants';
import CollapsibleSection from './CollapsibleSection';

export default function PermissionsPanel({ calendarId, calendar, roles: initialRoles = [], members: initialMembers = [], onUpdateSettings }) {
  const [permissionMode, setPermissionMode] = useState('Members');
  const [members, setMembers] = useState(initialMembers);
  const [roles, setRoles] = useState(initialRoles);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [permissionMap, setPermissionMap] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (initialMembers.length === 0) {
      axios.get(`/api/calendars/${calendarId}/members/`).then((res) => setMembers(res.data));
    }
    if (initialRoles.length === 0) {
      axios.get(`/api/calendars/${calendarId}/roles/`).then((res) => setRoles(res.data));
    }
  }, [calendarId, initialMembers, initialRoles]);

  const { self_role_change_allowed, allow_swap_without_approval, require_take_approval } = calendar || {};

  useEffect(() => {
    if (!selectedTargetId || permissionMode === 'Overview') return;

    const isValidId =
        permissionMode === 'Members'
        ? members.some((m) => m.membership_id === parseInt(selectedTargetId))
        : roles.some((r) => r.id === parseInt(selectedTargetId));

    if (!isValidId) {
        console.log("⛔ Skipping fetch due to mismatched ID.");
        return;
    }

    const fetchPermissions = async () => {
        const endpoint =
        permissionMode === 'Members'
            ? `/api/calendars/${calendarId}/members/${selectedTargetId}/effective-permissions/`
            : `/api/calendars/${calendarId}/roles/${selectedTargetId}/permissions/`;

        try {
        const res = await axios.get(endpoint);
        const perms = res.data.permissions || res.data; // roles endpoint may return plain array
        console.log("✅ Fetched permissions:", perms);

        setPermissionMap((prev) => ({
            ...prev,
            [permissionMode]: {
            ...prev[permissionMode],
            [selectedTargetId]: perms.reduce((acc, permObj) => {
                acc[permObj.codename] = true;
                return acc;
            }, {}),
            },
        }));
        } catch (err) {
        console.error('❌ Failed to load permissions:', err);
        }
    };

    fetchPermissions();
    }, [calendarId, selectedTargetId, permissionMode, members, roles]);


        useEffect(() => {
        setSelectedTargetId('');
        }, [permissionMode]);

  const togglePermission = (mode, targetId, permKey) => {
    setPermissionMap((prev) => {
        const updated = { ...prev };
        const current = updated[mode]?.[targetId] || {};

        updated[mode] = {
        ...updated[mode],
        [targetId]: {
            ...current,
            [permKey]: !current[permKey],
        },
        };
        console.log("🧠 Updated permissionMap:", updated);

        return updated;
    });
    };

  const grantFullAdmin = (mode, targetId) => {
    setPermissionMap((prev) => {
      const updated = { ...prev };
      if (!updated[mode]) updated[mode] = {};
      updated[mode][targetId] = {};
      PERMISSION_SECTIONS.forEach(section => {
        section.permissions.forEach(key => {
          updated[mode][targetId][key] = true;
        });
      });
      return updated;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedTargetId) return;

    const targetPerms = permissionMap[permissionMode]?.[selectedTargetId] || {};
    const selectedPerms = Object.entries(targetPerms)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    const endpoint =
      permissionMode === 'Members'
        ? `/api/calendars/${calendarId}/members/${selectedTargetId}/permissions/`
        : `/api/calendars/${calendarId}/roles/${selectedTargetId}/permissions/`;

    try {
      await axios.post(endpoint, { permissions: selectedPerms });
      //alert('Permissions saved!');
      setSaveStatus('success');
    } catch (err) {
      console.error('Failed to save permissions:', err);
      //alert('Failed to save permissions.');
      setSaveStatus('error');
    }

    setTimeout(() => {
      setSaveStatus(null);
    }, 3000);
  };

  const formatPermissionLabel = (key) =>
    PERMISSION_SECTIONS.flatMap(s => s.permissions.map(k => ({ section: s.label, k })))
      .find(item => item.k === key)?.k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || key;

  return (
    <>
    <CollapsibleSection title="Calendar Rules">
      <label className="flex items-center gap-2 text-sm text-black dark:text-white mb-2">
        <input
          type="checkbox"
          className="accent-purple-600"
          checked={self_role_change_allowed || false}
          onChange={e => onUpdateSettings(calendarId, { self_role_change_allowed: e.target.checked })}
        />
        Allow users to change their own role
      </label>

      <label className="flex items-center gap-2 text-sm text-black dark:text-white mb-2">
        <input
          type="checkbox"
          className="accent-purple-600"
          checked={allow_swap_without_approval || false}
          onChange={e => onUpdateSettings(calendarId, { allow_swap_without_approval: e.target.checked })}
        />
        Allow shift swaps without admin approval
      </label>

      <label className="flex items-center gap-2 text-sm text-black dark:text-white">
        <input
          type="checkbox"
          className="accent-purple-600"
          checked={require_take_approval || false}
          onChange={e => onUpdateSettings(calendarId, { require_take_approval: e.target.checked })}
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
          onChange={(e) => setSelectedTargetId(e.target.value || '')}
        >
          <option value="">-- Select a {permissionMode === 'Members' ? 'member' : 'role'} --</option>
          {(permissionMode === 'Members' ? members : roles).map((entity) => (
            <option
            key={permissionMode === 'Members' ? entity.membership_id : entity.id}
            value={permissionMode === 'Members' ? entity.membership_id : entity.id}
            >
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
          {PERMISSION_SECTIONS.map(({ label, permissions }) => (
            <div key={label}>
              <h4 className="font-semibold text-black dark:text-white mb-1">{label}</h4>
              <div className="space-y-1">
                {permissions.map((key) => (
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

      {/* Save Button */}
      <div className="mt-4">
       <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSavePermissions}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Permissions
        </button>

        {saveStatus === 'success' && (
          <span className="text-green-600 text-sm animate-fade-in-out">✅ Saved!</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600 text-sm animate-fade-in-out">❌ Failed to save</span>
        )}
      </div>
      </div>

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
    </>
  );
}
