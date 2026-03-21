import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  Search,
  Filter,
  Shield,
  GraduationCap,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  UserCheck,
  UserX,
  Eye,
  Hash,
  UserPlus,
  Pencil,
  X,
  Save,
  Lock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const ROLE_STYLES = {
  admin:   { bg: 'bg-purple-100', text: 'text-purple-700', icon: Shield },
  'co-admin': { bg: 'bg-blue-100', text: 'text-blue-700', icon: UserCheck },
  student: { bg: 'bg-emerald-100',text: 'text-emerald-700',icon: GraduationCap },
  parent:  { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Users },
};

const RoleBadge = ({ role }) => {
  const style = ROLE_STYLES[role] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: User };
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <Icon className="w-3 h-3" />
      <span>{role === 'co-admin' ? 'Co-Admin' : role.charAt(0).toUpperCase() + role.slice(1)}</span>
    </span>
  );
};

const StatusBadge = ({ isActive }) => (
  isActive
    ? <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /><span>Active</span></span>
    : <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /><span>Inactive</span></span>
);

const EMPTY_ADD_FORM = {
  full_name: '', email: '', role: 'student',
  phone_number: '', student_number: '', year_level: '1st Year', password: ''
};

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const inputCls = (hasIcon = true) =>
  `w-full ${hasIcon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50`;

