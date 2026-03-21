import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  UserPlus,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  GraduationCap,
  Users,
  CheckCircle,
  ArrowLeft,
  Heart,
  Lock,
  Mail,
  Phone,
  User,
  Hash
} from 'lucide-react';

const AuthForm = ({ onBackToHome, initialError = '', onErrorShown, initialTab = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialTab !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [slideDir, setSlideDir] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    studentId: '',
    phoneNumber: '',
    studentNumber: '',
    yearLevel: '1st Year'
  });
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState('');

  // Display deactivated-account error passed from App.js, then clear it from parent state
  React.useEffect(() => {
    if (initialError) {
      setError(initialError);
      onErrorShown?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  // Cache for student ID validation to prevent excessive database calls
  const studentIdCache = new Map();

  const validateStudentId = async (studentId) => {
    const trimmedId = studentId.trim();

    // Check cache first (case-insensitive)
    const cacheKey = trimmedId.toLowerCase();
    if (studentIdCache.has(cacheKey)) {
      return studentIdCache.get(cacheKey);
    }

    try {
      console.log('Validating student ID:', trimmedId);

      // Use case-insensitive search by converting both to lowercase
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_number')
        .eq('role', 'student')
        .ilike('student_number', trimmedId);

      let result;
      if (error) {
        console.error('Error validating student ID:', error);
        result = { isValid: false, message: 'Unable to verify student ID. Please try again.' };
      } else if (!data || data.length === 0) {
        console.log('No student found with ID:', trimmedId);
        result = { isValid: false, message: `Student ID "${trimmedId}" not found. Please check the ID and try again.` };
      } else if (data.length > 1) {
        console.warn('Multiple students found with same ID:', data);
        result = { isValid: false, message: 'Multiple students found with this ID. Please contact support.' };
      } else {
        console.log('Student found:', data[0].full_name, 'with ID:', data[0].student_number);
        result = { isValid: true, student: data[0] };
      }

      // Cache the result for 5 minutes using lowercase key
      studentIdCache.set(cacheKey, result);
      setTimeout(() => studentIdCache.delete(cacheKey), 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Student ID validation error:', error);
      const result = { isValid: false, message: 'Unable to verify student ID. Please try again.' };
      studentIdCache.set(cacheKey, result);
      return result;
    }
  };

  const validateForm = async () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return { isValid: false };
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return { isValid: false };
    }

    if (!isLogin) {
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return { isValid: false };
      }

      if (formData.role === 'parent' && !formData.studentId.trim()) {
        setError('Student ID is required for parent accounts');
        return { isValid: false };
      }

      if (formData.role === 'student' && !formData.studentNumber.trim()) {
        setError('Student number is required');
        return { isValid: false };
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return { isValid: false };
      }

      // Validate student ID for parent accounts - return validation result to reuse
      if (formData.role === 'parent' && formData.studentId.trim()) {
        const validation = await validateStudentId(formData.studentId);
        if (!validation.isValid) {
          setError(validation.message);
          return { isValid: false };
        }
        // Return the validation result so we can reuse it in handleSubmit
        return { isValid: true, studentValidation: validation };
      }
    }

    return { isValid: true };
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccess('Password reset link sent! Check your email and follow the link to reset your password. The link expires in 15 minutes.');
    } catch (err) {
      // Always show success to prevent email enumeration attacks
      setSuccess('If an account exists for that email, a reset link has been sent. Please check your inbox.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async () => {
    const validationResult = await validateForm();
    if (!validationResult.isValid) return;

    // Prevent multiple rapid submissions
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Check account status BEFORE signing in
        const { data: statusRows } = await supabase.rpc('get_user_status', { p_email: formData.email.trim() });
        const status = statusRows?.[0];
        if (status) {
          if (status.approval_status === 'pending') {
            setError('Your registration is pending admin approval. Please wait for the admin to review your account.');
            setLoading(false);
            return;
          }
          if (status.approval_status === 'declined') {
            setError(`Your registration was declined: ${status.rejection_reason || 'You do not meet the requirements.'}`);
            setLoading(false);
            return;
          }
          if (status.is_active === false) {
            setError('Your account has been deactivated. Please contact an administrator.');
            setLoading(false);
            return;
          }
        } else {
          // No profile yet — check pending_registrations (pre-auth signup)
          const { data: pendingReg } = await supabase
            .from('pending_registrations')
            .select('status, rejection_reason')
            .eq('email', formData.email.trim())
            .maybeSingle();
          if (pendingReg?.status === 'pending') {
            setError('Your registration is pending admin approval. You will receive a login link by email once approved.');
            setLoading(false);
            return;
          }
          if (pendingReg?.status === 'declined') {
            setError(`Your registration was declined: ${pendingReg.rejection_reason || 'You do not meet the requirements.'}`);
            setLoading(false);
            return;
          }
        }

        // Login
        console.log('Attempting login for:', formData.email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          console.error('Login error:', error);
          throw error;
        }

        console.log('Login successful for:', data.user.email);
        setSuccess('Login successful! Redirecting...');

        // Create login log
        setTimeout(async () => {
          try {
            await supabase.from('duty_logs').insert({
              action: 'login',
              performed_by: data.user.id,
              notes: 'User logged in successfully'
            });
          } catch (logError) {
            console.warn('Failed to create login log:', logError);
          }
        }, 1000);

      } else {
        // Register — store in pending_registrations (NO auth user created, NO email sent)
        console.log('Submitting registration request for:', formData.email);

        let studentUserId = null;
        if (formData.role === 'parent' && validationResult.studentValidation) {
          studentUserId = validationResult.studentValidation.student.id;
        }

        // Check for duplicate pending/declined registration
        const { data: existing } = await supabase
          .from('pending_registrations')
          .select('id, status')
          .eq('email', formData.email.trim())
          .maybeSingle();

        if (existing) {
          if (existing.status === 'pending') {
            setError('A registration request with this email is already pending admin review.');
            setLoading(false);
            return;
          }
          if (existing.status === 'declined') {
            setError('Your previous registration was declined. Please contact an administrator.');
            setLoading(false);
            return;
          }
        }

        const { error: regError } = await supabase.from('pending_registrations').insert({
          email: formData.email.trim(),
          full_name: formData.fullName.trim(),
          role: formData.role,
          phone_number: formData.phoneNumber.trim() || null,
          student_number: formData.role === 'student' ? formData.studentNumber.trim() : null,
          year_level: formData.role === 'student' ? formData.yearLevel : null,
          student_id: formData.role === 'parent' ? studentUserId : null,
          status: 'pending'
        });

        if (regError) throw regError;

        console.log('Registration request submitted for review:', formData.email);
        setSuccess('Registration submitted! An admin will review your application. You will receive a login link by email once your account is approved.');
      }
    } catch (error) {
      console.error('Auth error:', error);

      // Provide more user-friendly error messages
      let errorMessage = error.message;

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before logging in.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message.includes('rate limit exceeded') || error.status === 429) {
        errorMessage = 'Too many signup attempts. Please wait a few minutes before trying again. If you already have an account, try logging in instead.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50 relative">

      {/* Top Bar with Back Button */}
      <div className="fixed top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-2 text-emerald-700 hover:text-emerald-900 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg border border-emerald-100 transition-all duration-200 text-sm font-medium group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>
        )}
       
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 pt-24 pb-8">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-emerald-50">
                <img
                  src="/image0.png"
                  alt="ISCC Midwifery Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-1">
              Kumadronas System
            </h1>
            <p className="text-gray-600 font-medium text-sm">Ilocos Sur Community College</p>
            <p className="text-gray-400 text-xs mt-0.5">On-Call Duty Scheduling System</p>
          </div>

          {/* Auth Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">

            {/* Forgot Password View */}
            {isForgotPassword ? (
              <div className="p-8">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                  className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium mb-5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Forgot your password?</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter your email and we'll send you a reset link. The link expires in <span className="font-semibold text-emerald-600">15 minutes</span> and can only be used <span className="font-semibold text-emerald-600">once</span>.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setError(''); setSuccess(''); }}
                        onKeyPress={e => e.key === 'Enter' && handleForgotPassword()}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                        placeholder="your.email@iscc.edu"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start space-x-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{success}</p>
                    </div>
                  )}

                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading || !!success}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {forgotLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Sending reset link...</span>
                      </div>
                    ) : 'Send Reset Link'}
                  </button>
                </div>
              </div>
            ) : (
            <>
            {/* Tab Toggle */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => { if (!isLogin) { setSlideDir('left'); setIsLogin(true); setError(''); setSuccess(''); } }}
                className={`flex-1 py-4 px-4 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isLogin
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-inner'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => { if (isLogin) { setSlideDir('right'); setIsLogin(false); setError(''); setSuccess(''); } }}
                className={`flex-1 py-4 px-4 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-inner'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </button>
            </div>

            <div className="p-8 overflow-hidden">
              <div
                key={isLogin ? 'login' : 'register'}
                style={{ animation: `${slideDir === 'right' ? 'slideFromRight' : slideDir === 'left' ? 'slideFromLeft' : 'none'} 0.35s cubic-bezier(0.4,0,0.2,1) both` }}
              >
              {/* Welcome Text */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isLogin ? 'Welcome back!' : 'Create your account'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {isLogin
                    ? 'Sign in to access your duty schedule'
                    : 'Join the ISCC midwifery community'}
                </p>
              </div>

              <div className="space-y-4">

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                      placeholder="your.email@iscc.edu"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                      placeholder="Enter your password"
                      required
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password link — login mode only */}
                {isLogin && (
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); setForgotEmail(formData.email); }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Registration Fields */}
                {!isLogin && (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                          placeholder="Juan Dela Cruz"
                          required
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Account Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Midwifery Student' },
                          { value: 'parent', label: 'Parent', icon: Users, desc: 'Parent / Guardian' }
                        ].map(({ value, label, icon: Icon, desc }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: value })}
                            className={`p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                              formData.role === value
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-1.5 ${formData.role === value ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <p className={`text-sm font-semibold ${formData.role === value ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Student Fields */}
                    {formData.role === 'student' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Student Number
                          </label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              name="studentNumber"
                              value={formData.studentNumber}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                              placeholder="C-23-12345"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Year Level
                          </label>
                          <select
                            name="yearLevel"
                            value={formData.yearLevel}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                            required
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Parent Fields */}
                    {formData.role === 'parent' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Child's Student ID
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                            placeholder="C-23-12345"
                            required
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center space-x-1">
                          <Shield className="w-3 h-3" />
                          <span>Enter your child's student number (e.g., C-23-19038)</span>
                        </p>
                      </div>
                    )}

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Phone Number <span className="text-gray-400 normal-case font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                          placeholder="09123456789"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-start space-x-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm whitespace-pre-line">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{success}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                    </div>
                  ) : (
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  )}
                </button>

              </div>
              </div>{/* end animated wrapper */}

              {/* Footer Toggle */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => { const toLogin = !isLogin; setSlideDir(toLogin ? 'left' : 'right'); setIsLogin(toLogin); setError(''); setSuccess(''); }}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2"
                  >
                    {isLogin ? 'Register here' : 'Sign in here'}
                  </button>
                </p>
              </div>
            </div>
            </> /* end isForgotPassword else */
            )}
          </div>

         

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2025 Ilocos Sur Community College. All rights reserved.
          </p>

        </div>
      </div>

      <style>{`
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AuthForm;
