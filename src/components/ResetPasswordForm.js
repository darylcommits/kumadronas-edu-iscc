import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield, Heart } from 'lucide-react';

// Generate a cryptographically secure 64-character token (32 random bytes → 64 hex chars)
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Hash the token with SHA-256 using the Web Crypto API — only the hash is stored in the DB
const hashToken = async (token) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const ResetPasswordForm = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    let tokenRecordId = null;

    try {
      // Step 1: Verify the active recovery session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Session expired. Please request a new password reset link.');
      }

      // Step 2: Check if user already used their reset token (prevent replay)
      const { data: existingUsed } = await supabase
        .from('password_reset_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('used', true)
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingUsed) {
        throw new Error('This reset link has already been used. Please request a new one.');
      }

      // Step 3: Generate a 64-character cryptographically secure plain token
      const plainToken = generateToken(); // 64 hex chars — never stored

      // Step 4: Hash with SHA-256 — only the hash goes into the database
      const tokenHash = await hashToken(plainToken);

      // Step 5: Set expiry to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Step 6: Store only the hash (never the plain token)
      const { data: tokenRecord, error: tokenInsertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used: false,
        })
        .select('id')
        .single();

      if (tokenInsertError) {
        throw new Error('Failed to initiate password reset. Please try again.');
      }
      tokenRecordId = tokenRecord.id;

      // Step 7: Attempt the password update via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password });

      // Step 8: IMMEDIATELY mark token as used — single-use enforced even if update failed
      await supabase
        .from('password_reset_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', tokenRecordId);

      if (updateError) throw updateError;

      setSuccess('Password updated successfully! You can now sign in with your new password.');
      setTimeout(() => {
        supabase.auth.signOut().then(() => onDone());
      }, 3000);

    } catch (err) {
      // Token is already consumed (step 8 runs regardless), preventing reuse even on failure
      setError(err.message || 'Failed to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-emerald-50">
              <img src="/image0.png" alt="ISCC Midwifery Logo" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Heart className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-1">
            Reset Password
          </h1>
          <p className="text-gray-600 font-medium text-sm">Ilocos Sur Community College</p>
          <p className="text-gray-400 text-xs mt-0.5">Create a new secure password</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 space-y-5">

          {/* Security notice */}
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">
              This reset link is single-use and expires in 15 minutes
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                placeholder="Minimum 8 characters"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                placeholder="Re-enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start space-x-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !!success}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Updating password...</span>
              </div>
            ) : 'Update Password'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2025 Ilocos Sur Community College. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
