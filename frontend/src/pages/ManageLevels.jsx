import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import adminService from '../services/adminService';

const ManageLevels = () => {
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', order: 1, difficulty: 'medium', isFinal: false, photo: null });
  const [alert, setAlert] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLevels();
    // eslint-disable-next-line
  }, []);

  const fetchLevels = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllLevels();
      setLevels(res || []);
    } catch (err) {
      setError('Failed to load levels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value, type, checked, files } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value)
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setAlert(null);
    // Validate required fields
    if (!form.title || !form.order || !form.difficulty) {
      setAlert('Please fill all required fields.');
      return;
    }
    if (!form.photo) {
      setAlert('Please upload a photo file.');
      return;
    }
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(form.photo.type)) {
      setAlert('Invalid file type. Only jpg, jpeg, png, gif, bmp, webp are allowed.');
      return;
    }
    // Validate file size (max 10MB)
    if (form.photo.size > 10 * 1024 * 1024) {
      setAlert('File size must be less than 10MB.');
      return;
    }
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (key === 'photo' && val) {
        formData.append('photo', val); // send as 'photo' for backend
      } else if (val !== null && key !== 'photo') {
        formData.append(key, val);
      }
    });
    try {
      if (editingId) {
        await adminService.updateLevel(editingId, formData);
      } else {
        await adminService.createLevel(
          {
            title: form.title,
            description: form.description,
            order: form.order,
            difficulty: form.difficulty,
            isFinal: form.isFinal
          },
          form.photo
        );
      }
      setForm({ title: '', description: '', order: 1, difficulty: 'medium', isFinal: false, photo: null });
      setEditingId(null);
      fetchLevels();
    } catch (err) {
      let msg = 'Failed to save level';
      if (err?.response?.data?.error) msg = err.response.data.error;
      else if (err?.message) msg = err.message;
      setError(msg);
    }
  };

  const handleEdit = level => {
    setEditingId(level._id);
    setForm({
      title: level.title,
      description: level.description || '',
      order: level.order,
      difficulty: level.difficulty || 'medium',
      isFinal: level.isFinal,
      photo: null
    });
  };

  const handleDelete = async id => {
    if (window.confirm('Delete this level?')) {
      try {
        await adminService.deleteLevel(id);
        fetchLevels();
      } catch (err) {
        setError('Failed to delete level');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Levels</h1>
        <p className="text-gray-600">
          Create, edit, and organize photo challenge levels for the Photo Marathon
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold mb-2">Title</label>
            <input name="title" value={form.title} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-2">Order</label>
            <input name="order" type="number" value={form.order} onChange={handleChange} min={1} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-2">Difficulty</label>
            <select name="difficulty" value={form.difficulty} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-2">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-2">Photo</label>
            <input name="photo" type="file" accept=".jpg,.jpeg,.png,.gif,.bmp,.webp" onChange={handleChange} className="w-full" />
          </div>
          {alert && (
            <div className="col-span-2 text-red-600 font-semibold mb-2">{alert}</div>
          )}
          <div className="flex items-center mt-6">
            <label className="mr-2 font-semibold">Final Challenge</label>
            <input name="isFinal" type="checkbox" checked={form.isFinal} onChange={handleChange} />
          </div>
          <div className="col-span-2 mt-4">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
              {editingId ? 'Update' : 'Create'} Level
            </button>
            {editingId && (
              <button type="button" className="ml-4 px-6 py-2 rounded bg-gray-300" onClick={() => { setEditingId(null); setForm({ title: '', description: '', order: 1, difficulty: 'medium', isFinal: false, image: null }); }}>Cancel</button>
            )}
          </div>
        </form>
        {isLoading ? (
          <div className="text-center py-12">Loading levels...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : levels.length === 0 ? (
          <div className="text-center py-12">No levels found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {levels.map(level => (
                <tr key={level._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{level.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{level.order}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{level.difficulty}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{level.isFinal ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded mr-2" onClick={() => handleEdit(level)}>Edit</button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={() => handleDelete(level._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManageLevels;
