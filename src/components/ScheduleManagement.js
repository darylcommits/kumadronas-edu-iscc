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
  Search
} from 'lucide-react';
import { useToast, ToastContainer } from './Toast';

/* ── Modal components defined OUTSIDE to prevent remount on parent re-render ── */

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
            value={newSchedule.max_students}
            className="input-field bg-gray-100 cursor-not-allowed"
            readOnly
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Automatically set based on selected hospital location</p>
        </div>

        <div className="flex space-x-3 pt-4">
          <button type="submit" className="btn-primary flex-1">Create Schedule</button>
          <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </form>
    </div>
  </div>
);

const BulkCreateModal = ({ generateBulkSchedules, setShowBulkModal }) => {
  const [bulkData, setBulkData] = useState({
    startDate: '',
    endDate: '',
    daysOfWeek: [1, 2, 3, 4, 5]
  });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Bulk Create Schedules</h3>
        <div className="space-y-4">
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

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Hospitals will be automatically assigned based on monthly rotation
            </p>
          </div>

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

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                generateBulkSchedules(bulkData.startDate, bulkData.endDate, bulkData.daysOfWeek);
                setShowBulkModal(false);
              }}
              className="btn-primary flex-1"
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

/* ── Main Component ── */

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedHospital, setSelectedHospital] = useState('ISDH - Magsingal');
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

  const [newSchedule, setNewSchedule] = useState({
    date: '',
    description: 'Community Health Center Duty',
    location: 'ISDH - Magsingal',
    shift_start: '08:00',
    shift_end: '20:00',
    max_students: 4
  });

  const { toasts, removeToast, success, error, warning } = useToast();

  const hospitalLocations = [
    { name: 'ISDH - Magsingal', capacity: 4, description: 'Ilocos Sur District Hospital - Magsingal' },
    { name: 'ISDH - Sinait', capacity: 4, description: 'Ilocos Sur District Hospital - Sinait' },
    { name: 'ISDH - Narvacan', capacity: 4, description: 'Ilocos Sur District Hospital - Narvacan' },
    { name: 'ISPH - Gab. Silang', capacity: 2, description: 'Ilocos Sur Provincial Hospital - Gab. Silang' },
    { name: 'RHU - Sto. Domingo', capacity: 4, description: 'Rural Health Unit - Sto. Domingo' },
    { name: 'RHU - Santa', capacity: 4, description: 'Rural Health Unit - Santa' },
    { name: 'RHU - San Ildefonso', capacity: 4, description: 'Rural Health Unit - San Ildefonso' },
    { name: 'RHU - Bantay', capacity: 4, description: 'Rural Health Unit - Bantay' }
  ];

  const getHospitalForMonth = (date) => {
    const month = date.getMonth();
    return hospitalLocations[month % hospitalLocations.length];
  };

  useEffect(() => {
    Promise.all([fetchSchedules(), fetchPendingBookings()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          profiles:student_id (id, full_name, email, student_number, year_level)
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

      await fetchSchedules();
      setShowAddModal(false);
      setNewSchedule({
        date: '', description: 'Community Health Center Duty',
        location: 'ISDH - Magsingal', shift_start: '08:00', shift_end: '20:00', max_students: 4
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
      await Promise.all([fetchSchedules(), fetchPendingBookings()]);
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
      success('Schedule deleted successfully');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      error('Failed to delete schedule');
    }
  };

  const generateBulkSchedules = async (startDate, endDate, daysOfWeek = [1, 2, 3, 4, 5]) => {
    try {
      const schedulesToCreate = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        if (daysOfWeek.includes(current.getDay())) {
          const assignedHospital = getHospitalForMonth(current);
          schedulesToCreate.push({
            date: current.toISOString().split('T')[0],
            description: 'Community Health Center Duty',
            location: assignedHospital.name,
            shift_start: '08:00', shift_end: '20:00',
            max_students: assignedHospital.capacity, status: 'pending',
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
        }
        current.setDate(current.getDate() + 1);
      }
      const { error: bulkError } = await supabase.from('schedules').insert(schedulesToCreate);
      if (bulkError) throw bulkError;
      await fetchSchedules();
      success(`Created ${schedulesToCreate.length} schedules successfully`);
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
        const bookingDate = new Date(b.schedules?.date);
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
      filtered = filtered.filter(b =>
        b.profiles?.full_name?.toLowerCase().includes(search) ||
        b.profiles?.student_number?.toLowerCase().includes(search) ||
        b.profiles?.email?.toLowerCase().includes(search)
      );
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
        const daySchedule = schedules.find(s =>
          new Date(s.date).toDateString() === currentDateLoop.toDateString() && s.location === selectedHospital
        );
        weekDays.push({
          date: new Date(currentDateLoop), schedule: daySchedule,
          isCurrentMonth: currentDateLoop.getMonth() === month,
          isToday: currentDateLoop.toDateString() === new Date().toDateString(),
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
                      onClick={() => handleApproveAllBookings(group.scheduleId, new Date(group.scheduleInfo.date).toLocaleDateString(), group.scheduleInfo.location)}
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
                        <div className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                          {booking.profiles?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="font-medium text-gray-900">{booking.profiles?.full_name}</p>
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
                          onClick={() => handleApproveIndividualBooking(booking.id, booking.profiles?.full_name, group.scheduleId)}
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
                    const d = new Date(s.date); const now = new Date();
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
                  {selectedHospital} - {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-gray-500">Capacity: {hospitalLocations.find(h => h.name === selectedHospital)?.capacity || 4} students</p>
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
                    {week.map((day, dayIndex) => {
                      const studentCount = day.schedule?.schedule_students?.length || 0;
                      const maxStudents = day.schedule?.max_students || 2;
                      return (
                        <div key={dayIndex}
                          className={`min-h-[84px] sm:min-h-[120px] p-2 sm:p-3 border-r border-gray-200 last:border-r-0 ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${day.isToday ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                              {day.date.getDate()}
                            </span>
                            {day.schedule && (
                              <button onClick={() => handleDeleteSchedule(day.schedule.id)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete Schedule">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {day.schedule ? (
                            <div className="space-y-1">
                              <div className={`text-xs px-2 py-1 rounded ${day.schedule.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {day.schedule.status}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-600">{studentCount}/{maxStudents} students</div>
                              <div className="text-[10px] sm:text-xs text-gray-500">{day.schedule.shift_start} - {day.schedule.shift_end}</div>
                            </div>
                          ) : day.isCurrentMonth && !day.isPast && (
                            <button
                              onClick={() => {
                                const assignedHospital = getHospitalForMonth(day.date);
                                setNewSchedule({
                                  date: day.date.toISOString().split('T')[0],
                                  description: 'Community Health Center Duty',
                                  location: assignedHospital.name,
                                  shift_start: '08:00', shift_end: '20:00',
                                  max_students: assignedHospital.capacity
                                });
                                setShowAddModal(true);
                              }}
                              className="w-full text-left text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 py-1"
                            >
                              + Add schedule
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
      </div>
    </>
  );
};

export default ScheduleManagement;
