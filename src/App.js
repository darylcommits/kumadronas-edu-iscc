import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import ResetPasswordForm from './components/ResetPasswordForm';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showLanding, setShowLanding] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return;
    setProfileLoading(true);

    try {
      console.log('Fetching profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        return;
      }

      if (data) {
        // Block deactivated accounts — never show the dashboard
        if (data.is_active === false) {
          console.log('Account is deactivated, signing out...');
          setAuthError('Your account has been deactivated. Please contact an administrator.');
          await supabase.auth.signOut();
          return;
        }

        console.log('Profile loaded:', data.full_name, data.role);
        setUser(data);

        // Update last login (non-blocking)
        supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)
          .catch(err => console.warn('Failed to update last login:', err));
      } else {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile...');
        await createProfileFromAuth(userId);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const createProfileFromAuth = async (userId) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) return;

      const metadata = authUser.user_metadata || {};

      // For self-registered users (approved via magic link), pull data from pending_registrations
      let { data: pendingReg } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('email', authUser.email)
        .eq('status', 'approved')
        .maybeSingle();

      // Fallback: search without status filter (handles race conditions / edge cases)
      if (!pendingReg) {
        const { data: anyReg } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('email', authUser.email)
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (anyReg) pendingReg = anyReg;
      }

      const profileData = {
        id: userId,
        email: authUser.email,
        full_name: pendingReg?.full_name || metadata.full_name || authUser.email.split('@')[0],
        role: pendingReg?.role || metadata.role || 'student',
        phone_number: pendingReg?.phone_number || metadata.phone_number || null,
        student_number: pendingReg?.student_number || metadata.student_number || null,
        year_level: pendingReg?.year_level || metadata.year_level || null,
        is_active: true,
        approval_status: 'approved'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (existingProfile) {
            setUser(existingProfile);
            return;
          }
        }
        console.error('Error creating profile:', error);
        return;
      }

      console.log('Profile created successfully:', data.full_name);
      setUser(data);

      supabase.from('notifications').insert({
        user_id: data.id,
        title: 'Welcome to Comadronas System!',
        message: `Welcome ${data.full_name}! Your account has been created successfully.`,
        type: 'success'
      }).catch(err => console.warn('Failed to send welcome notification:', err));

    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setShowLanding(true);
            setInitialized(true);
          }
          return;
        }

        if (!isMounted) return;

        if (session?.user) {
          console.log('Found existing session for:', session.user.email);
          setSession(session);
          setShowLanding(false);
          setInitialized(true);
          fetchUserProfile(session.user.id);
        } else {
          console.log('No existing session found');
          setShowLanding(true);
          setInitialized(true);
        }

      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) {
          setShowLanding(true);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, session?.user?.email);

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — show the reset form
        console.log('Password recovery event received');
        setShowResetPassword(true);
        setShowLanding(false);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email);
        setShowResetPassword(false);
        setSession(session);
        setError(null);
        setShowLanding(false);
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setUser(null);
        setError(null);
        setProfileLoading(false);
        setShowLanding(true);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed');
        setSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const handleProfileUpdate = useCallback((updatedUser) => {
    console.log('Profile updated:', updatedUser.full_name);
    setUser(updatedUser);
  }, []);

  const [authInitialTab, setAuthInitialTab] = useState('login');

  const handleGetStarted = useCallback((tab = 'login') => {
    setAuthInitialTab(tab);
    setShowLanding(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    if (session?.user) {
      fetchUserProfile(session.user.id);
    } else {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        if (session) {
          setSession(session);
          fetchUserProfile(session.user.id);
        } else {
          setShowLanding(true);
        }
      });
    }
  }, [session, fetchUserProfile]);

  // System error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button onClick={handleRetry} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                Try Again
              </button>
              <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not yet checked for session
  if (!initialized) return null;

  // Password reset form — triggered by clicking the reset email link
  if (showResetPassword) {
    return <ResetPasswordForm onDone={() => { setShowResetPassword(false); setShowLanding(true); }} />;
  }

  // Landing page
  if (showLanding && !session) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Loading profile (session exists but profile not yet confirmed)
  if (session && profileLoading) {
    return <LoadingSpinner />;
  }

  // Auth form (no session, or session but no user after profile check)
  if (!session || !user) {
    return <AuthForm onBackToHome={() => setShowLanding(true)} initialError={authError} onErrorShown={() => setAuthError('')} initialTab={authInitialTab} />;
  }

  // Dashboard — only reached when profile confirmed active
  return (
    <Dashboard
      user={user}
      session={session}
      onProfileUpdate={handleProfileUpdate}
    />
  );
}

export default App;