const FormField = ({ label, icon: Icon, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
      {children}
    </div>
  </div>
);

const UserManagement = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [viewUser, setViewUser]         = useState(null);
  const [actionModal, setActionModal]   = useState(null);

  // Add / Edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser]         = useState(null);  // user object to edit
  const [addForm, setAddForm]           = useState(EMPTY_ADD_FORM);
  const [editForm, setEditForm]         = useState({});
  const [formSaving, setFormSaving]     = useState(false);
  const [formError, setFormError]       = useState('');
  const [formSuccess, setFormSuccess]   = useState('');

  const [stats, setStats] = useState({ total: 0, admin: 0, 'co-admin': 0, student: 0, parent: 0, active: 0 });

  const [activeView, setActiveView]         = useState('users'); // 'users' | 'pending'
  const [pendingSignups, setPendingSignups] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [declineModal, setDeclineModal]     = useState(null); // { user } | null
  const [declineReason, setDeclineReason]   = useState('');
  const [pendingCount, setPendingCount]     = useState(0);
  const [viewPending, setViewPending]       = useState(null); // pending_registrations row
  const [confirmApprove, setConfirmApprove] = useState(null); // pending reg awaiting confirmation
  const [successMsg, setSuccessMsg]         = useState(null); // 'approved' | 'declined' | null

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
      const s = (data || []).reduce((acc, u) => {
        acc.total++;
        if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
        if (u.is_active) acc.active++;
        return acc;
      }, { total: 0, admin: 0, 'co-admin': 0, student: 0, parent: 0, active: 0 });
      setStats(s);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingSignups = useCallback(async () => {
    setPendingLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPendingSignups(data || []);
      setPendingCount((data || []).length);
    } catch (err) {
      console.error('Error fetching pending signups:', err);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const [approveLoading, setApproveLoading] = useState(null); // id being approved

  const handleApprove = async (reg) => {
    setApproveLoading(reg.id);
    try {
      // If a profile already exists from old signup flow, activate it now
      await supabase.from('profiles').update({
        is_active: true,
        approval_status: 'approved'
      }).eq('email', reg.email);

      // Create auth user (if not exists) + send magic login link.
      // Embed student info as user_metadata so createProfileFromAuth always has the data
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: reg.email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name:      reg.full_name      || '',
            role:           reg.role           || 'student',
            phone_number:   reg.phone_number   || null,
            student_number: reg.student_number || null,
            year_level:     reg.year_level     || null,
          }
        }
      });
      if (otpError) throw otpError;

      // Mark as approved — profile will be created in App.js when student clicks the link
      await supabase.from('pending_registrations').update({
        status: 'approved'
      }).eq('id', reg.id);

      setPendingSignups(prev => prev.filter(u => u.id !== reg.id));
      setPendingCount(prev => Math.max(0, prev - 1));
      setSuccessMsg('approved');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Failed to approve: ' + err.message);
    } finally {
      setApproveLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!declineModal) return;
    try {
      await supabase.from('pending_registrations').update({
        status: 'declined',
        rejection_reason: declineReason || 'You do not meet the requirements.'
      }).eq('id', declineModal.id);

      setPendingSignups(prev => prev.filter(u => u.id !== declineModal.id));
      setPendingCount(prev => Math.max(0, prev - 1));
      setDeclineModal(null);
      setDeclineReason('');
      setSuccessMsg('declined');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error declining user:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingSignups();
  }, [fetchUsers, fetchPendingSignups]);

  /* ── Toggle active status ── */
  const toggleStatus = async (user) => {
    try {
      const { error } = await supabase
        .from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      setStats(prev => ({ ...prev, active: user.is_active ? prev.active - 1 : prev.active + 1 }));
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setActionModal(null);
    }
  };

  /* ── Add User ── */
  const openAddModal = () => {
    setAddForm(EMPTY_ADD_FORM);
    setFormError('');
    setFormSuccess('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    setFormSuccess('');

    if (!addForm.full_name.trim()) { setFormError('Full name is required.'); setFormSaving(false); return; }
    if (!addForm.email.trim())     { setFormError('Email is required.');     setFormSaving(false); return; }
    if (!addForm.password || addForm.password.length < 6) {
      setFormError('Password must be at least 6 characters.'); setFormSaving(false); return;
    }

    try {
      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: addForm.email.trim(),
        password: addForm.password,
        options: {
          data: {
            full_name:      addForm.full_name.trim(),
            role:           addForm.role,
            phone_number:   addForm.phone_number.trim() || null,
            student_number: addForm.role === 'student' ? addForm.student_number.trim() : null,
            year_level:     addForm.role === 'student' ? addForm.year_level : null,
          }
        }
      });

      // Non-critical: email sending failed but auth user may still have been created
      const isEmailSendError = signUpError && (
        signUpError.message?.toLowerCase().includes('sending confirmation') ||
        signUpError.message?.toLowerCase().includes('confirmation email') ||
        signUpError.message?.toLowerCase().includes('smtp') ||
        (signUpError.status === 500 && signUpError.message?.toLowerCase().includes('email'))
      );

      // Hard auth errors (e.g. duplicate email) — bail immediately
      if (signUpError && !isEmailSendError) throw signUpError;

      // Get user ID from response, or look up by email if signUp returned null user
      let userId = data?.user?.id;
      if (!userId && isEmailSendError) {
        const { data: foundId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: addForm.email.trim() });
        userId = foundId;
      }

      if (userId) {
        // Save profile
        await supabase.from('profiles').upsert({
          id:              userId,
          email:           addForm.email.trim(),
          full_name:       addForm.full_name.trim(),
          role:            addForm.role,
          phone_number:    addForm.phone_number.trim() || null,
          student_number:  addForm.role === 'student' ? addForm.student_number.trim() : null,
          year_level:      addForm.role === 'student' ? addForm.year_level : null,
          is_active:       true,
          approval_status: 'approved',
        }, { onConflict: 'id' });

        // Auto-confirm — admin-created accounts don't need email verification
        await supabase.rpc('confirm_user_email', { user_id: userId });

        setFormSuccess(`Account for ${addForm.email.trim()} created and activated. The user can log in immediately.`);
        await fetchUsers();
        setTimeout(() => { setShowAddModal(false); setFormSuccess(''); }, 2500);

      } else {
        setFormError(
          'Could not create account. Make sure SMTP is configured in Supabase, or go to ' +
          'Authentication → Email → disable "Confirm email" and try again.'
        );
      }
    } catch (err) {
      const msg = err.message?.includes('User already registered')
        ? 'An account with this email already exists.'
        : err.message?.includes('rate limit')
        ? 'Too many attempts. Please wait a moment and try again.'
        : err.message || 'Failed to create account.';
      setFormError(msg);
    } finally {
      setFormSaving(false);
    }
  };

  /* ── Edit User ── */
  const openEditModal = (u) => {
    setEditForm({
      full_name:      u.full_name      || '',
      phone_number:   u.phone_number   || '',
      role:           u.role           || 'student',
      student_number: u.student_number || '',
      year_level:     u.year_level     || '1st Year',
      is_active:      u.is_active      !== false,
    });
    setFormError('');
    setFormSuccess('');
    setEditUser(u);
    setOpenMenuId(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    setFormSuccess('');

    if (!editForm.full_name.trim()) {
      setFormError('Full name is required.'); setFormSaving(false); return;
    }

    try {
      const { error } = await supabase.from('profiles').update({
        full_name:      editForm.full_name.trim(),
        phone_number:   editForm.phone_number.trim() || null,
        role:           editForm.role,
        student_number: editForm.role === 'student' ? editForm.student_number.trim() : null,
        year_level:     editForm.role === 'student' ? editForm.year_level : null,
        is_active:      editForm.is_active,
        updated_at:     new Date().toISOString(),
      }).eq('id', editUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === editUser.id ? { ...u, ...editForm } : u
      ));
      setFormSuccess('User updated successfully!');
      await fetchUsers();
      setTimeout(() => { setEditUser(null); setFormSuccess(''); }, 1500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  /* ── Filter ── */
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.student_number?.toLowerCase().includes(q);
    const matchRole   = roleFilter   === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const statCards = [
    { label: 'Total Users', value: stats.total,              color: 'from-slate-500 to-slate-600',   icon: Users },
    { label: 'Admins',      value: stats.admin,              color: 'from-purple-500 to-purple-600', icon: Shield },
    { label: 'Co-Admins',   value: stats['co-admin'] || 0,  color: 'from-blue-500 to-blue-600',     icon: UserCheck },
    { label: 'Students',    value: stats.student,            color: 'from-emerald-500 to-green-600', icon: GraduationCap },
    { label: 'Active',      value: stats.active,             color: 'from-green-500 to-emerald-600', icon: CheckCircle },
  ];

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage all registered users in the system</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={fetchUsers} className="flex items-center space-x-2 px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={openAddModal} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-md`}>
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{value}</span>
            </div>
            <p className="text-xs font-medium opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveView('users')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeView === 'users' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          All Users
        </button>
        <button
          onClick={() => { setActiveView('pending'); fetchPendingSignups(); }}
          className={`relative px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeView === 'pending' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pending Signups
          {pendingCount > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{pendingCount}</span>
          )}
        </button>
      </div>

      {activeView === 'users' && (
      <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, email, or student number..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 appearance-none">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="co-admin">Co-Admin</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 appearance-none pr-8">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Showing <span className="font-semibold text-gray-600">{filteredUsers.length}</span> of{' '}
          <span className="font-semibold text-gray-600">{users.length}</span> users
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No users found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} onClick={() => setViewUser(u)} className="hover:bg-emerald-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" className="w-9 h-9 object-cover" />
                            : <span className="text-white text-xs font-bold">{u.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{u.full_name || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          {u.student_number && <p className="text-xs text-emerald-600 font-medium">{u.student_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                      {u.year_level && <p className="text-xs text-gray-400 mt-1">{u.year_level}</p>}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {u.phone_number
                        ? <div className="flex items-center space-x-1 text-xs text-gray-600"><Phone className="w-3 h-3 text-gray-400" /><span>{u.phone_number}</span></div>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge isActive={u.is_active} /></td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => setViewUser(u)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEditModal(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <div className="relative">
                          <button onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === u.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
                              <button onClick={() => { setActionModal({ type: 'toggle', user: u }); setOpenMenuId(null); }}
                                className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-left transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                <span>{u.is_active ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── PENDING SIGNUPS VIEW ── */}
      {activeView === 'pending' && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : pendingSignups.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No pending signups</p>
              <p className="text-gray-400 text-sm">All student registrations have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSignups.map(u => (
                <div key={u.id} onClick={() => setViewPending(u)} className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{u.full_name || <span className="text-gray-400 italic">No name</span>}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      {u.role && <span className="capitalize bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{u.role}</span>}
                      {u.student_number && <span>ID: {u.student_number}</span>}
                      {u.year_level && <span>• {u.year_level}</span>}
                      {u.phone_number && <span>• {u.phone_number}</span>}
                      <span>• Registered {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-amber-500 text-sm font-medium flex-shrink-0">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADD USER MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add New User</h3>
                  <p className="text-xs text-gray-400">A confirmation email will be sent to the user</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <FormField label="Full Name" icon={User}>
                <input type="text" value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                  className={inputCls()} placeholder="Juan Dela Cruz" required />
              </FormField>

              {/* Email */}
              <FormField label="Email Address" icon={Mail}>
                <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className={inputCls()} placeholder="user@example.com" required />
              </FormField>

              {/* Temporary Password */}
              <FormField label="Temporary Password" icon={Lock}>
                <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className={inputCls()} placeholder="Min. 6 characters" required />
              </FormField>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'student',  label: 'Student',  icon: GraduationCap },
                    { value: 'parent',   label: 'Parent',   icon: Users },
                    { value: 'admin',    label: 'Admin',    icon: Shield },
                    { value: 'co-admin', label: 'Co-Admin', icon: UserCheck },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setAddForm({ ...addForm, role: value })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${addForm.role === value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${addForm.role === value ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`text-xs font-semibold ${addForm.role === value ? 'text-emerald-700' : 'text-gray-600'}`}>{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <FormField label="Phone Number" icon={Phone}>
                <input type="tel" value={addForm.phone_number} onChange={e => setAddForm({ ...addForm, phone_number: e.target.value })}
                  className={inputCls()} placeholder="09123456789" />
              </FormField>

              {/* Student-specific fields */}
              {addForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Student Number" icon={Hash}>
                    <input type="text" value={addForm.student_number} onChange={e => setAddForm({ ...addForm, student_number: e.target.value })}
                      className={inputCls()} placeholder="C-23-12345" />
                  </FormField>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Year Level</label>
                    <select value={addForm.year_level} onChange={e => setAddForm({ ...addForm, year_level: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50">
                      {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Messages */}
              {formError && (
                <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /><span>{formSuccess}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-2">
                  {formSaving
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Creating...</span></>
                    : <><UserPlus className="w-4 h-4" /><span>Create User</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {editUser.avatar_url
                    ? <img src={editUser.avatar_url} alt="" className="w-10 h-10 object-cover" />
                    : <span className="text-blue-700 font-bold text-sm">{editUser.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
                  <p className="text-xs text-gray-400">{editUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <FormField label="Full Name" icon={User}>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  className={inputCls()} required />
              </FormField>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={editUser.email} className={`${inputCls()} opacity-60 cursor-not-allowed`} disabled />
                </div>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>

              {/* Phone */}
              <FormField label="Phone Number" icon={Phone}>
                <input type="tel" value={editForm.phone_number} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className={inputCls()} placeholder="09123456789" />
              </FormField>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'student',  label: 'Student',  icon: GraduationCap },
                    { value: 'parent',   label: 'Parent',   icon: Users },
                    { value: 'admin',    label: 'Admin',    icon: Shield },
                    { value: 'co-admin', label: 'Co-Admin', icon: UserCheck },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setEditForm({ ...editForm, role: value })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${editForm.role === value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${editForm.role === value ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`text-xs font-semibold ${editForm.role === value ? 'text-emerald-700' : 'text-gray-600'}`}>{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student-specific */}
              {editForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Student Number" icon={Hash}>
                    <input type="text" value={editForm.student_number} onChange={e => setEditForm({ ...editForm, student_number: e.target.value })}
                      className={inputCls()} placeholder="C-23-12345" />
                  </FormField>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Year Level</label>
                    <select value={editForm.year_level} onChange={e => setEditForm({ ...editForm, year_level: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50">
                      {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Account Status</p>
                  <p className="text-xs text-gray-500">{editForm.is_active ? 'User can access the system' : 'User is blocked from the system'}</p>
                </div>
                <button type="button" onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.is_active ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${editForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Messages */}
              {formError && (
                <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /><span>{formSuccess}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-2">
                  {formSaving
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Saving...</span></>
                    : <><Save className="w-4 h-4" /><span>Save Changes</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW USER MODAL ── */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-lg overflow-hidden">
                  {viewUser.avatar_url
                    ? <img src={viewUser.avatar_url} alt="" className="w-16 h-16 object-cover" />
                    : viewUser.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{viewUser.full_name}</h3>
                  <p className="text-emerald-100 text-sm">{viewUser.email}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <RoleBadge role={viewUser.role} />
                <StatusBadge isActive={viewUser.is_active} />
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { icon: Mail,          label: 'Email',       value: viewUser.email },
                  { icon: Phone,         label: 'Phone',       value: viewUser.phone_number || '—' },
                  { icon: Hash,          label: 'Student No.', value: viewUser.student_number || '—' },
                  { icon: GraduationCap, label: 'Year Level',  value: viewUser.year_level || '—' },
                  { icon: Calendar,      label: 'Joined',      value: viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                  { icon: Calendar,      label: 'Last Login',  value: viewUser.last_login ? new Date(viewUser.last_login).toLocaleString() : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                    <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div><p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p><p className="text-gray-800 font-medium mt-0.5">{value}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-6 flex space-x-3">
              <button onClick={() => { openEditModal(viewUser); setViewUser(null); }}
                className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-sm transition-colors flex items-center justify-center space-x-1">
                <Pencil className="w-4 h-4" /><span>Edit</span>
              </button>
              <button onClick={() => setViewUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOGGLE STATUS MODAL ── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${actionModal.user.is_active ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {actionModal.user.is_active ? <UserX className="w-7 h-7 text-red-600" /> : <UserCheck className="w-7 h-7 text-emerald-600" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{actionModal.user.is_active ? 'Deactivate User?' : 'Activate User?'}</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to {actionModal.user.is_active ? 'deactivate' : 'activate'}{' '}
              <span className="font-semibold text-gray-800">{actionModal.user.full_name}</span>?
              {actionModal.user.is_active && ' They will no longer be able to access the system.'}
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => toggleStatus(actionModal.user)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${actionModal.user.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {actionModal.user.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openMenuId && <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />}

      {/* Decline Modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Decline Registration</h3>
                <p className="text-sm text-gray-500">{declineModal.full_name}</p>
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for declining</label>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="e.g. You do not meet the enrollment requirements..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50 resize-none mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => { setDeclineModal(null); setDeclineReason(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Decline Registration
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── PENDING DETAIL MODAL ── */}
      {viewPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewPending(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {viewPending.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-white">{viewPending.full_name || 'Unknown'}</p>
                  <p className="text-amber-100 text-xs">Pending Registration</p>
                </div>
              </div>
              <button onClick={() => setViewPending(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Details */}
            <div className="p-6 space-y-3">
              {[
                { icon: Mail,          label: 'Email',          value: viewPending.email },
                { icon: User,          label: 'Role',           value: viewPending.role ? viewPending.role.charAt(0).toUpperCase() + viewPending.role.slice(1) : '—' },
                { icon: Phone,         label: 'Phone',          value: viewPending.phone_number || '—' },
                { icon: Hash,          label: 'Student No.',    value: viewPending.student_number || '—' },
                { icon: GraduationCap, label: 'Year Level',     value: viewPending.year_level || '—' },
                { icon: Calendar,      label: 'Submitted',      value: viewPending.created_at ? new Date(viewPending.created_at).toLocaleString() : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-gray-800 font-medium mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Actions */}
            <div className="px-6 pb-6 flex space-x-3">
              <button
                onClick={() => { setConfirmApprove(viewPending); setViewPending(null); }}
                disabled={approveLoading === viewPending.id}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" /><span>Approve</span>
              </button>
              <button
                onClick={() => { setDeclineModal(viewPending); setDeclineReason(''); setViewPending(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition-colors flex items-center justify-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" /><span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── APPROVE CONFIRMATION MODAL ── */}
      {confirmApprove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Approve Student?</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-700 font-medium mb-1">{confirmApprove.full_name || confirmApprove.email}</p>
              <p className="text-gray-500 text-sm mb-6">
                Do you want to approve this student? A confirmation link will be sent to their email.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmApprove(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleApprove(confirmApprove); setConfirmApprove(null); }}
                  disabled={approveLoading === confirmApprove.id}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center space-x-1.5"
                >
                  {approveLoading === confirmApprove.id
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Sending...</span></>
                    : <span>Yes, Approve</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST ── */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
          <div className={`flex items-center space-x-3 px-6 py-3.5 rounded-2xl shadow-2xl text-white font-semibold text-sm ${
            successMsg === 'approved' ? 'bg-emerald-600' : 'bg-red-500'
          }`}>
            {successMsg === 'approved'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{successMsg === 'approved' ? 'Successfully approved!' : 'Successfully declined.'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
