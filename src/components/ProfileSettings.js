// ProfileSettings.js - User profile settings with avatar upload functionality
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Save,
  Camera,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  GraduationCap,
  Upload,
  Trash2
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
        {userName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
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
            userName={profileData.full_name}
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
                className="btn-secondary text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
        <div className="relative">
          <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={profileData.full_name}
            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
            className="input-field pl-10"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <div className="relative">
          <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={profileData.email}
            className="input-field pl-10 bg-gray-50"
            disabled
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <div className="relative">
          <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            value={profileData.phone_number}
            onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
            className="input-field pl-10"
            placeholder="09123456789"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Contact number is required for emergency notifications</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div className="relative">
          <Shield className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1)}
            className="input-field pl-10 bg-gray-50 capitalize"
            disabled
          />
        </div>
      </div>

      {userRole === 'student' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Number</label>
            <div className="relative">
              <GraduationCap className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={profileData.student_number}
                onChange={(e) => setProfileData({ ...profileData, student_number: e.target.value })}
                className="input-field pl-10"
                placeholder="2024-12345"
              />
            </div>
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
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="input-field pl-10 pr-10"
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
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="input-field pl-10 pr-10"
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
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="input-field pl-10 pr-10"
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

/* ── Main Component ── */

const ProfileSettings = ({ user, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
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

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        student_number: user.student_number || '',
        year_level: user.year_level || '',
        role: user.role || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

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
      const { error } = await supabase.from('profiles').update({
        full_name: profileData.full_name,
        phone_number: profileData.phone_number,
        student_number: profileData.student_number,
        year_level: profileData.year_level,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id).eq('email', currentUser.email);
      if (error) {
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

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
        <div className="flex items-center space-x-4 mb-6">
          <AvatarDisplay
            avatarPreview={avatarUpload.preview}
            avatarUrl={profileData.avatar_url}
            userName={user?.full_name}
            size="large"
          />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.full_name}</h3>
            <p className="text-gray-600 capitalize">{user?.role}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Upload new avatar"
          >
            <Camera className="w-5 h-5" />
          </button>
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
      </div>
    </div>
  );
};

export default ProfileSettings;
