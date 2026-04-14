// ProfileSettings.js - User profile settings with avatar upload functionality
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  User,
  Shield,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Upload,
  Trash2,
  Database,
  Plus,
  X,
  MapPin,
  Power
} from 'lucide-react';

/* ── Sub-components defined OUTSIDE to prevent remount on parent re-render ── */

const AvatarDisplay = ({ avatarPreview, avatarUrl, userName, size = 'large' }) => {
  const sizeClasses = {
    small: 'w-10 h-10 text-sm',
    medium: 'w-16 h-16 text-lg',
    large: 'w-20 h-20 text-2xl'
  };
  const currentAvatar = avatarPreview || avatarUrl;
  if (currentAvatar) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-lg`}>
        <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
      <span className="text-white font-bold">
        {userName}
      </span>
    </div>
  );
};

const PersonalInfoTab = ({
  profileData, setProfileData,
  avatarUpload, saving,
  fileInputRef, removeAvatar,
  handleProfileSubmit, userRole
}) => (
  <form onSubmit={handleProfileSubmit} className="space-y-6">
    {/* Avatar Upload Section */}
    <div className="border-b pb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
      <div className="flex items-center space-x-6">
        <div className="relative">
          <AvatarDisplay
            avatarPreview={avatarUpload.preview}
            avatarUrl={profileData.avatar_url}
            userName={(profileData.first_name?.[0] || '') + (profileData.last_name?.[0] || '')}
            size="large"
          />
          {avatarUpload.uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
            {(profileData.avatar_url || avatarUpload.preview) && (
              <button
                type="button"
                onClick={removeAvatar}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">JPG, PNG or WebP. Max size of 5MB.</p>
          {avatarUpload.file && (
            <p className="text-xs text-blue-600">New image selected: {avatarUpload.file.name}</p>
          )}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={profileData.first_name}
            onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={profileData.last_name}
            onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">M.I.</label>
          <input
            type="text"
            value={profileData.middle_initial}
            onChange={(e) => setProfileData({ ...profileData, middle_initial: e.target.value })}
            className="input-field text-center"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          value={profileData.email}
          className="input-field bg-gray-50"
          disabled
        />
        <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <input
          type="tel"
          value={profileData.phone_number}
          onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
          className="input-field"
          placeholder="09123456789"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Contact number is required for emergency notifications</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <input
          type="text"
          value={profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1)}
          className="input-field bg-gray-50 capitalize"
          disabled
        />
      </div>

      {userRole === 'student' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Number</label>
            <input
              type="text"
              value={profileData.student_number}
              onChange={(e) => setProfileData({ ...profileData, student_number: e.target.value })}
              className="input-field"
              placeholder="2024-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year Level</label>
            <select
              value={profileData.year_level}
              onChange={(e) => setProfileData({ ...profileData, year_level: e.target.value })}
              className="input-field"
            >
              <option value="">Select Year Level</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
        </>
      )}
    </div>

    <div className="flex justify-end">
      <button
        type="submit"
        disabled={saving || avatarUpload.uploading}
        className="btn-primary flex items-center space-x-2"
      >
        {(saving || avatarUpload.uploading) ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{avatarUpload.uploading ? 'Uploading...' : 'Saving...'}</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </>
        )}
      </button>
    </div>
  </form>
);

const SecurityTab = ({
  passwordData, setPasswordData,
  showPasswords, setShowPasswords,
  saving, handlePasswordSubmit, user
}) => (
  <div className="space-y-6">
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Updating...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Update Password</span>
            </>
          )}
        </button>
      </div>
    </form>

    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Last Login</p>
            <p className="text-sm text-gray-600">
              {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
            </p>
          </div>
          <Check className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Account Created</p>
            <p className="text-sm text-gray-600">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          <Check className="w-5 h-5 text-green-500" />
        </div>
      </div>
    </div>
  </div>
);

const SystemAdminTab = ({
  locations, handleLocationAdd, handleLocationDelete,
  bookingStatus, handleToggleBookingStatus,
  savingSystem, fetchingSystem,
  newLocName, setNewLocName, newLocCap, setNewLocCap
}) => (
  <div className="space-y-6">
    {fetchingSystem ? (
       <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
    ) : (
      <>
        {/* Module: Open Scheduling Toggle */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><Power className="w-5 h-5 text-emerald-600" /> Booking System Master Switch</h3>
              <p className="text-sm text-gray-600 mt-1">Globally enable or disable the ability for students to book new duties.</p>
            </div>
            <button
              onClick={handleToggleBookingStatus}
              disabled={savingSystem}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${bookingStatus === 'open' ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${bookingStatus === 'open' ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${bookingStatus === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
             <span className={`w-2 h-2 rounded-full ${bookingStatus === 'open' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
             System is currently {bookingStatus === 'open' ? 'OPEN' : 'CLOSED'} for new student bookings.
          </div>
        </div>

        {/* Module: Hospital Locations */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Hospital Locations Config</h3>
            <p className="text-sm text-gray-600 mt-1">Manage dynamic locations available for duty schedules. Delete unused locations or add new ones.</p>
          </div>
          
          <form className="flex items-end gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100" onSubmit={(e) => { e.preventDefault(); handleLocationAdd(); }}>
            <div className="flex-1">
               <label className="block text-xs font-medium text-gray-500 mb-1">New Location Name</label>
               <input type="text" className="input-field py-2 text-sm" placeholder="e.g. RHU - XYZ" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} required />
            </div>
            <div className="w-32">
               <label className="block text-xs font-medium text-gray-500 mb-1">Default Slots</label>
               <input type="number" min="1" className="input-field py-2 text-sm" value={newLocCap} onChange={(e) => setNewLocCap(e.target.value)} required />
            </div>
            <button type="submit" disabled={savingSystem} className="btn-primary py-2 px-4 flex items-center gap-2 h-[38px]">
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {locations.map((loc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-emerald-200 hover:shadow-sm transition-all group">
                 <div>
                   <p className="font-medium text-gray-900 text-sm">{loc.name}</p>
                   <p className="text-xs text-gray-500">Default slots: {loc.capacity}</p>
                 </div>
                 <button onClick={() => handleLocationDelete(idx)} disabled={savingSystem} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                   <X className="w-4 h-4" />
                 </button>
              </div>
            ))}
            {locations.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No locations configured.</p>}
          </div>
        </div>
      </>
    )}
  </div>
);

