import React, { useState, useEffect, useCallback } from 'react';
import { supabase, dbHelpers } from '../lib/supabase';
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
  ChevronRight,
  Trash2,
  Plus
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
  first_name: '', last_name: '', middle_initial: '', email: '', role: 'student',
  phone_number: '', student_number: '', parent_student_numbers: [''], year_level: '1st Year', password: ''
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
  const [successMsg, setSuccessMsg]         = useState(null); // 'approved' | 'declined' | 'linked' | null
  const [viewPending, setViewPending]       = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [pendingLinks, setPendingLinks]     = useState([]);
  const [linksLoading, setLinksLoading]     = useState(false);
  const [pendingLinksCount, setPendingLinksCount] = useState(0);
  const [usersPage, setUsersPage]           = useState(1);
  const USERS_PER_PAGE = 10;

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
        else acc.inactive++;
        return acc;
      }, { total: 0, admin: 0, 'co-admin': 0, student: 0, parent: 0, active: 0, inactive: 0 });
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

  const [pendingChildDetails, setPendingChildDetails] = useState({});

  const fetchPendingChildDetails = useCallback(async (studentNumbers) => {
    if (!studentNumbers || studentNumbers.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('student_number, first_name, last_name')
        .in('student_number', studentNumbers);
      
      if (error) throw error;
      
      const details = {};
      data.forEach(s => {
        details[s.student_number] = `${s.first_name} ${s.last_name}`;
      });
      setPendingChildDetails(prev => ({ ...prev, ...details }));
    } catch (err) {
      console.error('Error fetching child details:', err);
    }
  }, []);

  const [pendingCount, setPendingCount] = useState(0);
  const [approveLoading, setApproveLoading] = useState(null); // id being approved

  const fetchPendingLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const { data, error } = await dbHelpers.getPendingLinkRequests();
      if (error) throw error;
      setPendingLinks(data || []);
      setPendingLinksCount((data || []).length);
    } catch (err) {
      console.error('Error fetching pending links:', err);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  const handleApprove = async (reg) => {
    setApproveLoading(reg.id);
    try {
      // If a profile already exists, activate it now and mark as approved
      await supabase.from('profiles').update({
        is_active: true,
        approval_status: 'approved'
      }).ilike('email', reg.email.trim());

      // Handle multiple children if parent
      let studentNumbers = [];
      if (reg.role === 'parent' && reg.student_number) {
        try {
          const parsed = JSON.parse(reg.student_number);
          if (Array.isArray(parsed)) {
            studentNumbers = parsed;
          }
        } catch (e) {
          // If not JSON, it might be a single string from old flow
          studentNumbers = [reg.student_number];
        }
      }

      // Confirm the user's email via RPC so they can log in
      // (Supabase email confirmation may be required; this bypasses it on admin approval)
      // First resolve the user's UID with retry
      let userId = null;
      for (let i = 0; i < 5; i++) {
        const { data: foundId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: reg.email.trim() });
        if (foundId) { userId = foundId; break; }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (userId) {
        // Confirm the email so password login works immediately
        await supabase.rpc('confirm_user_email', { user_id: userId });

        // Activate the profile NOW — this is the authoritative approval
        await supabase.from('profiles').upsert({
          id:              userId,
          email:           reg.email.trim().toLowerCase(),
          first_name:      reg.first_name     || '',
          last_name:       reg.last_name      || '',
          middle_initial:  reg.middle_initial || null,
          role:            reg.role           || 'student',
          phone_number:    reg.phone_number   || null,
          student_number:  reg.role === 'student' ? reg.student_number : null,
          year_level:      reg.year_level     || null,
          is_active:       true,
          approval_status: 'approved',
        }, { onConflict: 'id' });
      }

      // Send a verification email to the EXISTING user (shouldCreateUser: false preserves their password)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: reg.email.trim(),
        options: {
          shouldCreateUser: false, // User already exists from signUp — preserve their password
        }
      });
      if (otpError) {
        // Non-fatal: profile is already activated; user can log in with their password
        console.warn('OTP send failed (non-fatal, profile is already activated):', otpError.message);
      }

      // Mark as approved in registration records
      await supabase.from('pending_registrations').update({
        status: 'approved'
      }).eq('id', reg.id);

      // Establish parent-student links if userId was resolved above
      if (userId && reg.role === 'parent' && studentNumbers.length > 0) {
        for (const num of studentNumbers) {
          const { data: student } = await supabase.from('profiles').select('id').eq('student_number', num).eq('role', 'student').maybeSingle();
          if (student) {
            await supabase.from('parent_student_links').upsert({
              parent_id: userId,
              student_id: student.id,
              status: 'approved'
            }, { onConflict: 'parent_id,student_id' });
          }
        }
      }

      // Log the registration approval
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await supabase.from('duty_logs').insert({
          action: 'registration_approved',
          performed_by: currentUser?.id,
          target_user: reg.email, // Use email as target since ID might not exist yet
          notes: `Admin approved signup for ${reg.first_name} ${reg.last_name} (${reg.role})`
        });
      } catch (logErr) {
        console.warn('Failed to log registration approval:', logErr);
      }

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

      // Log the registration decline
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await supabase.from('duty_logs').insert({
          action: 'registration_declined',
          performed_by: currentUser?.id,
          target_user: declineModal.email,
          notes: `Admin declined signup for ${declineModal.first_name} ${declineModal.last_name}. Reason: ${declineReason || 'Not specified'}`
        });
      } catch (logErr) {
        console.warn('Failed to log registration decline:', logErr);
      }

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
    fetchPendingLinks();
  }, [fetchUsers, fetchPendingSignups, fetchPendingLinks]);

  // Observer for viewPending child details
  useEffect(() => {
    if (viewPending?.role === 'parent' && viewPending.student_number) {
      try {
        const parsed = JSON.parse(viewPending.student_number);
        if (Array.isArray(parsed)) {
          const relevantNums = parsed.filter(n => n && !pendingChildDetails[n]);
          if (relevantNums.length > 0) fetchPendingChildDetails(parsed);
        }
      } catch (e) {
        if (viewPending.student_number && !pendingChildDetails[viewPending.student_number]) {
          fetchPendingChildDetails([viewPending.student_number]);
        }
      }
    }
  }, [viewPending, pendingChildDetails, fetchPendingChildDetails]);

  const handleLinkAction = async (linkId, status) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      const { error } = await dbHelpers.handleLinkRequest(linkId, status, admin?.id);
      if (error) throw error;

      setPendingLinks(prev => prev.filter(l => l.id !== linkId));
      setPendingLinksCount(prev => Math.max(0, prev - 1));
      setSuccessMsg(status === 'approved' ? 'approved' : 'declined');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error handling link:', err);
      alert('Failed to process request');
    }
  };

  /* ── Toggle active status ── */
  const toggleStatus = async (user) => {
    try {
      const { error } = await supabase
        .from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
      if (error) throw error;

      // Log the status toggle
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await supabase.from('duty_logs').insert({
          action: user.is_active ? 'user_deactivated' : 'user_activated',
          performed_by: currentUser?.id,
          target_user: user.id,
          notes: `Admin ${user.is_active ? 'deactivated' : 'activated'} account for ${user.first_name} ${user.last_name} (${user.role})`
        });
      } catch (logErr) {
        console.warn('Failed to log status toggle:', logErr);
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      setStats(prev => ({ 
        ...prev, 
        active: user.is_active ? prev.active - 1 : prev.active + 1,
        inactive: user.is_active ? prev.inactive + 1 : prev.inactive - 1
      }));
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

  const addStudentField = (isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, parent_student_numbers: [...(prev.parent_student_numbers || ['']), ''] }));
    } else {
      setAddForm(prev => ({ ...prev, parent_student_numbers: [...(prev.parent_student_numbers || ['']), ''] }));
    }
  };

  const removeStudentField = (index, isEdit = false) => {
    if (isEdit) {
      if ((editForm.parent_student_numbers || []).length <= 1) return;
      setEditForm(prev => ({ ...prev, parent_student_numbers: prev.parent_student_numbers.filter((_, i) => i !== index) }));
    } else {
      if ((addForm.parent_student_numbers || []).length <= 1) return;
      setAddForm(prev => ({ ...prev, parent_student_numbers: prev.parent_student_numbers.filter((_, i) => i !== index) }));
    }
  };

  const handleStudentNumberChange = (index, val, isEdit = false) => {
    if (isEdit) {
      const nums = [...(editForm.parent_student_numbers || [])];
      nums[index] = val;
      setEditForm(prev => ({ ...prev, parent_student_numbers: nums }));
    } else {
      const nums = [...(addForm.parent_student_numbers || [])];
      nums[index] = val;
      setAddForm(prev => ({ ...prev, parent_student_numbers: nums }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    setFormSuccess('');

    if (!addForm.first_name.trim() || !addForm.last_name.trim()) { setFormError('First and last names are required.'); setFormSaving(false); return; }
    if (!addForm.email.trim())     { setFormError('Email is required.');     setFormSaving(false); return; }
    if (!addForm.password || addForm.password.length < 6) {
      setFormError('Password must be at least 6 characters.'); setFormSaving(false); return;
    }

    try {
      // Check and link children if parent
      const parentLinks = [];
      if (addForm.role === 'parent' && addForm.parent_student_numbers) {
        for (const num of addForm.parent_student_numbers) {
          if (!num.trim()) continue;
          const { data: student } = await supabase.from('profiles').select('id').eq('student_number', num.trim()).maybeSingle();
          if (!student) {
            setFormError(`Student number ${num} not found. Please verify.`);
            setFormSaving(false);
            return;
          }
          parentLinks.push(student.id);
        }
      }

      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: addForm.email.trim(),
        password: addForm.password,
        options: {
          data: {
            first_name:     addForm.first_name.trim(),
            last_name:      addForm.last_name.trim(),
            middle_initial: addForm.middle_initial.trim() || null,
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
          email:           addForm.email.trim().toLowerCase(),
          first_name:      addForm.first_name.trim(),
          last_name:       addForm.last_name.trim(),
          middle_initial:  addForm.middle_initial.trim() || null,
          role:            addForm.role,
          phone_number:    addForm.phone_number.trim() || null,
          student_number:  addForm.role === 'student' ? addForm.student_number.trim() : null,
          year_level:      addForm.role === 'student' ? addForm.year_level : null,
          is_active:       true,
          approval_status: 'approved',
        }, { onConflict: 'id' });

        // Auto-confirm
        await supabase.rpc('confirm_user_email', { user_id: userId });

        // Establish parent links if any
        if (addForm.role === 'parent' && parentLinks.length > 0) {
          for (const studentId of parentLinks) {
            await supabase.from('parent_student_links').upsert({
              parent_id: userId,
              student_id: studentId,
              status: 'approved'
            }, { onConflict: 'parent_id,student_id' });
          }
        }

        // Log user creation
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          await supabase.from('duty_logs').insert({
            action: 'user_created',
            performed_by: currentUser?.id,
            target_user: userId,
            notes: `Admin created new ${addForm.role} account for ${addForm.first_name} ${addForm.last_name}`
          });
        } catch (logErr) {
          console.warn('Failed to log user creation:', logErr);
        }

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
  const openEditModal = async (u) => {
    let parentNums = [''];
    if (u.role === 'parent') {
      const { data: links } = await supabase.from('parent_student_links').select('profiles(student_number)').eq('parent_id', u.id);
      if (links && links.length > 0) {
        parentNums = links.map(l => l.profiles?.student_number);
      }
    }

    setEditForm({
      first_name:     u.first_name     || '',
      last_name:      u.last_name      || '',
      middle_initial: u.middle_initial || '',
      phone_number:   u.phone_number   || '',
      role:           u.role           || 'student',
      student_number: u.student_number || '',
      parent_student_numbers: parentNums,
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

    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setFormError('First and last names are required.'); setFormSaving(false); return;
    }

    try {
      const updateData = {
        first_name:     editForm.first_name.trim(),
        last_name:      editForm.last_name.trim(),
        middle_initial: editForm.middle_initial.trim() || null,
        phone_number:   editForm.phone_number.trim() || null,
        role:           editForm.role,
        student_number: editForm.role === 'student' ? editForm.student_number.trim() : null,
        year_level:     editForm.role === 'student' ? editForm.year_level : null,
        is_active:      editForm.is_active,
        avatar_url:     editForm.avatar_url?.trim() || null,
        updated_at:     new Date().toISOString(),
      };

      // Handle parent links update
      if (editForm.role === 'parent' && editForm.parent_student_numbers) {
        // First, clear existing links if needed OR just add new ones. 
        // User probably expects the list to reflect the new state.
        // For simplicity, we'll upsert all mentioned ones. 
        // A better approach would be to delete ones not in the list.
        
        // Let's delete existing links first for full sync
        await supabase.from('parent_student_links').delete().eq('parent_id', editUser.id);
        
        for (const num of editForm.parent_student_numbers) {
          if (!num.trim()) continue;
          const { data: student } = await supabase.from('profiles').select('id').eq('student_number', num.trim()).maybeSingle();
          if (student) {
            await supabase.from('parent_student_links').upsert({
              parent_id: editUser.id,
              student_id: student.id,
              status: 'approved'
            });
          }
        }
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', editUser.id);

      if (error && error.code === 'PGRST204') {
        const fallbackData = {
          full_name: `${editForm.first_name} ${editForm.last_name}`.trim(),
          phone_number:   editForm.phone_number.trim() || null,
          role:           editForm.role,
          student_number: editForm.role === 'student' ? editForm.student_number.trim() : null,
          year_level:     editForm.role === 'student' ? editForm.year_level : null,
          is_active:      editForm.is_active,
          avatar_url:     editForm.avatar_url?.trim() || null,
          updated_at:     new Date().toISOString(),
        };
        const { error: fError } = await supabase.from('profiles').update(fallbackData).eq('id', editUser.id);
        if (fError) throw fError;
      } else if (error) {
        throw error;
      }

      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm } : u));
      setFormSuccess('User updated successfully!');

      // Log user update
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await supabase.from('duty_logs').insert({
          action: 'user_updated',
          performed_by: currentUser?.id,
          target_user: editUser.id,
          notes: `Admin updated profile for ${editForm.first_name} ${editForm.last_name}`
        });
      } catch (logErr) {
        console.warn('Failed to log user update:', logErr);
      }

      fetchUsers();
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
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchSearch = !q ||
      fullName.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.student_number?.toLowerCase().includes(q);
    const matchRole   = roleFilter   === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const statCards = [
    { label: 'Total Users',  value: stats.total,             color: 'from-slate-500 to-slate-600',   icon: Users },
    { label: 'Admins',       value: stats.admin,             color: 'from-purple-500 to-purple-600', icon: Shield },
    { label: 'Co-Admins',    value: stats['co-admin'] || 0,  color: 'from-blue-500 to-blue-600',     icon: UserCheck },
    { label: 'Students',     value: stats.student,           color: 'from-emerald-500 to-green-600', icon: GraduationCap },
    { label: 'Parents',      value: stats.parent || 0,       color: 'from-amber-500 to-amber-600',   icon: Users },
    { label: 'Active',       value: stats.active,            color: 'from-green-500 to-emerald-600', icon: CheckCircle },
    { label: 'Inactive',     value: stats.inactive,          color: 'from-red-500 to-rose-600',      icon: XCircle },
  ];

  // Pagination helpers
  const activeFilteredUsers = filteredUsers.filter(u => u.is_active !== false);
  const inactiveUsers = filteredUsers.filter(u => u.is_active === false);
  const [userTab, setUserTab] = useState('active'); // 'active' | 'inactive'
  const currentListUsers = userTab === 'active' ? activeFilteredUsers : inactiveUsers;
  const totalUserPages = Math.max(1, Math.ceil(currentListUsers.length / USERS_PER_PAGE));
  const userPageStart = (usersPage - 1) * USERS_PER_PAGE;
  const pagedUsers = currentListUsers.slice(userPageStart, userPageStart + USERS_PER_PAGE);

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
      <div className="flex bg-gray-100/50 p-1 rounded-2xl w-fit">
        <button onClick={() => { setActiveView('users'); setUsersPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Manage Users
        </button>
        <button onClick={() => setActiveView('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${activeView === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <span>Pending Signups</span>
          {pendingCount > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px]">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveView('pending-links')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${activeView === 'pending-links' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <span>Linking Requests</span>
          {pendingLinksCount > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px]">{pendingLinksCount}</span>}
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

      {/* Active / Deactivated sub-tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => { setUserTab('active'); setUsersPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            userTab === 'active' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active ({activeFilteredUsers.length})
        </button>
        <button
          onClick={() => { setUserTab('inactive'); setUsersPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            userTab === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Deactivated ({inactiveUsers.length})
        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-50/50">
            {pagedUsers.map(u => (
              <div key={u.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group overflow-hidden flex flex-col relative">
                {/* Deactivate/Activate Shortcut */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'toggle', user: u }); }}
                  className={`absolute top-4 right-4 p-2 rounded-full transition-all bg-white shadow-sm border border-gray-100 z-10 ${
                    u.is_active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                >
                  {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>

                <div className="p-6 cursor-pointer" onClick={() => setViewUser(u)}>
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden ring-4 ring-white ${u.is_active ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-gray-200 grayscale'}`}>
                       {u.avatar_url 
                        ? <img src={u.avatar_url} alt="" className="w-14 h-14 object-cover" />
                        : <span className="text-white text-xl font-bold">{(u.first_name?.[0] || 'U') + (u.last_name?.[0] || '')}</span>
                       }
                    </div>
                    <div className="min-w-0 pr-6">
                      <div className="flex items-center space-x-2 mb-1">
                        <RoleBadge role={u.role} />
                      </div>
                      <h4 className="font-bold text-gray-900 truncate leading-tight">
                        {u.last_name ? `${u.last_name}, ${u.first_name}` : (u.full_name || 'Unnamed User')}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  {u.role === 'parent' ? (
                    <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 mb-4">
                      <div className="flex items-center space-x-2 text-amber-700 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Parent Account</span>
                      </div>
                      <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs text-amber-600">
                           <span className="opacity-70">Associated Student</span>
                           <span className="font-bold">Linked Account</span>
                         </div>
                         <div className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-sm">
                           <p className="text-xs font-bold text-gray-800">Child Information</p>
                           <p className="text-[10px] text-gray-500 mt-0.5">Contact via {u.phone_number || 'email'}</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status</p>
                        <div className="flex items-center space-x-1.5">
                           <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                           <span className={`text-xs font-bold ${u.is_active ? 'text-green-700' : 'text-gray-500'}`}>{u.is_active ? 'Active' : 'Offline'}</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Member Since</p>
                        <span className="text-xs font-bold text-gray-700 truncate block">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {u.student_number && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Hash className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                        <span className="font-medium mr-1">ID:</span>
                        <span className="font-bold text-gray-700">{u.student_number}</span>
                      </div>
                    )}
                    {u.phone_number && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                        <span className="font-bold text-gray-700">{u.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto border-t border-gray-50 px-6 py-4 bg-gray-50/30 flex items-center justify-between">
                  <button 
                    onClick={() => openEditModal(u)}
                    className="flex-1 py-2 px-4 rounded-xl text-blue-600 font-bold text-xs hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 border border-transparent hover:border-blue-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Manage Account</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {currentListUsers.length > USERS_PER_PAGE && (
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Page <span className="text-emerald-600">{usersPage}</span> of {totalUserPages}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setUsersPage(p => Math.max(1, p - 1))}
              disabled={usersPage === 1}
              className="p-2 border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalUserPages }, (_, i) => i + 1).slice(Math.max(0, usersPage - 3), usersPage + 2).map(p => (
                <button
                  key={p}
                  onClick={() => setUsersPage(p)}
                  className={`w-10 h-10 text-xs font-bold rounded-xl transition-all ${
                    p === usersPage ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >{p}</button>
              ))}
            </div>
            <button
              onClick={() => setUsersPage(p => Math.min(totalUserPages, p + 1))}
              disabled={usersPage === totalUserPages}
              className="p-2 border border-gray-100 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
            >
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
          </div>
        </div>
      )}
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
                    <p className="font-semibold text-gray-900">{u.last_name ? `${u.last_name}, ${u.first_name} ${u.middle_initial || ''}` : <span className="text-gray-400 italic">No name</span>}</p>
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

      {/* ── PARENT-STUDENT LINKING REQUESTS VIEW ── */}
      {activeView === 'pending-links' && (
        <div className="space-y-4">
          {linksLoading ? (
            <div className="text-center py-12 text-gray-400">Loading link requests...</div>
          ) : pendingLinks.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-amber-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No pending link requests</p>
              <p className="text-gray-400 text-sm">All parent-student links have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingLinks.map(link => (
                <div key={link.id} className="bg-white border border-amber-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Link Request</h4>
                        <p className="text-xs text-gray-400 font-medium">{new Date(link.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Pending Approval</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Parent</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{link.parent?.first_name} {link.parent?.last_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{link.parent?.email}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Child (Student)</p>
                      <p className="text-sm font-bold text-emerald-800 truncate">{link.student?.first_name} {link.student?.last_name}</p>
                      <p className="text-[10px] text-emerald-600 truncate">ID: {link.student?.student_number}</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleLinkAction(link.id, 'approved')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button 
                      onClick={() => handleLinkAction(link.id, 'declined')}
                      className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
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
              {/* Role First */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">User Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'student',  label: 'Student',  icon: GraduationCap },
                    { value: 'parent',   label: 'Parent',   icon: Users },
                    { value: 'admin',    label: 'Admin',    icon: Shield },
                    { value: 'co-admin', label: 'Co-Admin', icon: UserCheck },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setAddForm({ ...addForm, role: value })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${addForm.role === value ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${addForm.role === value ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`text-xs font-bold leading-tight ${addForm.role === value ? 'text-emerald-700' : 'text-gray-600'}`}>{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Atomic Names */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <FormField label="First Name" icon={User}>
                    <input type="text" value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50" 
                      placeholder="Juan" required />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Last Name">
                    <input type="text" value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50" 
                      placeholder="Dela Cruz" required />
                  </FormField>
                </div>
                <div className="col-span-1">
                  <FormField label="M.I.">
                    <input type="text" value={addForm.middle_initial} onChange={e => setAddForm({ ...addForm, middle_initial: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 text-center" 
                      placeholder="D" maxLength={2} />
                  </FormField>
                </div>
              </div>

              {/* Email & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Email Address" icon={Mail}>
                  <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    className={inputCls()} placeholder="user@example.com" required />
                </FormField>
                <FormField label="Profile Picture (URL)" icon={User}>
                  <input type="url" value={addForm.avatar_url || ''} onChange={e => setAddForm({ ...addForm, avatar_url: e.target.value })}
                    className={inputCls()} placeholder="https://..." />
                </FormField>
              </div>

              {/* Temporary Password */}
              <FormField label="Temporary Password" icon={Lock}>
                <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className={inputCls()} placeholder="Min. 6 characters" required />
              </FormField>

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

              {/* Parent-specific fields */}
              {addForm.role === 'parent' && (
                <div className="space-y-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-700 uppercase tracking-widest">Linked Children</label>
                    <button type="button" onClick={() => addStudentField(false)}
                      className="text-[10px] font-bold text-amber-600 bg-white px-2 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center space-x-1">
                      <Plus className="w-3 h-3" /><span>Add Child</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(addForm.parent_student_numbers || ['']).map((num, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={num} onChange={e => handleStudentNumberChange(i, e.target.value, false)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" placeholder="Student Number" />
                        </div>
                        {addForm.parent_student_numbers.length > 1 && (
                          <button type="button" onClick={() => removeStudentField(i, false)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
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
                    : <span className="text-blue-700 font-bold text-sm">{(editUser.first_name?.[0] || '') + (editUser.last_name?.[0] || '')}</span>}
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
              {/* Role First */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">User Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'student',  label: 'Student',  icon: GraduationCap },
                    { value: 'parent',   label: 'Parent',   icon: Users },
                    { value: 'admin',    label: 'Admin',    icon: Shield },
                    { value: 'co-admin', label: 'Co-Admin', icon: UserCheck },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setEditForm({ ...editForm, role: value })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${editForm.role === value ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${editForm.role === value ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <p className={`text-xs font-bold leading-tight ${editForm.role === value ? 'text-emerald-700' : 'text-gray-600'}`}>{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Atomic Names */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <FormField label="First Name" icon={User}>
                    <input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50" required />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Last Name">
                    <input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50" required />
                  </FormField>
                </div>
                <div className="col-span-1">
                  <FormField label="M.I.">
                    <input type="text" value={editForm.middle_initial} onChange={e => setEditForm({ ...editForm, middle_initial: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 text-center" maxLength={2} />
                  </FormField>
                </div>
              </div>

              {/* Email & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={editUser.email} className={`${inputCls()} opacity-60 cursor-not-allowed`} disabled />
                  </div>
                </div>
                <FormField label="Profile Picture (URL)" icon={User}>
                  <input type="url" value={editForm.avatar_url || ''} onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    className={inputCls()} placeholder="https://..." />
                </FormField>
              </div>

              {/* Phone */}
              <FormField label="Phone Number" icon={Phone}>
                <input type="tel" value={editForm.phone_number} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className={inputCls()} placeholder="09123456789" />
              </FormField>

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

              {/* Parent-specific edit */}
              {editForm.role === 'parent' && (
                <div className="space-y-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-700 uppercase tracking-widest">Linked Children</label>
                    <button type="button" onClick={() => addStudentField(true)}
                      className="text-[10px] font-bold text-amber-600 bg-white px-2 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center space-x-1">
                      <Plus className="w-3 h-3" /><span>Add Child</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editForm.parent_student_numbers || ['']).map((num, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={num} onChange={e => handleStudentNumberChange(i, e.target.value, true)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" placeholder="Student Number" />
                        </div>
                        {editForm.parent_student_numbers.length > 1 && (
                          <button type="button" onClick={() => removeStudentField(i, true)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-800">Account Status</p>
                  <p className="text-xs text-gray-400 mt-0.5">{editForm.is_active ? 'This user has full access' : 'This user is currently suspended'}</p>
                </div>
                <button type="button" onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ring-4 ring-offset-2 ${editForm.is_active ? 'bg-emerald-600 ring-emerald-50' : 'bg-gray-300 ring-gray-100'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${editForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-lg overflow-hidden">
                  {viewUser.avatar_url
                    ? <img src={viewUser.avatar_url} alt="" className="w-16 h-16 object-cover" />
                    : (viewUser.first_name?.[0] || '') + (viewUser.last_name?.[0] || '')}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{viewUser.first_name} {viewUser.last_name}</h3>
                  <p className="text-emerald-100 text-sm">{viewUser.email}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
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

            {/* Fixed Footer Actions */}
            <div className="px-6 pb-6 pt-2 flex space-x-3 shrink-0">
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
              <span className="font-semibold text-gray-800">{actionModal.user.first_name} {actionModal.user.last_name}</span>?
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Decline Registration</h3>
                <p className="text-sm text-gray-500">{declineModal.first_name} {declineModal.last_name}</p>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {(viewPending.first_name?.[0] || '') + (viewPending.last_name?.[0] || '')}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-white">{viewPending.first_name} {viewPending.last_name}</p>
                  <p className="text-amber-100 text-xs">Pending Registration</p>
                </div>
              </div>
              <button onClick={() => setViewPending(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
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

              {/* Children List for Parents */}
              {viewPending.role === 'parent' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Requested Children</p>
                  <div className="space-y-2">
                    {(() => {
                      let nums = [];
                      try {
                        const parsed = JSON.parse(viewPending.student_number);
                        if (Array.isArray(parsed)) nums = parsed;
                        else nums = [viewPending.student_number];
                      } catch(e) { nums = [viewPending.student_number]; }
                      
                      return nums.filter(n => n).map((n, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-white rounded-xl border border-amber-100 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <Hash className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-gray-700">{n}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{pendingChildDetails[n] || 'Finding name...'}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer Actions */}
            <div className="px-6 pb-6 pt-3 flex space-x-3 bg-white border-t border-gray-50 shrink-0">
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
            <div className="overflow-y-auto custom-scrollbar">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Approve Student?</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-700 font-medium mb-1">{confirmApprove.first_name} {confirmApprove.last_name}</p>
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
