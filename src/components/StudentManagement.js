// StudentManagement.js - Updated with beautiful toast notifications
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  GraduationCap,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Save,
  X as CloseIcon
} from 'lucide-react';
import { useToast, ToastContainer } from './Toast';

/* ── Sub-components defined OUTSIDE to prevent remount on parent re-render ── */

const AddStudentModal = ({ setShowAddModal }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
      <form className="space-y-4">
        <input type="text" placeholder="Full Name" className="input-field" required />
        <input type="email" placeholder="Email" className="input-field" required />
        <input type="text" placeholder="Student Number" className="input-field" required />
        <select className="input-field" required>
          <option value="">Select Year Level</option>
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
        </select>
        <input type="tel" placeholder="Phone Number" className="input-field" required />
        <div className="flex space-x-3">
          <button type="submit" className="btn-primary flex-1">Add Student</button>
          <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </form>
    </div>
  </div>
);

const EditStudentModal = ({
  editFormData, setEditFormData,
  handleSaveEdit, setShowEditModal, setSelectedStudent
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Edit Student Information</h3>
        <button
          onClick={() => { setShowEditModal(false); setSelectedStudent(null); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSaveEdit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={editFormData.full_name}
            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read-only)</label>
          <input type="email" value={editFormData.email} className="input-field bg-gray-100 cursor-not-allowed" readOnly disabled />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student Number</label>
          <input
            type="text"
            value={editFormData.student_number}
            onChange={(e) => setEditFormData({ ...editFormData, student_number: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
          <select
            value={editFormData.year_level}
            onChange={(e) => setEditFormData({ ...editFormData, year_level: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Select Year Level</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={editFormData.phone_number}
            onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
            className="input-field"
          />
        </div>
        <div className="flex space-x-3 pt-4">
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center space-x-2">
            <Save className="w-4 h-4" /><span>Save Changes</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowEditModal(false); setSelectedStudent(null); }}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
);

const CoAdminModal = ({ handleCreateCoAdmin, setShowCoAdminModal, warning }) => {
  const [coAdminData, setCoAdminData] = useState({
    full_name: '', email: '', phone_number: '', password: '', confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({ password: false, confirm_password: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (coAdminData.password !== coAdminData.confirm_password) {
      warning('Passwords do not match');
      return;
    }
    handleCreateCoAdmin(coAdminData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Create Co-Admin Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Full Name" value={coAdminData.full_name}
            onChange={(e) => setCoAdminData({ ...coAdminData, full_name: e.target.value })}
            className="input-field" required
          />
          <input
            type="email" placeholder="Email" value={coAdminData.email}
            onChange={(e) => setCoAdminData({ ...coAdminData, email: e.target.value })}
            className="input-field" required
          />
          <input
            type="tel" placeholder="Phone Number" value={coAdminData.phone_number}
            onChange={(e) => setCoAdminData({ ...coAdminData, phone_number: e.target.value })}
            className="input-field" required
          />
          <div className="relative">
            <input
              type={showPasswords.password ? 'text' : 'password'}
              placeholder="Password" value={coAdminData.password}
              onChange={(e) => setCoAdminData({ ...coAdminData, password: e.target.value })}
              className="input-field pr-10" required
            />
            <button type="button"
              onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPasswords.confirm_password ? 'text' : 'password'}
              placeholder="Confirm Password" value={coAdminData.confirm_password}
              onChange={(e) => setCoAdminData({ ...coAdminData, confirm_password: e.target.value })}
              className="input-field pr-10" required
            />
            <button type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm_password: !showPasswords.confirm_password })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex space-x-3">
            <button type="submit" className="btn-primary flex-1">Create Co-Admin</button>
            <button type="button" onClick={() => setShowCoAdminModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StudentCard = ({ student, handleEditStudent, handleDeleteStudent, toggleStudentStatus }) => {
  const totalDuties = student.schedule_students?.length || 0;
  const completedDuties = student.schedule_students?.filter(s => s.status === 'completed').length || 0;

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {student.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{student.full_name}</h3>
              {student.is_active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div className="mt-1 space-y-1 text-sm text-gray-600">
              <div className="flex items-center space-x-2"><Mail className="w-4 h-4" /><span>{student.email}</span></div>
              {student.phone_number && (
                <div className="flex items-center space-x-2"><Phone className="w-4 h-4" /><span>{student.phone_number}</span></div>
              )}
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4" />
                <span>{student.student_number} • {student.year_level}</span>
              </div>
            </div>
            <div className="mt-3 flex space-x-4 text-sm">
              <div className="text-center"><p className="font-medium text-gray-900">{totalDuties}</p><p className="text-gray-500">Total Duties</p></div>
              <div className="text-center"><p className="font-medium text-gray-900">{completedDuties}</p><p className="text-gray-500">Completed</p></div>
              <div className="text-center">
                <p className="font-medium text-gray-900">{totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0}%</p>
                <p className="text-gray-500">Success Rate</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => handleEditStudent(student)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100" title="Edit student information">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDeleteStudent(student.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete student account">
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleStudentStatus(student.id, student.is_active)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${student.is_active ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
          >
            {student.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSort, setFilterSort] = useState('name-asc');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoAdminModal, setShowCoAdminModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const { toasts, removeToast, success, error, warning } = useToast();

  useEffect(() => { fetchStudents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles').select('*').eq('role', 'student').order('full_name');
      if (profilesError) throw profilesError;

      const { data: scheduleData } = await supabase
        .from('schedule_students')
        .select('id, student_id, status, schedules(date, status)')
        .in('student_id', profilesData.map(p => p.id));

      setStudents(profilesData.map(profile => ({
        ...profile,
        schedule_students: scheduleData?.filter(s => s.student_id === profile.id) || []
      })));
    } catch (err) {
      console.error('Error in fetchStudents:', err);
      error('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.is_active) ||
      (filterStatus === 'inactive' && !student.is_active);
    const matchesYear =
      filterYear === 'all' || student.year_level === filterYear;
    let matchesDate = true;
    if (filterDateRange !== 'all' && student.created_at) {
      const created = new Date(student.created_at);
      const now = new Date();
      if (filterDateRange === 'today') {
        matchesDate = created.toDateString() === now.toDateString();
      } else if (filterDateRange === 'week') {
        matchesDate = created >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filterDateRange === 'month') {
        matchesDate = created >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }
    return matchesSearch && matchesFilter && matchesYear && matchesDate;
  }).sort((a, b) => {
    if (filterSort === 'name-asc') return (a.full_name || '').localeCompare(b.full_name || '');
    if (filterSort === 'name-desc') return (b.full_name || '').localeCompare(a.full_name || '');
    if (filterSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (filterSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });

  const toggleStudentStatus = async (studentId, currentStatus) => {
    try {
      const { error: updateError } = await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', studentId);
      if (updateError) throw updateError;
      await fetchStudents();
      success(currentStatus ? 'Student deactivated successfully' : 'Student activated successfully');
    } catch (err) {
      console.error('Error updating student status:', err);
      error('Failed to update student status');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student account? This action cannot be undone.')) return;
    try {
      const { error: cancelError } = await supabase.from('schedule_students').update({
        status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'Student account deleted'
      }).eq('student_id', studentId).eq('status', 'booked');
      if (cancelError) throw cancelError;

      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', studentId).eq('role', 'student');
      if (deleteError) throw deleteError;

      await fetchStudents();
      success('Student account deleted successfully');
    } catch (err) {
      console.error('Error deleting student:', err);
      error('Failed to delete student account');
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      email: student.email || '',
      student_number: student.student_number || '',
      year_level: student.year_level || '',
      phone_number: student.phone_number || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: editFormData.full_name,
        student_number: editFormData.student_number,
        year_level: editFormData.year_level,
        phone_number: editFormData.phone_number,
        updated_at: new Date().toISOString()
      }).eq('id', selectedStudent.id);
      if (updateError) throw updateError;

      await fetchStudents();
      setShowEditModal(false);
      setSelectedStudent(null);
      success('Student information updated successfully');
    } catch (err) {
      console.error('Error updating student:', err);
      error('Failed to update student information');
    }
  };

  const handleCreateCoAdmin = async (coAdminData) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: coAdminData.email, password: coAdminData.password,
        options: { data: { full_name: coAdminData.full_name, role: 'admin' } }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id, full_name: coAdminData.full_name, email: coAdminData.email,
        phone_number: coAdminData.phone_number, role: 'admin', is_active: true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;

      success('Co-admin account created successfully');
      setShowCoAdminModal(false);
    } catch (err) {
      console.error('Error creating co-admin:', err);
      error('Failed to create co-admin account');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
            <p className="text-gray-600">Manage midwifery students and their accounts</p>
          </div>
        </div>

        <div className="card space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
          {/* Filters row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field text-sm py-2">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="input-field text-sm py-2">
              <option value="all">All Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)} className="input-field text-sm py-2">
              <option value="all">Any Date</option>
              <option value="today">Joined Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <select value={filterSort} onChange={(e) => setFilterSort(e.target.value)} className="input-field text-sm py-2">
              <option value="name-asc">A → Z</option>
              <option value="name-desc">Z → A</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-600">{filteredStudents.length}</span> of{' '}
            <span className="font-semibold text-gray-600">{students.length}</span> students
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <button onClick={() => { setFilterStatus('all'); setFilterYear('all'); setSearchTerm(''); setFilterDateRange('all'); setFilterSort('name-asc'); }} className="card bg-gradient-to-r from-slate-600 to-slate-700 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-slate-100 text-xs">Total</p><p className="text-2xl font-bold">{students.length}</p></div>
              <Users className="w-7 h-7 text-slate-200" />
            </div>
          </button>
          <button onClick={() => { setFilterStatus('active'); setFilterYear('all'); }} className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-emerald-100 text-xs">Active</p><p className="text-2xl font-bold">{students.filter(s => s.is_active).length}</p></div>
              <CheckCircle className="w-7 h-7 text-emerald-200" />
            </div>
          </button>
          <button onClick={() => { setFilterYear('1st Year'); setFilterStatus('all'); }} className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-blue-100 text-xs">1st Year</p><p className="text-2xl font-bold">{students.filter(s => s.year_level === '1st Year').length}</p></div>
              <GraduationCap className="w-7 h-7 text-blue-200" />
            </div>
          </button>
          <button onClick={() => { setFilterYear('2nd Year'); setFilterStatus('all'); }} className="card bg-gradient-to-r from-violet-500 to-violet-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-violet-100 text-xs">2nd Year</p><p className="text-2xl font-bold">{students.filter(s => s.year_level === '2nd Year').length}</p></div>
              <GraduationCap className="w-7 h-7 text-violet-200" />
            </div>
          </button>
          <button onClick={() => { setFilterYear('3rd Year'); setFilterStatus('all'); }} className="card bg-gradient-to-r from-amber-500 to-amber-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-amber-100 text-xs">3rd Year</p><p className="text-2xl font-bold">{students.filter(s => s.year_level === '3rd Year').length}</p></div>
              <GraduationCap className="w-7 h-7 text-amber-200" />
            </div>
          </button>
          <button onClick={() => { setFilterYear('4th Year'); setFilterStatus('all'); }} className="card bg-gradient-to-r from-green-500 to-green-600 text-white w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div><p className="text-green-100 text-xs">4th Year</p><p className="text-2xl font-bold">{students.filter(s => s.year_level === '4th Year').length}</p></div>
              <GraduationCap className="w-7 h-7 text-green-200" />
            </div>
          </button>
        </div>

        <div className="space-y-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                handleEditStudent={handleEditStudent}
                handleDeleteStudent={handleDeleteStudent}
                toggleStudentStatus={toggleStudentStatus}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first student'}
              </p>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">Add First Student</button>
            </div>
          )}
        </div>

        {showAddModal && <AddStudentModal setShowAddModal={setShowAddModal} />}
        {showEditModal && (
          <EditStudentModal
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleSaveEdit={handleSaveEdit}
            setShowEditModal={setShowEditModal}
            setSelectedStudent={setSelectedStudent}
          />
        )}
        {showCoAdminModal && (
          <CoAdminModal
            handleCreateCoAdmin={handleCreateCoAdmin}
            setShowCoAdminModal={setShowCoAdminModal}
            warning={warning}
          />
        )}
      </div>
    </>
  );
};

export default StudentManagement;