/* ── Main Component ── */

const ProfileSettings = ({ user, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    middle_initial: user?.middle_initial || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    student_number: user?.student_number || '',
    year_level: user?.year_level || '',
    role: user?.role || '',
    avatar_url: user?.avatar_url || ''
  });

  const [avatarUpload, setAvatarUpload] = useState({
    file: null,
    preview: null,
    uploading: false
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // System Administration States
  const [locations, setLocations] = useState([]);
  const [bookingStatus, setBookingStatus] = useState('open');
  const [fetchingSystem, setFetchingSystem] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCap, setNewLocCap] = useState(4);

  const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_initial: user.middle_initial || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        student_number: user.student_number || '',
        year_level: user.year_level || '',
        role: user.role || '',
        avatar_url: user.avatar_url || ''
      });
      if (isAdmin) {
        fetchSystemSettings();
      }
    }
  }, [user]);

  const fetchSystemSettings = async () => {
    setFetchingSystem(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      if (data) {
        const bl = data.find(item => item.key === 'hospital_locations');
        if (bl) setLocations(JSON.parse(bl.value));
        const bs = data.find(item => item.key === 'booking_system_status');
        if (bs) setBookingStatus(bs.value);
      }
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setMessage({ type: 'error', text: 'Failed to load system settings' });
    } finally {
      setFetchingSystem(false);
    }
  };

  const handleToggleBookingStatus = async () => {
    const newStatus = bookingStatus === 'open' ? 'closed' : 'open';
    setSavingSystem(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'booking_system_status', value: newStatus }, { onConflict: 'key' });
      if (error) throw error;
      setBookingStatus(newStatus);
      setMessage({ type: 'success', text: `Booking system is now ${newStatus}.` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error toggling system: ' + err.message });
    } finally {
      setSavingSystem(false);
    }
  };

  const handleLocationAdd = async () => {
    if (!newLocName.trim()) return;
    setSavingSystem(true);
    const updatedLocs = [...locations, { name: newLocName, capacity: parseInt(newLocCap) || 4, description: newLocName }];
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'hospital_locations', value: JSON.stringify(updatedLocs) }, { onConflict: 'key' });
      if (error) throw error;
      setLocations(updatedLocs);
      setNewLocName('');
      setNewLocCap(4);
      setMessage({ type: 'success', text: 'Location added successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding location: ' + err.message });
    } finally {
      setSavingSystem(false);
    }
  };

  const handleLocationDelete = async (idx) => {
    if (!window.confirm('Are you sure you want to remove this location type?')) return;
    setSavingSystem(true);
    const updatedLocs = [...locations];
    updatedLocs.splice(idx, 1);
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'hospital_locations', value: JSON.stringify(updatedLocs) }, { onConflict: 'key' });
      if (error) throw error;
      setLocations(updatedLocs);
      setMessage({ type: 'success', text: 'Location removed successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error removing location: ' + err.message });
    } finally {
      setSavingSystem(false);
    }
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, or WebP)' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarUpload({ file, preview: e.target.result, uploading: false });
      setMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!avatarUpload.file) return null;
    setAvatarUpload(prev => ({ ...prev, uploading: true }));
    try {
      const fileExt = avatarUpload.file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      if (profileData.avatar_url) {
        const oldFileName = profileData.avatar_url.split('/').pop();
        await supabase.storage.from('user-uploads').remove([`avatars/${oldFileName}`]);
      }
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, avatarUpload.file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    } finally {
      setAvatarUpload(prev => ({ ...prev, uploading: false }));
    }
  };

  const removeAvatar = async () => {
    try {
      setAvatarUpload({ file: null, preview: null, uploading: false });
      if (profileData.avatar_url) {
        const fileName = profileData.avatar_url.split('/').pop();
        await supabase.storage.from('user-uploads').remove([`avatars/${fileName}`]);
        const { error } = await supabase
          .from('profiles').update({ avatar_url: null }).eq('id', user.id);
        if (error) throw error;
        setProfileData(prev => ({ ...prev, avatar_url: '' }));
        setMessage({ type: 'success', text: 'Avatar removed successfully!' });
        if (onProfileUpdate) onProfileUpdate({ ...user, avatar_url: null });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing avatar: ' + error.message });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      let avatarUrl = profileData.avatar_url;
      if (avatarUpload.file) avatarUrl = await uploadAvatar();
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) throw new Error('Authentication required. Please log in again.');
      const updateData = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        middle_initial: profileData.middle_initial,
        phone_number: profileData.phone_number,
        student_number: profileData.student_number,
        year_level: profileData.year_level,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error && error.code === 'PGRST204') {
        const fallbackData = {
          full_name: `${profileData.first_name} ${profileData.last_name}`.trim(),
          phone_number: profileData.phone_number,
          student_number: profileData.student_number,
          year_level: profileData.year_level,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        };
        const { error: fError } = await supabase
          .from('profiles')
          .update(fallbackData)
          .eq('id', currentUser.id);
        if (fError) throw fError;
      } else if (error) {
        if (error.code === '42501' || error.message.includes('row-level security'))
          throw new Error('Permission denied. Please contact administrator if this persists.');
        throw error;
      }
      const updatedProfile = { ...profileData, avatar_url: avatarUrl };
      setProfileData(updatedProfile);
      setAvatarUpload({ file: null, preview: null, uploading: false });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      if (onProfileUpdate) onProfileUpdate({ ...user, ...updatedProfile });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setSaving(false);
      return;
    }
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setSaving(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new_password });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    ...(isAdmin ? [{ id: 'system', label: 'System Admin', icon: Database }] : [])
  ];

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
          <p className="text-sm text-gray-500">Manage your profile and security preferences below.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleAvatarSelect}
          className="hidden"
        />

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'personal' && (
          <PersonalInfoTab
            profileData={profileData}
            setProfileData={setProfileData}
            avatarUpload={avatarUpload}
            saving={saving}
            fileInputRef={fileInputRef}
            removeAvatar={removeAvatar}
            handleProfileSubmit={handleProfileSubmit}
            userRole={user?.role}
          />
        )}
        {activeTab === 'security' && (
          <SecurityTab
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            showPasswords={showPasswords}
            setShowPasswords={setShowPasswords}
            saving={saving}
            handlePasswordSubmit={handlePasswordSubmit}
            user={user}
          />
        )}
        {activeTab === 'system' && isAdmin && (
          <SystemAdminTab
            locations={locations} handleLocationAdd={handleLocationAdd} handleLocationDelete={handleLocationDelete}
            bookingStatus={bookingStatus} handleToggleBookingStatus={handleToggleBookingStatus}
            savingSystem={savingSystem} fetchingSystem={fetchingSystem}
            newLocName={newLocName} setNewLocName={setNewLocName} newLocCap={newLocCap} setNewLocCap={setNewLocCap}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
