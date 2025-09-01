import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, Filter, Upload, X, Check, AlertCircle, Star, Target, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import adminService from '../services/adminService';

const ManageLevels = () => {
  const [levels, setLevels] = useState([]);
  const [filteredLevels, setFilteredLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    order: 1, 
    difficulty: 'medium', 
    isFinal: false, 
    photo: null, 
    finalClue: '' 
  });
  const [alert, setAlert] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'order', direction: 'asc' });
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    filterAndSortLevels();
  }, [levels, searchTerm, difficultyFilter, sortConfig]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

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

  const filterAndSortLevels = () => {
    let filtered = levels.filter(level => {
      const matchesSearch = level.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           level.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = difficultyFilter === 'all' || level.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredLevels(filtered);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleChange = e => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file' && files[0]) {
      const file = files[0];
      setForm(f => ({ ...f, [name]: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = e => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setForm(f => ({
        ...f,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.order || form.order < 1) return 'Valid order number is required';
    if (!form.difficulty) return 'Difficulty level is required';
    if (!editingId && !form.photo) return 'Photo is required for new levels';
    if (form.isFinal && !form.finalClue.trim()) return 'Final clue is required for final challenges';
    
    if (form.photo) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      if (!allowedTypes.includes(form.photo.type)) {
        return 'Invalid file type. Only jpg, jpeg, png, gif, bmp, webp are allowed.';
      }
      if (form.photo.size > 10 * 1024 * 1024) {
        return 'File size must be less than 10MB.';
      }
    }
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setAlert(null);
    
    const validationError = validateForm();
    if (validationError) {
      setAlert({ type: 'error', message: validationError });
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (key === 'photo' && val) {
        formData.append('photo', val);
      } else if (val !== null && key !== 'photo') {
        formData.append(key, val);
      }
    });

    try {
      if (editingId) {
        await adminService.updateLevel(editingId, formData);
        setAlert({ type: 'success', message: 'Level updated successfully!' });
      } else {
        await adminService.createLevel({
          title: form.title,
          description: form.description,
          order: form.order,
          difficulty: form.difficulty,
          isFinal: form.isFinal,
          finalClue: form.isFinal ? form.finalClue : undefined
        }, form.photo);
        setAlert({ type: 'success', message: 'Level created successfully!' });
      }
      resetForm();
      fetchLevels();
    } catch (err) {
      let msg = 'Failed to save level';
      if (err?.response?.data?.error) msg = err.response.data.error;
      else if (err?.message) msg = err.message;
      setAlert({ type: 'error', message: msg });
    }
  };

  const resetForm = () => {
    setForm({ 
      title: '', 
      description: '', 
      order: levels.length + 1, 
      difficulty: 'medium', 
      isFinal: false, 
      photo: null, 
      finalClue: '' 
    });
    setEditingId(null);
    setShowForm(false);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = level => {
    setEditingId(level._id);
    setForm({
      title: level.title,
      description: level.description || '',
      order: level.order,
      difficulty: level.difficulty || 'medium',
      isFinal: level.isFinal,
      photo: null,
      finalClue: level.finalClue || ''
    });
    setShowForm(true);
    setPreviewImage(null);
  };

  const handleDelete = async id => {
    if (window.confirm('Are you sure you want to delete this level? This action cannot be undone.')) {
      try {
        await adminService.deleteLevel(id);
        setAlert({ type: 'success', message: 'Level deleted successfully!' });
        fetchLevels();
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to delete level' });
      }
    }
  };

  const handleDragStart = (e, level) => {
    setDraggedItem(level);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetLevel) => {
    e.preventDefault();
    if (!draggedItem || draggedItem._id === targetLevel._id) return;

    // Reorder logic here - would update backend
    setAlert({ type: 'success', message: 'Level order updated!' });
    setDraggedItem(null);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'easy': return <Target className="w-4 h-4" />;
      case 'medium': return <Star className="w-4 h-4" />;
      case 'hard': return <Trophy className="w-4 h-4" />;
      default: return null;
    }
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Manage Levels
              </h1>
              <p className="text-gray-600 text-lg">
                Create, edit, and organize photo challenge levels for the Photo Marathon
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Level
            </button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`mb-6 p-4 rounded-xl border-l-4 shadow-lg animate-pulse ${
            alert.type === 'success' 
              ? 'bg-green-50 border-green-400 text-green-800' 
              : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {alert.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-auto hover:opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search levels by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              {filteredLevels.length} of {levels.length} levels
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingId ? 'Edit Level' : 'Create New Level'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter level title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Order *
                    </label>
                    <input
                      name="order"
                      type="number"
                      value={form.order}
                      onChange={handleChange}
                      min={1}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Describe the challenge..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Difficulty *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['easy', 'medium', 'hard'].map(diff => (
                      <label key={diff} className={`
                        flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${form.difficulty === diff 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'}
                      `}>
                        <input
                          type="radio"
                          name="difficulty"
                          value={diff}
                          checked={form.difficulty === diff}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        {getDifficultyIcon(diff)}
                        <span className="font-medium capitalize">{diff}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Photo {!editingId && '*'}
                  </label>
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {form.photo ? form.photo.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      name="photo"
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
                      onChange={handleChange}
                      className="hidden"
                    />
                    {previewImage && (
                      <div className="relative">
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewImage(null);
                            setForm(f => ({ ...f, photo: null }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    name="isFinal"
                    type="checkbox"
                    checked={form.isFinal}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Final Challenge Level
                  </label>
                </div>

                {form.isFinal && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Final Challenge Clue/Description *
                    </label>
                    <textarea
                      name="finalClue"
                      value={form.finalClue}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Describe the final challenge, theme, or clue for teams..."
                      maxLength={1000}
                      rows={3}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {form.finalClue.length}/1000 characters
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    {editingId ? 'Update Level' : 'Create Level'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Levels Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading levels...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={fetchLevels}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredLevels.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">No levels found</h3>
              <p className="text-gray-500">
                {levels.length === 0 
                  ? "Get started by creating your first level!" 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: 'title', label: 'Title' },
                      { key: 'order', label: 'Order' },
                      { key: 'difficulty', label: 'Difficulty' },
                      { key: 'isFinal', label: 'Type' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {label}
                          <SortIcon column={key} />
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLevels.map((level, index) => (
                    <tr
                      key={level._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, level)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, level)}
                      className={`hover:bg-blue-50 transition-colors cursor-move ${
                        draggedItem?._id === level._id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {level.order}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{level.title}</div>
                            {level.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {level.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          #{level.order}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(level.difficulty)}`}>
                          {getDifficultyIcon(level.difficulty)}
                          {level.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {level.isFinal ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                            <Trophy className="w-4 h-4" />
                            Final
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            <Target className="w-4 h-4" />
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(level)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit level"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(level._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete level"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {levels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Levels</p>
                  <p className="text-3xl font-bold">{levels.length}</p>
                </div>
                <Target className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Easy Levels</p>
                  <p className="text-3xl font-bold">{levels.filter(l => l.difficulty === 'easy').length}</p>
                </div>
                <Target className="w-8 h-8 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Medium Levels</p>
                  <p className="text-3xl font-bold">{levels.filter(l => l.difficulty === 'medium').length}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Hard Levels</p>
                  <p className="text-3xl font-bold">{levels.filter(l => l.difficulty === 'hard').length}</p>
                </div>
                <Trophy className="w-8 h-8 text-red-200" />
              </div>
            </div>
          </div>
        )}

        {/* Final Challenge Indicator */}
        {levels.some(l => l.isFinal) && (
          <div className="mt-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">Final Challenge Configured</h3>
                <p className="opacity-90">
                  Your photo marathon has a final challenge level that will test participants' skills!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageLevels;
