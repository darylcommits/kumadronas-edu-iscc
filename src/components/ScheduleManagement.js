// ScheduleManagement.js - Updated with beautiful toast notifications
import React, { useState, useEffect } from 'react';
import { supabase, dbHelpers } from '../lib/supabase';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Check,
  X,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  User,
  Mail,
  Phone,
  Hash,
  GraduationCap,
  MapPin,
  Edit3,
  Save,
  Map,
  Users
} from 'lucide-react';
import { useToast, ToastContainer } from './Toast';

/* ── Modal components defined OUTSIDE to prevent remount on parent re-render ── */

const ViewStudentModal = ({ student, onClose }) => {
  const { first_name: firstName, last_name: lastName, middle_initial: middleInitial } = student;
  const totalDuties = student.schedule_students?.length || 0;
  const completedDuties = student.schedule_students?.filter(s => s.status === 'completed').length || 0;
  const rate = totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold border border-white/30 shadow-inner">
              {(firstName?.[0] || '') + (lastName?.[0] || '')}
            </div>
            <div>
              <p className="text-xs text-emerald-100 font-semibold uppercase tracking-wide opacity-80">Student Profile</p>
              <h3 className="text-2xl font-bold">{firstName} {lastName}</h3>
              <p className="text-emerald-50 text-sm opacity-90">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
              <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total</p>
              <p className="text-2xl font-black text-emerald-700">{totalDuties}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Done</p>
              <p className="text-2xl font-black text-blue-700">{completedDuties}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl text-center border border-purple-100">
              <p className="text-xs text-purple-600 font-bold uppercase mb-1">Rate</p>
              <p className="text-2xl font-black text-purple-700">{rate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg"><Hash className="w-4 h-4 text-gray-500" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase">Student ID</p><p className="font-semibold text-gray-700">{student.student_number || 'N/A'}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg"><GraduationCap className="w-4 h-4 text-gray-400" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase">Year Level</p><p className="font-semibold text-gray-700">{student.year_level || 'N/A'}</p></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg"><Phone className="w-4 h-4 text-gray-400" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase">Contact</p><p className="font-semibold text-gray-700">{student.phone_number || 'N/A'}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg"><Calendar className="w-4 h-4 text-gray-400" /></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase">Joined</p><p className="font-semibold text-gray-700">{new Date(student.created_at).toLocaleDateString()}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const AddScheduleModal = ({
  newSchedule, setNewSchedule,
  handleCreateSchedule, setShowAddModal,
  hospitalLocations, getHospitalForMonth
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h3 className="text-lg font-semibold mb-4">Add New Schedule</h3>
      <form onSubmit={handleCreateSchedule} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={newSchedule.date}
            onChange={(e) => {
              const selectedDate = e.target.value;
              const assignedHospital = selectedDate ? getHospitalForMonth(new Date(selectedDate)) : null;
              setNewSchedule({
                ...newSchedule,
                date: selectedDate,
                location: assignedHospital ? assignedHospital.name : '',
                max_students: assignedHospital ? assignedHospital.capacity : 4
              });
            }}
            className="input-field"
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={newSchedule.description}
            onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
            className="input-field"
            placeholder="Community Health Center Duty"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Location</label>
          <select
            value={newSchedule.location}
            onChange={(e) => {
              const selectedLocation = hospitalLocations.find(loc => loc.name === e.target.value);
              setNewSchedule({
                ...newSchedule,
                location: e.target.value,
                max_students: selectedLocation ? selectedLocation.capacity : 2
              });
            }}
            className="input-field"
            required
            disabled={!newSchedule.date}
          >
            <option value="">Select a hospital</option>
            {hospitalLocations.map((hospital) => {
              const isAssigned = newSchedule.date && getHospitalForMonth(new Date(newSchedule.date)).name === hospital.name;
              return (
                <option key={hospital.name} value={hospital.name}>
                  {hospital.name} ({hospital.capacity} slots){isAssigned ? ' - Assigned Hospital' : ''}
                </option>
              );
            })}
          </select>
          {newSchedule.location && (
            <p className="text-xs text-gray-500 mt-1">
              {hospitalLocations.find(loc => loc.name === newSchedule.location)?.description}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Schedule</label>
          <select
            value={`${newSchedule.shift_start}-${newSchedule.shift_end}`}
            onChange={(e) => {
              const [start, end] = e.target.value.split('-');
              setNewSchedule({ ...newSchedule, shift_start: start, shift_end: end });
            }}
            className="input-field"
            required
          >
            <option value="">Select Shift Schedule</option>
            <option value="08:00-20:00">Day Shift: 8:00 AM - 8:00 PM</option>
            <option value="18:00-06:00">Night Shift: 6:00 PM - 6:00 AM</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
          <input
            type="number"
            min="1"
            value={newSchedule.max_students}
            onChange={(e) => setNewSchedule({ ...newSchedule, max_students: parseInt(e.target.value) || 4 })}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Default set based on hospital, but can be overridden.</p>
        </div>

        <div className="flex space-x-3 pt-4">
          <button type="submit" className="btn-primary flex-1">Create Schedule</button>
          <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </form>
    </div>
  </div>
);

const BulkCreateModal = ({ generateBulkSchedules, setShowBulkModal, hospitalLocations }) => {
  const [bulkData, setBulkData] = useState({
    startDate: '',
    endDate: '',
    daysOfWeek: [1, 2, 3, 4, 5]
  });
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    setSelectedHospitals(
      hospitalLocations.map(h => ({ ...h, selected: false, shift: '08:00-20:00' }))
    );
  }, [hospitalLocations]);

  const toggleHospital = (idx) => {
    setSelectedHospitals(prev =>
      prev.map((h, i) => i === idx ? { ...h, selected: !h.selected } : h)
    );
  };

  const setHospitalShift = (idx, shift) => {
    setSelectedHospitals(prev =>
      prev.map((h, i) => i === idx ? { ...h, shift } : h)
    );
  };

  const chosenHospitals = selectedHospitals.filter(h => h.selected);

  const handleCreate = () => {
    if (!bulkData.startDate || !bulkData.endDate) return;
    if (chosenHospitals.length === 0) return;
    generateBulkSchedules(bulkData.startDate, bulkData.endDate, bulkData.daysOfWeek, chosenHospitals);
    setShowBulkModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Bulk Create Schedules</h3>
        <div className="space-y-5">

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={bulkData.startDate}
                onChange={(e) => setBulkData({ ...bulkData, startDate: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={bulkData.endDate}
                onChange={(e) => setBulkData({ ...bulkData, endDate: e.target.value })}
                className="input-field"
                required
                min={bulkData.startDate}
              />
            </div>
          </div>

          {/* Days of week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newDays = bulkData.daysOfWeek.includes(index)
                      ? bulkData.daysOfWeek.filter(d => d !== index)
                      : [...bulkData.daysOfWeek, index];
                    setBulkData({ ...bulkData, daysOfWeek: newDays });
                  }}
                  className={`p-2 text-xs rounded ${bulkData.daysOfWeek.includes(index)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Hospital multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Hospitals &amp; Shifts
              <span className="ml-2 text-xs text-gray-400 font-normal">
                Each selected hospital creates a separate schedule per day
              </span>
            </label>

            {chosenHospitals.length === 0 && (
              <p className="text-xs text-amber-600 mb-2">Please select at least one hospital.</p>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {selectedHospitals.map((h, idx) => (
                <div
                  key={h.name}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${
                    h.selected ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={h.selected}
                    onChange={() => toggleHospital(idx)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Hospital info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${h.selected ? 'text-emerald-800' : 'text-gray-700'}`}>
                      {h.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{h.description} · {h.capacity} slots</p>
                  </div>

                  {/* Shift selector — only active when selected */}
                  <select
                    value={h.shift}
                    onChange={(e) => setHospitalShift(idx, e.target.value)}
                    disabled={!h.selected}
                    className={`text-xs border rounded px-2 py-1.5 flex-shrink-0 ${
                      h.selected
                        ? 'border-emerald-300 bg-white text-gray-700'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <option value="08:00-20:00">Day Shift (8AM–8PM)</option>
                    <option value="18:00-06:00">Night Shift (6PM–6AM)</option>
                  </select>
                </div>
              ))}
            </div>

            {chosenHospitals.length > 0 && (
              <p className="text-xs text-emerald-700 mt-2">
                {chosenHospitals.length} hospital{chosenHospitals.length > 1 ? 's' : ''} selected —
                each matching day will generate {chosenHospitals.length} schedule{chosenHospitals.length > 1 ? 's' : ''}.
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={chosenHospitals.length === 0 || !bulkData.startDate || !bulkData.endDate}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Schedules
            </button>
            <button onClick={() => setShowBulkModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RejectConfirmModal = ({ rejectTarget, confirmReject, setShowRejectConfirm, setRejectTarget }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-red-100 p-2 rounded-full">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Reject Booking{rejectTarget?.type === 'all' ? 's' : ''}
        </h3>
      </div>
      <p className="text-gray-600 mb-6">
        {rejectTarget?.type === 'all'
          ? 'Are you sure you want to reject ALL bookings for this schedule? All students will be notified.'
          : 'Are you sure you want to reject this booking? The student will be notified.'
        }
      </p>
      <div className="flex space-x-3">
        <button
          onClick={confirmReject}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Reject {rejectTarget?.type === 'all' ? 'All' : 'Booking'}
        </button>
        <button
          onClick={() => { setShowRejectConfirm(false); setRejectTarget(null); }}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const DeleteConfirmModal = ({ confirmDelete, setShowDeleteConfirm, setScheduleToDelete }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-red-100 p-2 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Delete Schedule</h3>
      </div>
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this schedule? This action cannot be undone and will remove all associated bookings.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={confirmDelete}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Delete Schedule
        </button>
        <button
          onClick={() => { setShowDeleteConfirm(false); setScheduleToDelete(null); }}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const LocationManagement = ({ locations, onSave }) => {
  const [localLocations, setLocalLocations] = useState(locations);
  const [editingIdx, setEditingIdx] = useState(null);
  const [newLoc, setNewLoc] = useState({ name: '', capacity: 4, description: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  const handleUpdate = (idx, field, value) => {
    const updated = [...localLocations];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalLocations(updated);
  };

  const handleDelete = (idx) => {
    if (window.confirm('Are you sure you want to remove this location?')) {
      const updated = localLocations.filter((_, i) => i !== idx);
      onSave(updated);
    }
  };

  const handleSaveEdit = (idx) => {
    onSave(localLocations);
    setEditingIdx(null);
  };

  const handleAddNew = () => {
    if (!newLoc.name || !newLoc.description) return;
    const updated = [...localLocations, newLoc];
    onSave(updated);
    setNewLoc({ name: '', capacity: 4, description: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Hospital Locations</h3>
          <p className="text-sm text-gray-500">Manage the list of hospitals available for duty scheduling</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Location</span>
        </button>
      </div>

      {isAdding && (
        <div className="card border-2 border-emerald-500 bg-emerald-50/30 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Hospital Name</label>
              <input 
                type="text" 
                value={newLoc.name} 
                onChange={e => setNewLoc({...newLoc, name: e.target.value})}
                placeholder="e.g. ISDH - Magsingal"
                className="input-field bg-white border-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Max Capacity (Students)</label>
              <input 
                type="number" 
                value={newLoc.capacity} 
                onChange={e => setNewLoc({...newLoc, capacity: parseInt(e.target.value) || 0})}
                className="input-field bg-white border-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Description/Note</label>
              <input 
                type="text" 
                value={newLoc.description} 
                onChange={e => setNewLoc({...newLoc, description: e.target.value})}
                placeholder="Short description..."
                className="input-field bg-white border-emerald-200"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setIsAdding(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAddNew} className="btn-primary">Save New Location</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {localLocations.map((loc, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                {editingIdx === idx ? (
                  <div className="flex-1 space-y-3">
                    <input 
                      type="text" 
                      value={loc.name} 
                      onChange={e => handleUpdate(idx, 'name', e.target.value)}
                      className="text-lg font-bold text-gray-900 border-b border-emerald-300 focus:outline-none w-full"
                    />
                    <input 
                      type="text" 
                      value={loc.description} 
                      onChange={e => handleUpdate(idx, 'description', e.target.value)}
                      className="text-sm text-gray-500 border-b border-gray-200 focus:outline-none w-full"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 truncate">{loc.name}</h4>
                    <p className="text-sm text-gray-500 truncate">{loc.description}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {editingIdx === idx ? (
                  <button onClick={() => handleSaveEdit(idx)} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md">
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setEditingIdx(idx)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-50">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Max Students</span>
              </div>
              {editingIdx === idx ? (
                <input 
                  type="number" 
                  value={loc.capacity} 
                  onChange={e => handleUpdate(idx, 'capacity', parseInt(e.target.value) || 0)}
                  className="w-20 text-right font-black text-2xl text-emerald-700 bg-gray-50 rounded-lg px-2"
                />
              ) : (
                <span className="text-2xl font-black text-emerald-700">{loc.capacity}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Component ── */

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'locations'
  const [selectedHospital, setSelectedHospital] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);

  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [viewStudent, setViewStudent] = useState(null);

  const [newSchedule, setNewSchedule] = useState({
    date: '',
    description: 'Community Health Center Duty',
    location: '',
    shift_start: '08:00',
    shift_end: '20:00',
    max_students: 4
  });

  const { toasts, removeToast, success, error, warning } = useToast();

  const [hospitalLocations, setHospitalLocations] = useState([]);

  const getHospitalForMonth = (date) => {
    if (!hospitalLocations.length) return { name: '', capacity: 4 };
    const month = date.getMonth();
    return hospitalLocations[month % hospitalLocations.length];
  };

  useEffect(() => {
    fetchSchedules();
    fetchPendingBookings();
    fetchHospitalLocations();

    const settingsChannel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_settings' }, 
        () => fetchHospitalLocations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHospitalLocations = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'hospital_locations').single();
      if (error) throw error;
      if (data) {
        const locations = JSON.parse(data.value);
        setHospitalLocations(locations);
        if (locations.length > 0) {
          // Initialize with 'all' if no hospital selected
          if (!selectedHospital) setSelectedHospital('all');
          setNewSchedule(prev => ({
            ...prev,
            location: prev.location || locations[0].name,
            max_students: prev.max_students || locations[0].capacity
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching hospital locations:', err);
    }
  };

  const handleSaveHospitalLocations = async (updatedLocations) => {
    try {
      const { error: updateError } = await dbHelpers.updateHospitalLocations(updatedLocations);
      if (updateError) throw updateError;
      
      setHospitalLocations(updatedLocations);
      success('Hospital locations updated successfully');
      
      // Log the update
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        await supabase.from('duty_logs').insert({
          action: 'settings_updated',
          performed_by: currentUser?.id,
          notes: `Admin updated hospital locations list (${updatedLocations.length} locations)`
        });
      } catch (logErr) {}
    } catch (err) {
      console.error('Error saving hospital locations:', err);
      error('Failed to save hospital locations');
    }
  };

  const fetchSchedules = async () => {
    try {
      const data = await dbHelpers.getSchedules();
      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      error('Failed to load schedules');
    }
  };

  const fetchPendingBookings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules (id, date, description, location, shift_start, shift_end, status, max_students),
          profiles:student_id (id, first_name, last_name, middle_initial, email, student_number, year_level, phone_number, created_at)
        `)
        .eq('status', 'booked')
        .order('booking_time', { ascending: false });

      if (fetchError) { console.error('Error fetching pending bookings:', fetchError); return; }

      setPendingBookings((data || []).filter(b => b.schedules && b.profiles));
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
    }
  };

  const handleApproveIndividualBooking = async (bookingId, studentName, scheduleId) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error: approveError } = await dbHelpers.approveIndividualBooking(bookingId, currentUser?.id);
      if (approveError) throw approveError;

      const { data: still, error: checkError } = await supabase
        .from('schedule_students').select('id').eq('schedule_id', scheduleId).eq('status', 'booked');
      if (!checkError && (!still || still.length === 0)) {
        await supabase.from('schedules').update({
          status: 'approved', approved_by: currentUser?.id, approved_at: new Date().toISOString()
        }).eq('id', scheduleId);
      }

      await Promise.all([fetchSchedules(), fetchPendingBookings()]);
      success(`Booking approved for ${studentName}`);
    } catch (err) {
      console.error('Error approving booking:', err);
      error('Failed to approve booking');
    }
  };

  const handleApproveAllBookings = async (scheduleId, scheduleDate, scheduleLocation) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error: approveError, count } = await dbHelpers.approveAllBookingsForSchedule(scheduleId, currentUser?.id);
      if (approveError) throw approveError;
      if (count === 0) { warning('No pending bookings to approve for this schedule'); return; }

      await supabase.from('schedules').update({
        status: 'approved', approved_by: currentUser?.id, approved_at: new Date().toISOString()
      }).eq('id', scheduleId);

      await Promise.all([fetchSchedules(), fetchPendingBookings()]);
      const dateStr = new Date(scheduleDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      success(`All ${count} booking(s) approved for ${dateStr} at ${scheduleLocation}`);
    } catch (err) {
      console.error('Error approving all bookings:', err);
      error('Failed to approve all bookings');
    }
  };

  const handleRejectIndividualBooking = (bookingId) => {
    setRejectTarget({ type: 'single', bookingId });
    setShowRejectConfirm(true);
  };

  const handleRejectAllBookings = (scheduleId) => {
    setRejectTarget({ type: 'all', scheduleId });
    setShowRejectConfirm(true);
  };

  const handleViewStudent = (student) => {
    if (!student) return;
    setViewStudent(student);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (rejectTarget.type === 'single') {
        const { error: rejectError } = await supabase.from('schedule_students').update({
          status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'Booking rejected by admin'
        }).eq('id', rejectTarget.bookingId);
        if (rejectError) throw rejectError;
        await supabase.from('duty_logs').insert([{
          schedule_student_id: rejectTarget.bookingId, action: 'rejected_individual',
          performed_by: currentUser?.id, notes: 'Admin rejected individual student booking'
        }]);
        success('Booking rejected successfully');
      } else {
        const { error: rejectError } = await supabase.from('schedule_students').update({
          status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'All bookings rejected by admin'
        }).eq('schedule_id', rejectTarget.scheduleId).eq('status', 'booked');
        if (rejectError) throw rejectError;
        await supabase.from('duty_logs').insert([{
          schedule_id: rejectTarget.scheduleId, action: 'rejected_all',
          performed_by: currentUser?.id, notes: 'Admin rejected all bookings for schedule'
        }]);
        success('All bookings rejected for this schedule');
      }
      await Promise.all([fetchSchedules(), fetchPendingBookings()]);
      setShowRejectConfirm(false);
      setRejectTarget(null);
    } catch (err) {
      console.error('Error rejecting booking(s):', err);
      error('Failed to reject booking(s)');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const { error: createError } = await supabase.from('schedules').insert([{
        ...newSchedule, status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id
      }]).select().single();
      if (createError) throw createError;

      // Log the schedule creation
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        await supabase.from('duty_logs').insert({
          action: 'schedule_created',
          performed_by: currentUser?.id,
          notes: `Admin created new schedule for ${newSchedule.date} at ${newSchedule.location}`
        });
      } catch (logErr) {
        console.warn('Failed to log schedule creation:', logErr);
      }

      await fetchSchedules();
      setShowAddModal(false);

      // Automated Student Notification
      try {
        const dateStr = new Date(newSchedule.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const currentUser = (await supabase.auth.getUser()).data.user;
        const result = await dbHelpers.notifyAllStudents(
          currentUser?.id, 
          'Schedule Created', 
          `Admin created a duty schedule for ${dateStr} at ${newSchedule.location}. Check the calendar to book your slot!`
        );
        if (result.success) {
          success(`Students notified: ${result.count} accounts alerted`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send broadcast notification:', notifyErr);
      }

      setNewSchedule({
        date: '', description: 'Community Health Center Duty',
        location: hospitalLocations[0]?.name || '', shift_start: '08:00', shift_end: '20:00', 
        max_students: hospitalLocations[0]?.capacity || 4
      });
      success('Schedule created successfully');
    } catch (err) {
      console.error('Error creating schedule:', err);
      error('Failed to create schedule');
    }
  };

  const handleDeleteSchedule = (scheduleId) => {
    setScheduleToDelete(scheduleId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      const { error: deleteError } = await supabase.from('schedules').delete().eq('id', scheduleToDelete);
      if (deleteError) throw deleteError;

      // Log the schedule deletion
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        await supabase.from('duty_logs').insert({
          action: 'schedule_deleted',
          performed_by: currentUser?.id,
          notes: `Admin deleted schedule (ID: ${scheduleToDelete})`
        });
      } catch (logErr) {
        console.warn('Failed to log schedule deletion:', logErr);
      }

      await Promise.all([fetchSchedules(), fetchPendingBookings()]);
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
      success('Schedule deleted successfully');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      error('Failed to delete schedule');
    }
  };

  const generateBulkSchedules = async (startDate, endDate, daysOfWeek = [1, 2, 3, 4, 5], selectedHospitals = []) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const schedulesToCreate = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        if (daysOfWeek.includes(current.getDay())) {
          const dateStr = current.toISOString().split('T')[0];
          // Create one schedule entry per selected hospital on this day
          for (const hospital of selectedHospitals) {
            const [shiftStart, shiftEnd] = hospital.shift.split('-');
            schedulesToCreate.push({
              date: dateStr,
              description: 'Community Health Center Duty',
              location: hospital.name,
              shift_start: shiftStart,
              shift_end: shiftEnd,
              max_students: hospital.capacity,
              status: 'pending',
              created_by: userId
            });
          }
        }
        current.setDate(current.getDate() + 1);
      }

      if (schedulesToCreate.length === 0) {
        warning('No schedules to create for the selected date range and days.');
        return;
      }

      const { error: bulkError } = await supabase.from('schedules').insert(schedulesToCreate);
      if (bulkError) throw bulkError;

      // Log the bulk schedule creation
      try {
        await supabase.from('duty_logs').insert({
          action: 'schedule_created',
          performed_by: userId,
          notes: `Admin bulk created ${schedulesToCreate.length} schedule(s) for range ${startDate} to ${endDate}`
        });
      } catch (logErr) {
        console.warn('Failed to log bulk schedule creation:', logErr);
      }

      await fetchSchedules();

      // Automated Global Notification for Bulk Creation
      try {
        const startStr = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const currentUser = (await supabase.auth.getUser()).data.user;
        
        const result = await dbHelpers.notifyAllStudents(
          currentUser?.id, 
          'Schedules Created', 
          `Admin created multiple duty schedules from ${startStr} to ${endStr}. Check the calendar to book your slots!`
        );
        if (result.success) {
          success(`Broadcast sent: ${result.count} students notified of bulk update`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send bulk broadcast notification:', notifyErr);
      }

      success(`Created ${schedulesToCreate.length} schedule(s) across ${selectedHospitals.length} hospital(s) successfully`);
    } catch (err) {
      console.error('Error creating bulk schedules:', err);
      error('Failed to create bulk schedules');
    }
  };

  const getFilteredBookings = () => {
    let filtered = [...pendingBookings];
    if (filterLocation !== 'all') filtered = filtered.filter(b => b.schedules?.location === filterLocation);
    if (filterDate !== 'all') {
      const today = new Date();
      filtered = filtered.filter(b => {
        const bookingDate = new Date(b.schedules?.date + 'T00:00:00');
        if (filterDate === 'today') return bookingDate.toDateString() === today.toDateString();
        if (filterDate === 'week') {
          const weekFromNow = new Date(today); weekFromNow.setDate(weekFromNow.getDate() + 7);
          return bookingDate >= today && bookingDate <= weekFromNow;
        }
        if (filterDate === 'month') return bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear();
        return true;
      });
    }
    if (searchStudent.trim()) {
      const search = searchStudent.toLowerCase();
      filtered = filtered.filter(b => {
        const firstName = b.profiles?.first_name || b.profiles?.full_name?.split(' ')[0] || '';
        const lastName = b.profiles?.last_name || b.profiles?.full_name?.split(' ').slice(1).join(' ') || '';
        const fullName = (b.profiles?.full_name || `${firstName} ${lastName}`).toLowerCase();
        
        return fullName.includes(search) ||
          b.profiles?.student_number?.toLowerCase().includes(search) ||
          b.profiles?.email?.toLowerCase().includes(search);
      });
    }
    return filtered;
  };

  const groupBookingsBySchedule = (bookings) => {
    const groups = {};
    bookings.forEach(booking => {
      const key = `${booking.schedule_id}`;
      if (!groups[key]) groups[key] = { scheduleId: booking.schedule_id, scheduleInfo: booking.schedules, bookings: [] };
      groups[key].bookings.push(booking);
    });
    return Object.values(groups);
  };

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const calendar = [];
    const currentDateLoop = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dayString = currentDateLoop.toDateString();
        // Updated logic: Filter instead of find, and handle 'all' locations
        const daySchedules = schedules.filter(s => {
          const dateMatch = new Date(s.date + 'T00:00:00').toDateString() === dayString;
          const locationMatch = selectedHospital === 'all' || s.location === selectedHospital;
          return dateMatch && locationMatch;
        });

        weekDays.push({
          date: new Date(currentDateLoop), 
          schedules: daySchedules, // Plural now
          isCurrentMonth: currentDateLoop.getMonth() === month,
          isToday: dayString === new Date().toDateString(),
          isPast: currentDateLoop < new Date().setHours(0, 0, 0, 0)
        });
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    return calendar;
  };

  const renderPendingApprovalsView = () => {
    const filteredBookings = getFilteredBookings();
    const groupedBookings = groupBookingsBySchedule(filteredBookings);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Pending Schedule Approvals</h3>
            <p className="text-gray-600">Review and approve student duty bookings</p>
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {filteredBookings.length} pending approvals
          </div>
        </div>

        <div className="card bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="w-4 h-4 inline mr-1" />Filter by Location
              </label>
              <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="input-field">
                <option value="all">All Locations</option>
                {hospitalLocations.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />Filter by Date
              </label>
              <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-field">
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="w-4 h-4 inline mr-1" />Search Student
              </label>
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Name, ID, or email..."
                className="input-field"
              />
            </div>
          </div>
          {(filterLocation !== 'all' || filterDate !== 'all' || searchStudent) && (
            <button onClick={() => { setFilterLocation('all'); setFilterDate('all'); setSearchStudent(''); }}
              className="mt-3 text-sm text-emerald-600 hover:text-emerald-700">
              Clear all filters
            </button>
          )}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {pendingBookings.length === 0 ? 'All caught up!' : 'No matching bookings'}
            </h3>
            <p className="text-gray-600">
              {pendingBookings.length === 0
                ? 'No pending schedule approvals at the moment.'
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedBookings.map((group) => (
              <div key={group.scheduleId} className="card border-l-4 border-l-yellow-400">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">
                        {new Date(group.scheduleInfo.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {group.scheduleInfo.shift_start} - {group.scheduleInfo.shift_end} • {group.scheduleInfo.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveAllBookings(group.scheduleId, new Date(group.scheduleInfo.date + 'T00:00:00').toLocaleDateString(), group.scheduleInfo.location)}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve All ({group.bookings.length})</span>
                    </button>
                    <button
                      onClick={() => handleRejectAllBookings(group.scheduleId)}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject All</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.bookings.map((booking) => (
                    <div key={booking.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold overflow-hidden">
                          {booking.profiles?.avatar_url 
                            ? <img src={booking.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            : (booking.profiles?.first_name?.[0] || '') + (booking.profiles?.last_name?.[0] || '')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleViewStudent(booking.profiles)}
                              className="font-medium text-gray-900 hover:text-emerald-600 transition-colors text-left"
                            >
                              {booking.profiles?.last_name}, {booking.profiles?.first_name} {booking.profiles?.middle_initial || ''}
                            </button>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {booking.profiles?.year_level || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-600">{booking.profiles?.email}</p>
                            <p className="text-sm text-gray-500">ID: {booking.profiles?.student_number || 'N/A'}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Booked: {new Date(booking.booking_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveIndividualBooking(booking.id, booking.profiles ? `${booking.profiles.first_name} ${booking.profiles.last_name}` : 'Student', group.scheduleId)}
                          className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                        >
                          <Check className="w-4 h-4" /><span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectIndividualBooking(booking.id)}
                          className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                        >
                          <X className="w-4 h-4" /><span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Top Tab Switcher */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'schedules' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Review</span>
          </button>
          <button 
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'locations' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Location Setup</span>
          </button>
        </div>

        {activeTab === 'locations' ? (
          <LocationManagement 
            locations={hospitalLocations} 
            onSave={handleSaveHospitalLocations} 
          />
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button 
              onClick={() => { setViewMode('calendar'); setShowAddModal(true); }}
              className="card bg-gradient-to-r from-emerald-600 to-emerald-700 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium opacity-80">New Duty</p>
                  <p className="text-2xl font-bold">Add Schedule</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
            <p className="text-gray-600">Create and manage duty schedules for midwifery students</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setShowBulkModal(true)} className="btn-secondary flex items-center space-x-2">
              <Calendar className="w-4 h-4" /><span>Bulk Create</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
              <Plus className="w-4 h-4" /><span>Add Schedule</span>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('pending')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${viewMode === 'pending' ? 'bg-white text-yellow-600 shadow-md' : 'text-gray-600 hover:text-gray-700'}`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending Approvals</span>
                {pendingBookings.length > 0 && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">{pendingBookings.length}</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-600 hover:text-gray-700'}`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4" /><span>Calendar View</span>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button onClick={() => setViewMode('calendar')} className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-blue-100">Total Schedules</p><p className="text-2xl font-bold">{schedules.length}</p></div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </button>
          <button onClick={() => setViewMode('pending')} className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-yellow-100">Pending Bookings</p><p className="text-2xl font-bold">{pendingBookings.length}</p></div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </button>
          <button onClick={() => { setViewMode('calendar'); setFilterLocation('all'); setFilterDate('all'); }} className="card bg-gradient-to-r from-green-500 to-green-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-green-100">Approved</p><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'approved').length}</p></div>
              <Check className="w-8 h-8 text-green-200" />
            </div>
          </button>
          <button onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); }} className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100">This Month</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => {
                    const d = new Date(s.date + 'T00:00:00'); const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-200" />
            </div>
          </button>
        </div>

        {viewMode === 'pending' ? renderPendingApprovalsView() : (
          <div className="card">
            <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">View Hospital Calendar:</label>
                <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} className="input-field max-w-xs">
                  <option value="all">All Locations (Combined View)</option>
                  {hospitalLocations.map((hospital) => (
                    <option key={hospital.name} value={hospital.name}>{hospital.name} ({hospital.capacity} slots)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {selectedHospital === 'all' ? 'All Hospital Locations - ' : (selectedHospital ? `${selectedHospital} - ` : '')}
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                {selectedHospital && selectedHospital !== 'all' && (
                  <p className="text-xs text-gray-500">
                    Capacity: {hospitalLocations.find(h => h.name === selectedHospital)?.capacity || 0} students
                  </p>
                )}
                {selectedHospital === 'all' && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Consolidated View: Showing all active duties
                  </p>
                )}
              </div>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto sm:overflow-hidden rounded-lg border border-gray-200">
              <div className="min-w-[720px] sm:min-w-0">
                <div className="grid grid-cols-7 bg-gray-50">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="p-2 sm:p-4 text-center font-medium text-gray-700 text-xs sm:text-sm border-r border-gray-200 last:border-r-0">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
                {generateCalendar().map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-200">
                    {week.map((day, dayIndex) => (
                      <div key={dayIndex}
                        className={`min-h-[100px] sm:min-h-[140px] p-1.5 sm:p-2 border-r border-gray-200 last:border-r-0 ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${day.isToday ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className={`text-xs font-semibold ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                            {day.date.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1 overflow-y-auto max-h-[110px] custom-scrollbar">
                          {day.schedules.length > 0 ? (
                            day.schedules.map((schedule, sIdx) => {
                              const activeBookings = schedule.schedule_students?.filter(ss => ss.status !== 'cancelled') || [];
                              const studentNames = activeBookings.map(ss => ss.profiles?.first_name).join(', ');
                              
                              return (
                                <div key={schedule.id} className="group relative">
                                  <div className={`text-[10px] leading-tight p-1 rounded border ${
                                    schedule.status === 'approved' 
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                      : 'bg-amber-50 border-amber-100 text-amber-800'
                                  }`}>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <span className="font-bold truncate max-w-[70%]">
                                        {selectedHospital === 'all' ? schedule.location : schedule.shift_start}
                                      </span>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }} 
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600 transition-opacity"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                    <div className="truncate italic opacity-90 cursor-pointer hover:font-bold transition-all" onClick={() => handleViewStudent(activeBookings[0]?.profiles)}>
                                      {studentNames || <span className="text-gray-400">No students</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : day.isCurrentMonth && !day.isPast && (
                            <button
                              onClick={() => {
                                const assignedHospital = getHospitalForMonth(day.date);
                                setNewSchedule({
                                  date: day.date.toISOString().split('T')[0],
                                  description: 'Community Health Center Duty',
                                  location: selectedHospital === 'all' ? assignedHospital.name : selectedHospital,
                                  shift_start: '08:00', shift_end: '20:00',
                                  max_students: assignedHospital.capacity
                                });
                                setShowAddModal(true);
                              }}
                              className="w-full text-center text-[10px] text-gray-400 hover:text-emerald-600 py-1 border border-dashed border-gray-200 rounded hover:border-emerald-200 transition-all"
                            >
                              + Duty
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </>
      )}

        {showAddModal && (
          <AddScheduleModal
            newSchedule={newSchedule}
            setNewSchedule={setNewSchedule}
            handleCreateSchedule={handleCreateSchedule}
            setShowAddModal={setShowAddModal}
            hospitalLocations={hospitalLocations}
            getHospitalForMonth={getHospitalForMonth}
          />
        )}
        {showBulkModal && (
          <BulkCreateModal
            generateBulkSchedules={generateBulkSchedules}
            setShowBulkModal={setShowBulkModal}
            hospitalLocations={hospitalLocations}
          />
        )}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            confirmDelete={confirmDelete}
            setShowDeleteConfirm={setShowDeleteConfirm}
            setScheduleToDelete={setScheduleToDelete}
          />
        )}
        {showRejectConfirm && (
          <RejectConfirmModal
            rejectTarget={rejectTarget}
            confirmReject={confirmReject}
            setShowRejectConfirm={setShowRejectConfirm}
            setRejectTarget={setRejectTarget}
          />
        )}
        {viewStudent && (
          <ViewStudentModal
            student={viewStudent}
            onClose={() => setViewStudent(null)}
          />
        )}
      </div>
    </>
  );
};

export default ScheduleManagement;
