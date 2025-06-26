import { useState } from 'react';

export default function CreateCalendarModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [rolesInput, setRolesInput] = useState('');
  const [creatorTitle, setCreatorTitle] = useState('');
  const [addCreatorTitleToRoles, setAddCreatorTitleToRoles] = useState(false);
  const [roleTags, setRoleTags] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [errors, setErrors] = useState({});


  const colors = [
  '#FF8A80', '#F8BBD0', '#E53935', '#B71C1C',
  '#D81B60', '#880E4F', '#FFD180', '#E65100', '#FFEB3B', '#F9A825', '#A5D6A7',
  '#43A047', '#1B5E20', '#B2DFDB', '#009688',
  '#004D40', '#90CAF9', '#1E88E5', '#0D47A1',
  '#CE93D8', '#8E24AA', '#4A148C', '#BCAAA4',
  '#8D6E63', '#3E2723'
];

  const handleAddRole = () => {
    const trimmed = rolesInput.trim();
    if (trimmed && !roleTags.includes(trimmed)) {
      setRoleTags([...roleTags, trimmed]);
      setRolesInput('');
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setRoleTags(roleTags.filter(role => role !== roleToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalRoles = addCreatorTitleToRoles && creatorTitle.trim()
      ? [...roleTags, creatorTitle.trim()]
      : roleTags;

    const newErrors = {};
    if (!selectedColor) {
      newErrors.color = 'Please pick a color.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log("📦 Submitting calendar:", {
      name,
      input_roles: finalRoles,
      creator_title: creatorTitle,
      color: selectedColor,
    });

    onCreate({ name, input_roles: finalRoles, creator_title: creatorTitle, color: selectedColor });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Create Calendar</h2>

        <label className="block mb-2 font-medium">Calendar Name</label>
        <input
          type="text"
          className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="block mb-2 font-medium">Your Title</label>
        <input
          type="text"
          className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
          placeholder="e.g. Manager"
          value={creatorTitle}
          onChange={(e) => setCreatorTitle(e.target.value)}
        />

        <label className="block mb-2 font-medium">Pick a Color</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  selectedColor === color ? 'border-black dark:border-white' : 'border-transparent'
                }`}
                style={{
                  backgroundColor: color,
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
          {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}


        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={addCreatorTitleToRoles}
              onChange={() => setAddCreatorTitleToRoles(!addCreatorTitleToRoles)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Add to roles — this title will be available for others to pick when joining</span>
          </label>
        </div>

        <label className="block mb-2 font-medium">Add Additonal Roles</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
            placeholder="e.g. Stylist"
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
          />
          <button
            type="button"
            onClick={handleAddRole}
            className="bg-gray-300 dark:bg-gray-600 px-3 rounded text-black dark:text-white"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {roleTags.map((role) => (
            <span
              key={role}
              className="bg-purple-200 dark:bg-purple-600 text-sm text-purple-800 dark:text-white px-2 py-1 rounded-full cursor-pointer"
              onClick={() => handleRemoveRole(role)}
            >
              {role} ✕
            </span>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
