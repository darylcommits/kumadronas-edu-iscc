// Dashboard.js - FIXED VERSION WITH:
// 1. Proper individual booking approval status in calendar
// 2. Working system logs from duty_logs table
// 3. Fixed admin notifications
import React, { useState, useEffect } from 'react';
import { supabase, dbHelpers } from '../lib/supabase';
import { sendSmsNotification, sendEmailNotification } from '../lib/externalNotifications';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import StudentManagement from './StudentManagement';
import ReportsAnalytics from './ReportsAnalytics';
import ProfileSettings from './ProfileSettings';
import ScheduleManagement from './ScheduleManagement';
import UserManagement from './UserManagement';
import { useToast, ToastContainer } from './Toast';
import {
  Calendar,
  Users,
  Clock,
  Bell,
  LogOut,
  Menu,
  X,
  Check,
  User,
  Shield,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Activity,
  Ban,
  Settings,
  Home,
  Star,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  Trash2,
  Award,
  Filter,
  AlertTriangle,
  MapPin,
  Send,
  Hash
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = ({ user, session, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [schedules, setSchedules] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSignupsCount, setPendingSignupsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [studentDuties, setStudentDuties] = useState([]);
  const [childDuties, setChildDuties] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [childName, setChildName] = useState('');
  const [chartData, setChartData] = useState({
    locationDistribution: {},
    bookingTrends: {},
    approvalStatus: {}
  });
  const [pendingBookings, setPendingBookings] = useState([]);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [scheduleToReject, setScheduleToReject] = useState(null);
  const [studentToReject, setStudentToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [dailyCancellations, setDailyCancellations] = useState(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [bookingToConfirm, setBookingToConfirm] = useState(null); // { scheduleId, date }
  const [approveToConfirm, setApproveToConfirm] = useState(null); // { scheduleId, scheduleStudentId, studentName }
  const [approveAllToConfirm, setApproveAllToConfirm] = useState(null); // { scheduleId, studentCount }
  // FIXED: Add state for system logs
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemLogsPage, setSystemLogsPage] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const LOGS_PER_PAGE = 10;
  const ADMIN_LOG_ACTIONS = [
    'approved', 'approved_individual', 'approved_all', 'approved_schedule',
    'rejected', 'rejected_individual', 'rejected_all', 'rejected_schedule',
    'deactivated', 'activated', 'created', 'user_created', 'user_updated',
    'user_activated', 'user_deactivated', 'registration_approved',
    'registration_declined', 'schedule_created', 'schedule_updated', 'schedule_deleted',
    'settings_updated'
  ];
  const [showDutyDetailsModal, setShowDutyDetailsModal] = useState(false);
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('open');
  const [hospitalLocations, setHospitalLocations] = useState([]);
  // Multi-child states for parents
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [linkStudentNumber, setLinkStudentNumber] = useState('');
  const [isRequestingLink, setIsRequestingLink] = useState(false);

  // Role helper — co-admin has the same access as admin
  const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

  // Toast notifications
  const { toasts, removeToast, success, error, warning } = useToast();

  useEffect(() => {
    initializeDashboard();

    // Set up real-time subscriptions
    const notificationChannel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    const scheduleChannel = supabase
      .channel('schedules')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          fetchSchedules();
          fetchPendingBookings();
        }
      )
      .subscribe();

    const scheduleStudentsChannel = supabase
      .channel('schedule_students')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_students' },
        () => {
          fetchSchedules();
          fetchPendingBookings();
          if (user?.role === 'student') {
            fetchStudentDuties();
            fetchDashboardStats();
          }
          if (user?.role === 'parent') {
            fetchChildDuties();
          }
        }
      )
      .subscribe();

    // FIXED: Add real-time subscription for duty logs
    const dutyLogsChannel = supabase
      .channel('duty_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duty_logs' },
        () => {
          if (isAdmin) {
            fetchSystemLogs();
          }
        }
      )
      .subscribe();

    const systemSettingsChannel = supabase
      .channel('system_settings')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          fetchBookingStatus();
          fetchHospitalLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(scheduleStudentsChannel);
      supabase.removeChannel(dutyLogsChannel);
      supabase.removeChannel(systemSettingsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.classList.add('sidebar-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const initializeDashboard = async () => {
    // Run all fetches in background, don't block UI
    Promise.all([
      fetchSchedules(),
      fetchNotifications(),
      fetchDashboardStats(),
      fetchPendingBookings(),
      fetchChartData(),
      fetchBookingStatus(),
      fetchHospitalLocations(),
      user?.role === 'student' && fetchStudentDuties(),
      user?.role === 'parent' && fetchLinkedChildren(),
      isAdmin && fetchSystemLogs(), // FIXED: Fetch system logs for admin
      isAdmin && fetchPendingCount()
    ]);
  };

  const fetchBookingStatus = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'booking_system_status').single();
      if (!error && data) setBookingStatus(data.value);
    } catch (e) {
      console.warn('Could not fetch booking status', e);
    }
  };

  const fetchHospitalLocations = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'hospital_locations').single();
      if (!error && data) setHospitalLocations(JSON.parse(data.value));
    } catch (e) {
      console.warn('Could not fetch locations', e);
    }
  };

  // FIXED: Add function to fetch system logs from duty_logs table
  const fetchSystemLogs = async (page = 1) => {
    try {
      console.log(`Fetching system logs (Page ${page}) from duty_logs table...`);
      const from = (page - 1) * LOGS_PER_PAGE;
      const to = from + LOGS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('duty_logs')
        .select(`
          *,
          performed_by_profile:profiles!performed_by (
            id, first_name, last_name, middle_initial, email
          ),
          target_user_profile:profiles!target_user (
            id, first_name, last_name, middle_initial, email
          ),
          schedule_students (
            id,
            schedules (
              date, location, description
            )
          )
        `, { count: 'exact' })
        .in('action', ADMIN_LOG_ACTIONS)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      console.log('System logs fetched:', data, 'Total count:', count);
      setSystemLogs(data || []);
      setTotalLogsCount(count || 0);
      setSystemLogsPage(page);
    } catch (error) {
      console.error('Error fetching system logs:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      // Location distribution - Fetch total active students per area
      const { data: studentBookings } = await supabase
        .from('schedule_students')
        .select(`
          status,
          schedules (
            location
          )
        `)
        .neq('status', 'cancelled');

      const locationCounts = studentBookings?.reduce((acc, curr) => {
        const loc = curr.schedules?.location;
        if (loc) {
          acc[loc] = (acc[loc] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Booking trends (last 7 days) — count new bookings by created_at date
      const { data: bookingData } = await supabase
        .from('schedule_students')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const dateCounts = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dateCounts[dateStr] = 0;
      }

      bookingData?.forEach(booking => {
        const dateStr = new Date(booking.created_at).toISOString().split('T')[0];
        if (Object.prototype.hasOwnProperty.call(dateCounts, dateStr)) {
          dateCounts[dateStr]++;
        }
      });

      // Approval status — count by schedule_students.status
      const { data: approvalData } = await supabase
        .from('schedule_students')
        .select('status');

      const statusCounts = approvalData?.reduce((acc, curr) => {
        const s = curr.status === 'booked' ? 'pending' : (curr.status || 'pending');
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {}) || {};

      setChartData({
        locationDistribution: locationCounts,
        bookingTrends: dateCounts,
        approvalStatus: statusCounts
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  // FIXED: Enhanced fetchSchedules with proper joins to get accurate student counts AND individual statuses
  const fetchSchedules = async () => {
    try {
      console.log('Fetching schedules with student counts...');
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          schedule_students (
            id,
            student_id,
            booking_time,
            status,
            cancelled_at,
            profiles:student_id (
              id,
              first_name,
              last_name,
              middle_initial,
              email,
              student_number
            )
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
        return;
      }

      // Filter out cancelled bookings and only count active ones
      const processedSchedules = data?.map(schedule => ({
        ...schedule,
        schedule_students: schedule.schedule_students?.filter(ss => ss.status !== 'cancelled') || []
      })) || [];

      console.log('Processed schedules with student counts:', processedSchedules);
      setSchedules(processedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // FIXED: System Logs View Component - now using server-side pagination & filtered data
  const renderSystemLogsView = () => {
    const totalPages = Math.max(1, Math.ceil(totalLogsCount / LOGS_PER_PAGE));
    const pageStart = (systemLogsPage - 1) * LOGS_PER_PAGE;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSystemLogs}
              className="btn-secondary flex items-center space-x-2"
            >
              <Activity className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="text-sm text-gray-600">
              {totalLogsCount} admin action{totalLogsCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Target User</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {systemLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${log.action === 'approved' || log.action === 'approved_individual' || log.action === 'approved_all' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'rejected' || log.action === 'rejected_individual' || log.action === 'rejected_all' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.performed_by_profile ? `${log.performed_by_profile.first_name} ${log.performed_by_profile.last_name}` : 'System'}
                        </div>
                        <div className="text-gray-500 text-xs">{log.performed_by_profile?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {log.target_user_profile ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.target_user_profile.first_name} {log.target_user_profile.last_name}
                          </div>
                          <div className="text-gray-500 text-xs">{log.target_user_profile.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      <div className="max-w-xs">
                        <div className="truncate">{log.notes}</div>
                        {log.schedule_students?.[0]?.schedules && (
                          <div className="text-xs text-gray-500 mt-1">
                            📅 {new Date(log.schedule_students[0].schedules.date).toLocaleDateString()}
                            {log.schedule_students[0].schedules.location && ` • ${log.schedule_students[0].schedules.location}`}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {systemLogs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No admin actions found</h3>
              <p className="text-gray-600">Administrative activity will appear here once performed.</p>
            </div>
          )}

          {totalLogsCount > LOGS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 mt-2">
              <p className="text-sm text-gray-500">
                Showing {pageStart + 1}–{Math.min(pageStart + LOGS_PER_PAGE, totalLogsCount)} of {totalLogsCount}
              </p>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => fetchSystemLogs(Math.max(1, systemLogsPage - 1))}
                  disabled={systemLogsPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>

                {/* Pagination context or condensed page dots for many pages */}
                {totalPages <= 8 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => fetchSystemLogs(p)}
                      className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${p === systemLogsPage ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >{p}</button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => fetchSystemLogs(1)}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${systemLogsPage === 1 ? 'bg-emerald-600 text-white' : 'border-gray-200'}`}
                    >1</button>
                    {systemLogsPage > 3 && <span className="px-2 text-gray-400">...</span>}

                    {Array.from({ length: 3 }, (_, i) => systemLogsPage - 1 + i)
                      .filter(p => p > 1 && p < totalPages)
                      .map(p => (
                        <button
                          key={p}
                          onClick={() => fetchSystemLogs(p)}
                          className={`px-3 py-1.5 text-sm border rounded-lg ${p === systemLogsPage ? 'bg-emerald-600 text-white' : 'border-gray-200'}`}
                        >{p}</button>
                      ))
                    }

                    {systemLogsPage < totalPages - 2 && <span className="px-2 text-gray-400">...</span>}
                    <button
                      onClick={() => fetchSystemLogs(totalPages)}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${systemLogsPage === totalPages ? 'bg-emerald-600 text-white' : 'border-gray-200'}`}
                    >{totalPages}</button>
                  </>
                )}

                <button
                  onClick={() => fetchSystemLogs(Math.min(totalPages, systemLogsPage + 1))}
                  disabled={systemLogsPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const fetchPendingBookings = async () => {
    try {
      console.log('Fetching all pending student bookings...');
      const { data, error } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules (
            id, date, description, location, shift_start, shift_end, status, max_students
          ),
          profiles:student_id (
            id, first_name, last_name, middle_initial, email, student_number, year_level, phone_number, created_at
          )
        `)
        .eq('status', 'booked')
        .order('booking_time', { ascending: false });

      if (error) {
        console.error('Error fetching pending bookings:', error);
        return;
      }

      console.log('Pending bookings fetched:', data?.length || 0);
      setPendingBookings(data || []);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  };

  const groupBookingsBySchedule = (bookings) => {
    const groups = {};
    bookings.forEach(booking => {
      const key = `${booking.schedule_id}`;
      if (!groups[key]) {
        groups[key] = {
          id: booking.schedule_id, // For compatibility with existing render
          schedule_students: [],   // For compatibility with existing render
          ...booking.schedules     // Spread schedule info
        };
      }
      groups[key].schedule_students.push(booking);
    });
    return Object.values(groups);
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const { count } = await supabase
        .from('pending_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingSignupsCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      if (isAdmin) {
        const { data: totalStudents } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'student');

        const { data: bookedStudents } = await supabase
          .from('schedule_students')
          .select('id', { count: 'exact' })
          .eq('status', 'booked');

        const { data: todayDuties } = await supabase
          .from('schedule_students')
          .select(`
            id,
            schedules!inner(date)
          `)
          .eq('schedules.date', new Date().toISOString().split('T')[0])
          .eq('status', 'booked');

        setDashboardStats({
          totalStudents: totalStudents?.length || 0,
          pendingApprovals: bookedStudents?.length || 0,
          todayDuties: todayDuties?.length || 0,
          systemHealth: 'Excellent'
        });
      } else if (user.role === 'student') {
        const { data: myDuties } = await supabase
          .from('schedule_students')
          .select(`
            id, 
            status,
            schedules!inner(date)
          `)
          .eq('student_id', user.id)
          .neq('status', 'cancelled');

        const today = new Date().toISOString().split('T')[0];

        // Denominator: Completed duties or duties that were supposed to happen (past dates)
        const eligibleDuties = myDuties?.filter(d =>
          d.status === 'completed' || d.schedules.date <= today
        ) || [];

        const completedDuties = eligibleDuties.filter(d => d.status === 'completed');

        const upcomingDuties = myDuties?.filter(d =>
          d.status === 'booked' && d.schedules.date > today
        ) || [];

        const total = eligibleDuties.length;
        const completed = completedDuties.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setDashboardStats({
          totalDuties: myDuties?.length || 0,
          upcomingDuties: upcomingDuties.length,
          completionRate: rate
        });
      } else if (user.role === 'parent') {
        const targetId = selectedChildId || linkedChildren[0]?.student_id;
        if (!targetId) return;

        const { data: cDuties } = await supabase
          .from('schedule_students')
          .select('id, status')
          .eq('student_id', targetId)
          .neq('status', 'cancelled');
        
        setDashboardStats({
          childDutiesCount: cDuties?.length || 0,
          pendingApprovals: cDuties?.filter(d => d.status === 'booked').length || 0
        });

        // Fetch child's name
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, middle_initial')
          .eq('id', targetId)
          .single();
        
        if (studentProfile) {
          const name = studentProfile.first_name + ' ' + (studentProfile.middle_initial ? studentProfile.middle_initial + ' ' : '') + studentProfile.last_name;
          setChildName(name);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };


  const fetchStudentDuties = async () => {
    try {
      const data = await dbHelpers.getStudentDuties(user.id);
      setStudentDuties(data || []);
    } catch (error) {
      console.error('Error fetching student duties:', error);
    }
  };

  const fetchLinkedChildren = async () => {
    try {
      const { data, error } = await dbHelpers.getLinkedChildren();
      if (error) throw error;
      setLinkedChildren(data || []);
      if (data && data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].student_id);
      }
    } catch (error) {
      console.error('Error fetching linked children:', error);
    }
  };

  useEffect(() => {
    if (user?.role === 'parent' && selectedChildId) {
      fetchChildDuties();
      fetchDashboardStats();
    }
  }, [selectedChildId, user?.role]);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!linkStudentNumber.trim()) return;
    
    setIsRequestingLink(true);
    try {
      const response = await dbHelpers.requestParentStudentLink(linkStudentNumber);
      if (response.success) {
        success('Link request sent! Waiting for admin approval.');
        setLinkStudentNumber('');
      } else {
        error(response.error || 'Failed to send request');
      }
    } catch (err) {
      error(err.message);
    } finally {
      setIsRequestingLink(false);
    }
  };

  const fetchChildDuties = async () => {
    try {
      const targetId = selectedChildId || linkedChildren[0]?.student_id;
      if (!targetId) return;

      console.log('Fetching child duties for student:', targetId);
      const data = await dbHelpers.getChildDuties(targetId);
      console.log('Child duties fetched:', data);
      setChildDuties(data || []);
    } catch (error) {
      console.error('Error fetching child duties:', error);
    }
  };

  const handleSignOut = () => {
    setShowLogoutModal(true);
    setShowUserMenu(false);
  };

  const confirmSignOut = async () => {
    setShowLogoutModal(false);
    try {
      await supabase.from('duty_logs').insert({
        action: 'logout',
        performed_by: user.id,
        notes: `User ${user.first_name} ${user.last_name} logged out`
      });
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark all notifications as read in Supabase for this specific user
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Efficiently update local state to reflect all are now read
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      // Clear the unread count badge
      setUnreadCount(0);
      
      // If we need to navigate or perform an action for the specific clicked notification,
      // that logic can still proceed here if necessary in the future.
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const canCancelDuty = (dutyDate) => {
    const today = new Date();
    const duty = new Date(dutyDate);
    // Students cannot cancel on the actual day of their duty
    return duty.toDateString() !== today.toDateString();
  };

  const checkSameDayCancellation = (scheduleDate) => {
    const today = new Date().toDateString();
    const cancelKey = `${user.id}-${scheduleDate}-${today}`;
    return dailyCancellations.has(cancelKey);
  };

  // FIXED: Enhanced handleBookDuty with better notifications for admins
  const handleBookDuty = async (scheduleId, date, location) => {
    setBookingToConfirm({ scheduleId, date, location });
  };

  const confirmBookDuty = async () => {
    const { scheduleId, date } = bookingToConfirm;
    setBookingToConfirm(null);

    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        error('Schedule not found.');
        return;
      }

      const activeBookings = schedule.schedule_students?.filter(ss => ss.status !== 'cancelled') || [];
      const currentBookings = activeBookings.length;
      const maxStudents = schedule.max_students || 2;

      if (currentBookings >= maxStudents) {
        error(`This duty is already full (${currentBookings}/${maxStudents} students assigned).`);
        return;
      }

      const existingBooking = activeBookings.find(ss => ss.student_id === user.id);
      if (existingBooking) {
        warning('You have already booked this duty.');
        return;
      }

      console.log('Checking for existing bookings on this date...');
      const { data: existingDateBooking, error: dateBookingError } = await supabase
        .from('schedule_students')
        .select(`
          id,
          schedules!inner(date)
        `)
        .eq('student_id', user.id)
        .neq('status', 'cancelled')
        .eq('schedules.date', date)
        .maybeSingle();

      if (dateBookingError && dateBookingError.code !== 'PGRST116') {
        console.error('Error checking existing date booking:', dateBookingError);
        error('Error checking existing bookings for this date. Please try again.');
        return;
      }

      if (existingDateBooking) {
        warning('You already have a duty scheduled for this date. Students can only have one duty per day.');
        return;
      }

      console.log('Checking for existing bookings in database...');
      const { data: existingDbBooking, error: checkError } = await supabase
        .from('schedule_students')
        .select('id, status')
        .eq('schedule_id', scheduleId)
        .eq('student_id', user.id)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing booking:', checkError);
        error('Error checking existing booking. Please try again.');
        return;
      }

      if (existingDbBooking) {
        warning('You have already booked this duty (verified from database).');
        await fetchSchedules();
        return;
      }

      if (checkSameDayCancellation(date)) {
        warning('You cannot book again today because you already cancelled a booking for this date today. Please try again tomorrow.');
        return;
      }

      console.log('Proceeding with booking...');

      const { data: newBooking, error: bookingError } = await supabase
        .from('schedule_students')
        .insert([{
          schedule_id: scheduleId,
          student_id: user.id,
          booking_time: new Date().toISOString(),
          status: 'booked'
        }])
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505') {
          warning('You have already booked this duty. The page will refresh to show current status.');
          await fetchSchedules();
          return;
        }
        throw bookingError;
      }

      // Log the booking action
      await supabase.from('duty_logs').insert({
        schedule_student_id: newBooking.id,
        schedule_id: scheduleId,
        action: 'booked',
        performed_by: user.id,
        target_user: user.id,
        notes: `Student booked duty for ${date}`
      });

      // FIXED: Send notifications to ALL admins
      console.log('Sending notifications to admins...');
      try {
        const { data: admins, error: adminError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('role', ['admin', 'co-admin']);

        const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (adminError) {
          console.error('Error fetching admins:', adminError);
        } else if (admins && admins.length > 0) {
          console.log(`Found ${admins.length} admin(s), creating notifications...`);

          const adminNotifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'New Duty Booking',
            message: `${user.first_name} ${user.last_name} has booked duty for ${dateStr} at ${schedule.location}`,
            type: 'info',
            read: false
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(adminNotifications);

          if (notifError) {
            console.error('Error creating admin notifications:', notifError);
          } else {
            console.log(`Successfully created ${adminNotifications.length} admin notification(s)`);
          }
        }

        // FIXED: Send notifications to linked PARENTS
        console.log('Sending notifications to parents...');
        const { data: parents, error: parentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'parent')
          .eq('student_id', user.id);

        if (parentError) {
          console.error('Error fetching parents:', parentError);
        } else if (parents && parents.length > 0) {
          console.log(`Found ${parents.length} parent(s), creating notifications...`);

          const parentNotifications = parents.map(parent => ({
            user_id: parent.id,
            title: 'Child Duty Booked',
            message: `Your child ${user.first_name} ${user.last_name} has booked duty for ${dateStr} at ${schedule.location}`,
            type: 'info',
            read: false
          }));

          const { error: pNotifError } = await supabase
            .from('notifications')
            .insert(parentNotifications);

          if (pNotifError) {
            console.error('Error creating parent notifications:', pNotifError);
          } else {
            console.log(`Successfully created ${parentNotifications.length} parent notification(s)`);
          }
        }
      } catch (notifErr) {
        console.error('Error in notification process:', notifErr);
      }

      // Refresh all related data
      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);

      success('Duty booked successfully! Waiting for admin approval.');
    } catch (err) {
      console.error('Error booking duty:', err);
      error('Error booking duty: ' + err.message);
    }
  };

  // Approve entire schedule - currently unused but kept for future use
  // eslint-disable-next-line no-unused-vars
  const handleApproveSchedule = async (scheduleId) => {
    try {
      console.log('Approving schedule:', scheduleId);

      console.log('Updating schedule status to approved...');
      const { data, error: scheduleError } = await supabase
        .from('schedules')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .select('date')
        .single();

      if (scheduleError) {
        console.error('Error updating schedule:', scheduleError);
        throw scheduleError;
      }

      console.log('Schedule status updated successfully');

      const { data: bookings, error: bookingsError } = await supabase
        .from('schedule_students')
        .select('student_id, profiles:student_id(*)')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');

      if (bookingsError) {
        console.error('Error fetching bookings for notifications:', bookingsError);
        throw bookingsError;
      }

      console.log('Found bookings:', bookings);

      if (bookings && bookings.length > 0) {
        const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const notifications = bookings.map(booking => ({
          user_id: booking.student_id,
          title: 'Duty Schedule Approved ✓',
          message: `Your duty booking for ${dateStr} has been approved! You can now complete your duty on its scheduled date.`,
          type: 'success'
        }));

        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.warn('Failed to send notifications:', notifError);
          } else {
            console.log(`Sent notifications to ${notifications.length} student(s)`);
          }
        } catch (err) {
          console.warn('Notification error (non-critical):', err);
        }

        try {
          await supabase.from('duty_logs').insert({
            schedule_id: scheduleId,
            action: 'approved_schedule',
            performed_by: user.id,
            notes: `Admin approved schedule for ${bookings.length} student(s)`
          });
          console.log('Approval logged');
        } catch (logError) {
          console.warn('Logging error (non-critical):', logError);
        }
      }

      console.log('Refreshing all data...');
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats()
      ]);

      console.log('Data refreshed successfully');

      success(`Schedule approved successfully for all ${bookings?.length || 0} student(s)!`);

    } catch (err) {
      console.error('Error approving schedule:', err);
      error('Error approving schedule: ' + err.message);
    }
  };

  // FIXED: Approve individual student booking
  const handleApproveStudent = (scheduleId, scheduleStudentId, studentName) => {
    setApproveToConfirm({ scheduleId, scheduleStudentId, studentName });
  };

  const confirmApproveStudent = async () => {
    const { scheduleId, scheduleStudentId, studentName } = approveToConfirm;
    setApproveToConfirm(null);

    try {
      console.log('🔵 Starting individual student approval...');
      console.log('Schedule ID:', scheduleId);
      console.log('Student Booking ID:', scheduleStudentId);

      const { data: booking, error: fetchError } = await supabase
        .from('schedule_students')
        .select('student_id, schedules(date)')
        .eq('id', scheduleStudentId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching booking:', fetchError);
        throw fetchError;
      }

      console.log('✅ Student booking found:', booking);

      const { data: currentSchedule, error: checkError } = await supabase
        .from('schedules')
        .select('status')
        .eq('id', scheduleId)
        .single();

      if (checkError) {
        console.error('❌ Error checking current schedule status:', checkError);
        throw checkError;
      }

      console.log('Current schedule status:', currentSchedule?.status);

      console.log('🔵 Approving only this specific student booking...');

      const { error: bookingError } = await supabase
        .from('schedule_students')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', scheduleStudentId);

      if (bookingError) {
        console.error('❌ Error updating student booking:', bookingError);
        throw bookingError;
      }

      console.log('✅ Student booking approved successfully');

      console.log('🔵 Sending notification to student...');
      try {
        const dateStr = new Date(booking.schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.student_id,
            title: 'Duty Booking Approved ✓',
            message: `Your duty booking for ${dateStr} has been approved! You can now complete your duty on its scheduled date.`,
            type: 'success'
          });

        if (notifError) {
          console.warn('⚠️ Failed to send notification:', notifError);
        } else {
          console.log('✅ Notification sent to student');
        }

        // Notify Parent (SMS & Email)
        console.log('🔵 Sending external notifications to parent...');
        const { data: parents } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, phone_number, email')
          .eq('role', 'parent')
          .eq('student_id', booking.student_id);

        if (parents && parents.length > 0) {
          parents.forEach(parent => {
            const msg = `Admin has approved ${studentName}'s scheduled duty for ${dateStr}.`;
            if (parent.phone_number) {
              sendSmsNotification(parent.phone_number, msg);
            }
            if (parent.email) {
              sendEmailNotification(parent.email, 'Child Duty Approved', msg);
            }
          });
        }
      } catch (err) {
        console.warn('⚠️ Notification error (non-critical):', err);
      }

      console.log('🔵 Logging approval action...');
      try {
        await supabase.from('duty_logs').insert({
          schedule_student_id: scheduleStudentId,
          schedule_id: scheduleId,
          action: 'approved_individual',
          performed_by: user.id,
          target_user: booking.student_id,
          notes: `Admin approved individual student booking for ${studentName}`
        });
        console.log('✅ Approval logged');
      } catch (logError) {
        console.warn('⚠️ Logging error (non-critical):', logError);
      }

      console.log('🔵 Checking if all students are approved...');
      const { data: allBookings, error: allBookingsError } = await supabase
        .from('schedule_students')
        .select('id, status')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');

      if (allBookingsError) {
        console.warn('⚠️ Error checking remaining bookings:', allBookingsError);
      } else if (!allBookings || allBookings.length === 0) {
        console.log('🔵 All students approved, updating schedule status...');
        const { error: scheduleError } = await supabase
          .from('schedules')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', scheduleId);

        if (scheduleError) {
          console.warn('⚠️ Error updating schedule status:', scheduleError);
        } else {
          console.log('✅ Schedule status updated to approved');
        }
      }

      console.log('🔵 Refreshing all data from database...');
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats(),
        fetchSystemLogs() // Refresh system logs after approval
      ]);

      console.log('✅ Data refreshed successfully');

      success(`✅ Duty approved for ${studentName}!\n\n📝 Individual booking approved.`);

    } catch (err) {
      console.error('❌ FULL ERROR:', err);
      error('❌ Error approving student: ' + err.message);
    }
  };

  // FIXED: Approve all students for a schedule
  const handleApproveAllStudents = (scheduleId) => {
    const schedule = pendingBookings.find(s => s.id === scheduleId);
    if (!schedule) {
      error('Schedule not found');
      return;
    }
    const studentCount = schedule.schedule_students?.length || 0;
    setApproveAllToConfirm({ scheduleId, studentCount, date: schedule.date });
  };

  const confirmApproveAllStudents = async () => {
    const { scheduleId, date: scheduleDate } = approveAllToConfirm;
    setApproveAllToConfirm(null);

    try {
      console.log('Approving all students for schedule:', scheduleId);

      console.log('Updating schedule status to approved...');
      const { error: scheduleError } = await supabase
        .from('schedules')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (scheduleError) {
        console.error('Error updating schedule:', scheduleError);
        throw scheduleError;
      }

      console.log('Schedule status updated successfully');

      const { data: bookings, error: bookingsError } = await supabase
        .from('schedule_students')
        .select('student_id, profiles:student_id(*)')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');

      if (bookingsError) {
        console.error('Error fetching bookings for notifications:', bookingsError);
        throw bookingsError;
      }

      console.log('Found bookings:', bookings);

      if (bookings && bookings.length > 0) {
        const dateStr = new Date(scheduleDate + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const notifications = bookings.map(booking => ({
          user_id: booking.student_id,
          title: 'Duty Schedule Approved ✓',
          message: `Your duty booking for ${dateStr} has been approved! You can now complete your duty on its scheduled date.`,
          type: 'success'
        }));

        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.warn('Failed to send notifications:', notifError);
          } else {
            console.log(`Sent notifications to ${notifications.length} student(s)`);
          }

          // Notify Parents
          const studentIds = bookings.map(b => b.student_id);
          const { data: parents } = await supabase
            .from('profiles')
            .select('id, student_id, phone_number, email')
            .eq('role', 'parent')
            .in('student_id', studentIds);

          if (parents && parents.length > 0) {
            parents.forEach(parent => {
              const relatedBooking = bookings.find(b => b.student_id === parent.student_id);
              const childName = relatedBooking?.profiles
                ? (relatedBooking.profiles.first_name ? `${relatedBooking.profiles.first_name} ${relatedBooking.profiles.last_name}` : relatedBooking.profiles.full_name)
                : 'Your child';
              const msg = `Admin has approved ${childName}'s scheduled duty for ${dateStr}.`;

              if (parent.phone_number) {
                sendSmsNotification(parent.phone_number, msg);
              }
              if (parent.email) {
                sendEmailNotification(parent.email, 'Child Duty Approved', msg);
              }
            });
          }
        } catch (err) {
          console.warn('Notification error (non-critical):', err);
        }

        try {
          await supabase.from('duty_logs').insert({
            schedule_id: scheduleId,
            action: 'approved_all',
            performed_by: user.id,
            notes: `Admin approved schedule for ${bookings.length} student(s)`
          });
          console.log('Approval logged');
        } catch (logError) {
          console.warn('Logging error (non-critical):', logError);
        }
      }

      console.log('Refreshing all data...');
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats(),
        fetchSystemLogs() // Refresh system logs after approval
      ]);

      console.log('Data refreshed successfully');

      success(`Schedule approved successfully for all ${bookings?.length || 0} student(s)!`);

    } catch (err) {
      console.error('Error approving schedule:', err);
      error('Error approving schedule: ' + err.message);
    }
  };

  // FIXED: Reject individual student booking
  const handleRejectStudent = async (scheduleId, scheduleStudentId, studentName) => {
    setStudentToReject({ scheduleId, scheduleStudentId, studentName });
    setShowRejectConfirm(true);
  };

  const confirmRejectStudent = async () => {
    if (!studentToReject) return;

    try {
      console.log('Rejecting individual student booking:', studentToReject.scheduleStudentId);

      const { data: booking, error: fetchError } = await supabase
        .from('schedule_students')
        .select('student_id')
        .eq('id', studentToReject.scheduleStudentId)
        .single();

      if (fetchError) throw fetchError;

      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: rejectReason.trim() || 'Rejected by admin'
        })
        .eq('id', studentToReject.scheduleStudentId);

      if (cancelError) throw cancelError;

      try {
        await supabase.from('notifications').insert({
          user_id: booking.student_id,
          title: 'Duty Booking Rejected',
          message: `Your duty booking has been rejected by the administrator. Reason: ${rejectReason.trim() || 'Please contact admin for more details.'}`,
          type: 'error'
        });
      } catch (err) {
        console.warn('Failed to send notification:', err);
      }

      await supabase.from('duty_logs').insert({
        schedule_student_id: studentToReject.scheduleStudentId,
        schedule_id: studentToReject.scheduleId,
        action: 'rejected',
        performed_by: user.id,
        target_user: booking.student_id,
        notes: `Admin rejected individual student booking for ${studentToReject.studentName}. Reason: ${rejectReason.trim()}`
      });

      const { data: remainingBookings, error: checkError } = await supabase
        .from('schedule_students')
        .select('id')
        .eq('schedule_id', studentToReject.scheduleId)
        .eq('status', 'booked');

      if (checkError) throw checkError;

      if (!remainingBookings || remainingBookings.length === 0) {
        await supabase
          .from('schedules')
          .update({ status: 'pending' })
          .eq('id', studentToReject.scheduleId);
      }

      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats(),
        fetchSystemLogs() // Refresh system logs after rejection
      ]);

      setShowRejectConfirm(false);
      setStudentToReject(null);
      setRejectReason('');
      alert(`Booking rejected for ${studentToReject.studentName}.`);
    } catch (err) {
      console.error('Error rejecting student:', err);
      error('Error rejecting student: ' + err.message);
    }
  };

  // Reject all students for a schedule
  const handleRejectAllStudents = async (scheduleId) => {
    setScheduleToReject(scheduleId);
    setStudentToReject(null);
    setShowRejectConfirm(true);
  };

  const confirmRejectAllStudents = async () => {
    if (!scheduleToReject) return;

    try {
      console.log('Rejecting all students for schedule:', scheduleToReject);

      const { data: bookings } = await supabase
        .from('schedule_students')
        .select('student_id, profiles:student_id(*)')
        .eq('schedule_id', scheduleToReject)
        .eq('status', 'booked');

      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: rejectReason.trim() || 'Schedule rejected by admin'
        })
        .eq('schedule_id', scheduleToReject)
        .eq('status', 'booked');

      if (cancelError) throw cancelError;

      const { error: scheduleError } = await supabase
        .from('schedules')
        .update({ status: 'cancelled' })
        .eq('id', scheduleToReject);

      if (scheduleError) throw scheduleError;

      if (bookings && bookings.length > 0) {
        const notifications = bookings.map(booking => ({
          user_id: booking.student_id,
          title: 'Duty Schedule Rejected',
          message: `The duty schedule has been rejected by the administrator. Reason: ${rejectReason.trim() || 'Your booking has been cancelled.'}`,
          type: 'error'
        }));

        try {
          await supabase.from('notifications').insert(notifications);
        } catch (err) {
          console.warn('Failed to send notifications:', err);
        }
      }

      await supabase.from('duty_logs').insert({
        schedule_id: scheduleToReject,
        action: 'rejected_all',
        performed_by: user.id,
        notes: `Admin rejected schedule and cancelled ${bookings?.length || 0} student booking(s). Reason: ${rejectReason.trim()}`
      });

      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats(),
        fetchSystemLogs() // Refresh system logs after rejection
      ]);

      setShowRejectConfirm(false);
      setScheduleToReject(null);
      setRejectReason('');
      alert(`Schedule rejected and all ${bookings?.length || 0} booking(s) cancelled.`);
    } catch (err) {
      console.error('Error rejecting schedule:', err);
      error('Error rejecting schedule: ' + err.message);
    }
  };

  // Reject schedule functions - currently unused but kept for future use
  // eslint-disable-next-line no-unused-vars
  const handleRejectSchedule = async (scheduleId) => {
    setScheduleToReject(scheduleId);
    setShowRejectConfirm(true);
  };

  // eslint-disable-next-line no-unused-vars
  const confirmRejectSchedule = async () => {
    if (!scheduleToReject) return;

    try {
      console.log('Rejecting schedule:', scheduleToReject);

      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: rejectReason.trim() || 'Schedule rejected by admin'
        })
        .eq('schedule_id', scheduleToReject);

      if (cancelError) throw cancelError;

      await dbHelpers.updateScheduleStatus(scheduleToReject, 'cancelled', user.id);

      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats(),
        fetchSystemLogs()
      ]);

      setShowRejectConfirm(false);
      setScheduleToReject(null);
      setRejectReason('');
      alert('Schedule rejected and all bookings cancelled.');
    } catch (error) {
      console.error('Error rejecting schedule:', error);
      alert('Error rejecting schedule: ' + error.message);
    }
  };

  const handleCancelDuty = async (scheduleStudentId, date) => {
    if (!canCancelDuty(date)) {
      alert('Cannot cancel duty on the actual day of your scheduled duty.');
      return;
    }

    try {
      await dbHelpers.cancelDuty(scheduleStudentId, user.id, user.role);

      const today = new Date().toDateString();
      const cancelKey = `${user.id}-${date}-${today}`;
      setDailyCancellations(prev => new Set(prev).add(cancelKey));

      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      alert('Duty cancelled successfully. Note: You cannot book another duty for this date today.');
    } catch (err) {
      error('Error cancelling duty: ' + err.message);
    }
  };

  const handleDeleteDuty = async (scheduleStudentId) => {
    if (!window.confirm('Are you sure you want to delete this duty entry? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_students')
        .delete()
        .eq('id', scheduleStudentId)
        .eq('student_id', user.id);

      if (error) throw error;

      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      success('Duty entry deleted successfully.');
    } catch (error) {
      console.error('Error deleting duty:', error);
      alert('Error deleting duty: ' + error.message);
    }
  };

  const handleCompleteDuty = async (scheduleStudentId) => {
    if (!window.confirm('Mark this duty as completed? This will generate a completion certificate.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_students')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleStudentId)
        .eq('student_id', user.id);

      if (error) throw error;

      // FIXED: Notify linked PARENTS about completion
      try {
        const { data: bookingDetails } = await supabase
          .from('schedule_students')
          .select(`
            schedules (date, location)
          `)
          .eq('id', scheduleStudentId)
          .single();

        if (bookingDetails?.schedules) {
          const { data: parentLinks } = await supabase
            .from('parent_student_links')
            .select('parent_id, profiles!parent_id(id, phone_number, email)')
            .eq('student_id', user.id)
            .eq('status', 'approved');

          const parents = parentLinks?.map(link => link.profiles) || [];

          if (parents && parents.length > 0) {
            const dateStr = new Date(bookingDetails.schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const parentNotifications = [];
            parents.forEach(parent => {
              const msg = `Hello, your child Name: ${user.first_name} ${user.last_name} has marked their duty on Date: ${dateStr} and Time: 8:00 AM - 5:00 PM at ${bookingDetails.schedules.location} as COMPLETED.`;
              parentNotifications.push({
                user_id: parent.id,
                title: 'Child Duty Completed ✓',
                message: msg,
                type: 'success',
                read: false
              });

              // Trigger external notifications
              if (parent.phone_number) {
                sendSmsNotification(parent.phone_number, msg);
              }
              if (parent.email) {
                sendEmailNotification(parent.email, 'Child Duty Completed ✓', msg);
              }
            });

            if (parentNotifications.length > 0) {
              await supabase.from('notifications').insert(parentNotifications);
              console.log(`Sent completion notifications to ${parentNotifications.length} parent(s)`);
            }
          }
        }
      } catch (notifErr) {
        console.warn('Failed to send completion notifications:', notifErr);
      }

      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings(),
        fetchDashboardStats()
      ]);
      success('Duty marked as completed! You can now print your completion certificate.');
    } catch (error) {
      console.error('Error completing duty:', error);
      alert('Error completing duty: ' + error.message);
    }
  };



  // Calendar generation function with proper date handling and user-specific filtering
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDateLoop = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        let daySchedule = schedules.find(s => {
          const matchesDate = new Date(s.date).toDateString() === currentDateLoop.toDateString();
          const matchesHospital = user?.role === 'student' && selectedHospital !== 'all'
            ? s.location === selectedHospital
            : true;
          return matchesDate && matchesHospital;
        });

        const dayDate = new Date(currentDateLoop);
        dayDate.setHours(0, 0, 0, 0);

        weekDays.push({
          date: new Date(currentDateLoop),
          schedule: daySchedule,
          isCurrentMonth: currentDateLoop.getMonth() === month,
          isToday: currentDateLoop.toDateString() === today.toDateString(),
          isPast: dayDate < today
        });

        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    return calendar;
  };

  // Define menu items based on user role
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    ...(isAdmin ? [] : [
      { id: 'schedule', label: 'Schedule Calendar', icon: Calendar }
    ]),
    ...(user?.role === 'student' ? [
      { id: 'duties', label: 'My Duties', icon: Clock }
    ] : []),
    ...(isAdmin ? [
      { id: 'schedule-management', label: 'Manage Schedules', icon: CalendarIcon },
      { id: 'student-management', label: 'Students', icon: Users },
      { id: 'user-management', label: 'User Management', icon: Shield },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'logs', label: 'System Logs', icon: Activity }
    ] : []),

    ...(user?.role === 'parent' ? [
      { id: 'child-duties', label: "Children's Duties", icon: Eye }
    ] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile Settings', icon: Settings },
    { id: 'signout', label: 'Sign Out', icon: LogOut },
  ];

  // Dashboard Overview Component

  const renderDashboardView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name} {user?.last_name}
          </h2>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAdmin ? (
          <>
            <button onClick={() => setActiveTab('student-management')} className="card bg-gradient-to-r from-slate-700 to-slate-800 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-slate-200 text-xs font-medium uppercase tracking-wide">Total Students</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.totalStudents}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Users className="w-8 h-8 text-slate-200 opacity-80" />
                </div>
              </div>
            </button>
            <button onClick={() => setActiveTab('pending')} className="card bg-gradient-to-r from-emerald-600 to-emerald-700 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-2xl font-bold mt-1">
                    {pendingBookings.length}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Clock className="w-8 h-8 text-emerald-200 opacity-80" />
                </div>
              </div>
            </button>
            <button onClick={() => setActiveTab('schedule')} className="card bg-gradient-to-r from-green-600 to-green-700 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-green-200 text-xs font-medium uppercase tracking-wide">Today's Duties</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.todayDuties}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <CalendarIcon className="w-8 h-8 text-green-200 opacity-80" />
                </div>
              </div>
            </button>
          </>
        ) : user?.role === 'student' ? (
          <>
            <button onClick={() => setActiveTab('duties')} className="card bg-gradient-to-r from-slate-600 to-slate-700 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-slate-200 text-xs font-medium uppercase tracking-wide">Total Duties</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.totalDuties}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Clock className="w-8 h-8 text-slate-200 opacity-80" />
                </div>
              </div>
            </button>
            <button onClick={() => setActiveTab('schedule')} className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide">Upcoming</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.upcomingDuties}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Calendar className="w-8 h-8 text-emerald-200 opacity-80" />
                </div>
              </div>
            </button>
            <button onClick={() => setActiveTab('duties')} className="card bg-gradient-to-r from-green-600 to-green-700 text-white h-24 w-full text-left hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex-1">
                  <p className="text-green-200 text-xs font-medium uppercase tracking-wide">Completion Rate</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.completionRate}%</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Star className="w-8 h-8 text-green-200 opacity-80" />
                </div>
              </div>
            </button>
          </>
        ) : null}
      </div>

      {/* Location Distribution Card */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Location Distribution</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">All Schedules</span>
          </div>
          <div className="space-y-3">
            {Object.entries(chartData.locationDistribution).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No schedule data yet</p>
            ) : (
              Object.entries(chartData.locationDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([location, count]) => {
                  const total = Object.values(chartData.locationDistribution).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={location}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{location}</span>
                        <span className="text-sm font-bold text-gray-900">{count} <span className="text-xs text-gray-400 font-normal">students ({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-green-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
            <button
              onClick={() => setActiveTab('notifications')}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <button key={notification.id} onClick={() => setActiveTab('notifications')} className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer text-left transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'warning' ? 'bg-yellow-500' :
                    notification.type === 'error' ? 'bg-red-500' :
                      'bg-blue-500'
                  }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                )}
              </button>
            ))}

            {notifications.length === 0 && (
              <p className="text-gray-500 text-center py-4">No notifications yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Duties */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Duties</h3>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              View Calendar
            </button>
          </div>
          <div className="space-y-3">
            {(() => {
              const upcoming = schedules
                .filter(s => {
                  if (new Date(s.date) < new Date()) return false;
                  // If not admin, check if the duty belongs to the student (or child if parent)
                  const targetId = user.role === 'parent' ? selectedChildId : user.id;
                  if (!isAdmin && !s.schedule_students?.some(ss => ss.student_id === targetId)) return false;
                  
                  if (isAdmin) {
                    const activeCount = s.schedule_students?.filter(ss => ss.status !== 'cancelled').length || 0;
                    if (activeCount === 0 && s.status === 'pending') return false;
                  }
                  return true;
                })
                .slice(0, 5);
              if (upcoming.length === 0) {
                return <p className="text-gray-400 text-sm text-center py-4">No upcoming duties scheduled</p>;
              }
              return upcoming.map((schedule) => {
                const activeStudents = schedule.schedule_students?.filter(ss => ss.status !== 'cancelled').length || 0;
                const maxStudents = schedule.max_students || 2;
                return (
                  <button key={schedule.id} onClick={() => setActiveTab('schedule')} className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors text-left">
                    <div>
                      <p className="font-medium text-gray-900">{new Date(schedule.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">{activeStudents}/{maxStudents} students • {schedule.location}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${schedule.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{schedule.status}</span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  // Pending Approvals View
  const renderPendingApprovalsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Pending Schedule Approvals</h3>
          <p className="text-gray-600">Review and approve duty schedules - You can approve students individually or all at once</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingBookings.length} pending booking{pendingBookings.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pendingBookings.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending student bookings at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupBookingsBySchedule(pendingBookings).map((schedule) => {
            const students = schedule.schedule_students || [];
            return (
              <div key={schedule.id} className="card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">
                          {new Date(schedule.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {schedule.shift_start} - {schedule.shift_end} • {schedule.location}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-600 mb-1">Schedule Details:</p>
                      <p className="text-sm font-medium text-gray-900">{schedule.description}</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Users className="w-4 h-4 text-blue-600" />
                        <p className="font-medium text-blue-900">
                          Students Assigned ({students.length}/{schedule.max_students || 2})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {students.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-emerald-700 text-xs font-medium">
                                  {(student.profiles?.first_name?.[0] || '') + (student.profiles?.last_name?.[0] || '')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {student.profiles?.first_name} {student.profiles?.last_name}
                                </p>
                                <p className="text-xs text-gray-600">{student.profiles?.student_number} • {student.profiles?.year_level}</p>
                              </div>
                              <div className="text-xs text-gray-500 hidden sm:block">
                                Booked: {new Date(student.booking_time).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Individual student action buttons */}
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleApproveStudent(schedule.id, student.id, `${student.profiles?.first_name} ${student.profiles?.last_name}`)}
                                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors text-xs"
                                title="Approve this student"
                              >
                                <Check className="w-3 h-3" />
                                <span className="hidden sm:inline">Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectStudent(schedule.id, student.id, `${student.profiles?.first_name} ${student.profiles?.last_name}`)}
                                className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors text-xs"
                                title="Reject this student"
                              >
                                <X className="w-3 h-3" />
                                <span className="hidden sm:inline">Reject</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        💡 Tip: You can approve or reject students individually, or use the buttons on the right to approve/reject all students at once.
                      </p>
                    </div>
                  </div>

                  {/* Bulk action buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApproveAllStudents(schedule.id)}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve All</span>
                    </button>
                    <button
                      onClick={() => handleRejectAllStudents(schedule.id)}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject All</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Helper to check if a duty shift has ended
  const isDutyOver = (schedule) => {
    if (!schedule) return false;

    try {
      const now = new Date();
      const dutyDateStr = schedule.date; // "YYYY-MM-DD"
      const shiftEnd = schedule.shift_end; // "HH:mm"
      const shiftStart = schedule.shift_start; // "HH:mm"

      // Parse duty date
      const [year, month, day] = dutyDateStr.split('-').map(Number);
      const [endHour, endMinute] = shiftEnd.split(':').map(Number);
      const [startHour, startMinute] = shiftStart.split(':').map(Number);

      // Create end time date object
      let dutyEndDate = new Date(year, month - 1, day, endHour, endMinute);

      // Handle night shifts (ending next day)
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (endMinutes < startMinutes) {
        // Shift ends on the next day
        dutyEndDate.setDate(dutyEndDate.getDate() + 1);
      }

      return now > dutyEndDate;
    } catch (err) {
      console.error('Error calculating if duty is over:', err);
      return false;
    }
  };

  // FIXED: Enhanced Calendar View Component with proper individual booking approval status
  const renderCalendarView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Duty Schedule Calendar</h2>

      </div>

      {/* Calendar Navigation */}
      <div className="card">
        {/* Hospital Filter for Students */}
        {user?.role === 'student' && (
          <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by Hospital:</label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="input-field max-w-xs"
              >
                <option value="all">All Hospitals</option>
                {hospitalLocations.map((h) => (
                  <option key={h.name} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-600">
              Choose a hospital to view only its schedules
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {user?.role === 'student' && selectedHospital !== 'all' && (
              <span className="block text-sm text-emerald-600 font-normal mt-1">
                Showing schedules for: {selectedHospital}
              </span>
            )}
          </h3>

          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto sm:overflow-hidden rounded-lg border border-gray-200">
          <div className="min-w-[720px] sm:min-w-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <div key={day} className="p-2 sm:p-4 text-center font-medium text-gray-700 text-xs sm:text-sm border-r border-gray-200 last:border-r-0">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {/* Calendar body */}
            {generateCalendar().map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-200">
                {week.map((day, dayIndex) => {
                  // FIXED: Role-based capacity calculation and booking logic with PROPER INDIVIDUAL APPROVAL STATUS
                  const allStudents = day.schedule?.schedule_students || [];
                  const activeStudents = allStudents.filter(ss => ss.status !== 'cancelled');
                  const studentCount = activeStudents.length;
                  const maxStudents = day.schedule?.max_students || 2;
                  const isFull = studentCount >= maxStudents;
                  const myBooking = allStudents.find(s => s.student_id === user.id);
                  const isBooked = myBooking && myBooking.status !== 'cancelled';
                  const isCancelled = myBooking?.status === 'cancelled';
                  // FIXED: Check individual booking status - completion implies approval
                  const isApproved = myBooking?.status === 'approved' || myBooking?.status === 'completed';
                  const isCompleted = myBooking?.status === 'completed';
                  const hasSameDayCancellation = user?.role === 'student' && checkSameDayCancellation(day.date.toISOString().split('T')[0]);
                  
                  // NEW: Restriction - Hide other available slots for the same hospital if already booked in the month
                  const hasBookingInMonthForThisHospital = user?.role === 'student' && day.schedule && (studentDuties || []).some(d => {
                    if (d.status === 'cancelled') return false;
                    const dDate = new Date(d.schedules.date);
                    return d.schedules.location === day.schedule.location &&
                           dDate.getMonth() === day.date.getMonth() &&
                           dDate.getFullYear() === day.date.getFullYear();
                  });

                  const isHidden = user?.role === 'student' && hasBookingInMonthForThisHospital && !isBooked;


                  // FIXED: Role-specific booking logic
                  const canBook = user?.role === 'student' &&
                    bookingStatus === 'open' &&
                    day.schedule &&
                    !day.isPast &&
                    !isFull &&
                    !isBooked &&
                    !hasSameDayCancellation &&
                    day.isCurrentMonth;

                  return (
                    <div
                      key={dayIndex}
                      className={`min-h-[84px] sm:min-h-[120px] p-2 sm:p-3 border-r border-gray-200 last:border-r-0 ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                        } ${day.isToday ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                          {day.date.getDate()}
                        </span>

                        {day.schedule && !isHidden && (
                          <div className="flex flex-col items-end space-y-1">
                            {/* ROLE-BASED CAPACITY DISPLAY */}
                            {isAdmin ? (
                              // Admin view: Full management info
                              <>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isFull ? 'bg-red-100 text-red-800' :
                                  studentCount > 0 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                  {studentCount}/{maxStudents}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${day.schedule.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {day.schedule.status}
                                </span>
                              </>
                            ) : user?.role === 'student' ? (
                              // Student view: Booking-focused info with FIXED individual approval status
                              <>
                                {isCancelled ? (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    REJECTED
                                  </span>
                                ) : (
                                  <>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-blue-100 text-blue-800' :
                                      isBooked ? 'bg-blue-100 text-blue-800' :
                                        isFull ? 'bg-red-100 text-red-800' :
                                          'bg-green-100 text-green-800'
                                      }`}>
                                      {isCompleted ? 'COMPLETED' : isBooked ? 'BOOKED' : isFull ? 'FULL' : `${maxStudents - studentCount} LEFT`}
                                    </span>
                                    {/* FIXED: Show individual booking approval status, hide if completed (redundant) */}
                                    {isBooked && !isCompleted && (
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {isApproved ? 'APPROVED' : 'PENDING'}
                                      </span>
                                    )}
                                  </>
                                )}
                              </>
                            ) : (
                              // Parent view: Child-focused info with individual booking status
                              <>
                                {myBooking ? (
                                  <>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      isApproved ? 'bg-green-100 text-green-800' :
                                        isCancelled ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {isApproved ? 'APPROVED' :
                                          isCancelled ? 'REJECTED' :
                                            'PENDING'}
                                    </span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                      YOUR CHILD
                                    </span>
                                  </>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    {studentCount}/{maxStudents}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {day.schedule && !isHidden && (
                        <div className="space-y-1">
                          {/* ROLE-BASED STUDENT DISPLAY */}
                          {isAdmin ? (
                            // Admin: Show all students with management options
                            activeStudents.map((assignment, idx) => (
                              <div
                                key={idx}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 flex justify-between items-center"
                              >
                                <span className="truncate">{assignment.profiles?.first_name || 'Student'}</span>
                                <span className={`w-2 h-2 rounded-full ${day.schedule.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'
                                  }`}></span>
                              </div>
                            ))
                          ) : user?.role === 'student' ? (
                            // Student: Show their own booking prominently, others less prominent
                            activeStudents
                              .filter(assignment => !(assignment.student_id === user.id && isApproved))
                              .map((assignment, idx) => (
                                <div
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded truncate ${assignment.student_id === user.id
                                    ? 'bg-blue-100 text-blue-800 font-medium border border-blue-200'
                                    : 'bg-gray-50 text-gray-600'
                                    }`}
                                >
                                  {assignment.student_id === user.id ? 'YOU' : assignment.profiles?.first_name || 'Student'}
                                </div>
                              ))
                          ) : (
                            // Parent: Only show if their child is assigned
                            activeStudents
                              .filter(assignment => assignment.student_id === selectedChildId)
                              .map((assignment, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 font-medium"
                                >
                                  YOUR CHILD
                                </div>
                              ))
                          )}

                          {/* Show time and location */}
                          <div className="text-xs text-gray-500">
                            {day.schedule.shift_start} - {day.schedule.shift_end}
                          </div>
                          {day.schedule.location && (
                            <div className="text-xs text-gray-500 truncate">
                              📍 {day.schedule.location}
                            </div>
                          )}
                          {day.schedule.description && (
                            <div className="text-xs text-gray-400 truncate">
                              {day.schedule.description}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ROLE-BASED ACTION BUTTONS */}
                      {user?.role === 'student' && !isHidden && (
                        <>
                          {bookingStatus === 'closed' && day.schedule && !day.isPast && !isBooked && day.isCurrentMonth && (
                            <div className="mt-2 text-xs text-red-600 font-medium text-center bg-red-50 border border-red-100 px-2 py-1 rounded">
                              Booking Closed
                            </div>
                          )}

                          {/* Booking button for students */}
                          {canBook && (
                            <button
                              onClick={() => {
                                const d = day.date;
                                const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                handleBookDuty(day.schedule.id, localDate, day.schedule.location);
                              }}
                              className="mt-2 w-full text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                            >
                              Book Duty
                            </button>
                          )}

                          {/* Same-day cancellation warning */}
                          {hasSameDayCancellation && day.isCurrentMonth && (
                            <div className="mt-2 text-xs text-orange-600 font-medium text-center bg-orange-50 px-2 py-1 rounded">
                              Cannot book today (cancelled earlier)
                            </div>
                          )}
                        </>
                      )}

                      {/* ROLE-BASED STATUS MESSAGES */}
                      {isFull && !isHidden && day.isCurrentMonth && day.schedule && (
                        <div className={`mt-2 text-xs font-medium text-center ${isAdmin ? 'text-red-600' :
                          user?.role === 'student' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                          {isAdmin ? `Full (${studentCount}/${maxStudents})` :
                            user?.role === 'student' ? 'Duty Full' :
                              'Full Schedule'}
                        </div>
                      )}

                      {/* FIXED: Show proper approval status and Complete button for students */}
                      {isBooked && day.schedule && user?.role === 'student' && (
                        <div className="mt-2 space-y-2">
                          <div className={`text-xs font-medium text-center ${myBooking.status === 'completed' ? 'text-blue-600' :
                            isApproved ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                            {myBooking.status === 'completed' ? 'Duty Completed ✓' :
                              isApproved ? 'Your Duty Approved ✓' : 'Awaiting Admin Approval'}
                          </div>

                          {/* Complete button inside calendar */}
                          {isApproved && myBooking.status !== 'completed' && isDutyOver(day.schedule) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteDuty(myBooking.id);
                              }}
                              className="w-full flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs py-1 rounded transition-colors shadow-sm"
                            >
                              <Award className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          )}
                        </div>
                      )}

                      {day.isPast && day.isCurrentMonth && !day.schedule && (
                        <div className="mt-2 text-xs text-gray-400 text-center">
                          {isAdmin ? 'No schedule created' :
                            user?.role === 'student' ? 'Past date' :
                              'No duty'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Role-based Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">
            {isAdmin ? 'Admin View Legend' :
              user?.role === 'student' ? 'Student View Legend' :
                'Parent View Legend'}
          </h4>

          {isAdmin ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Approved Schedule</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Pending Approval</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span>Fully Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Has Students</span>
              </div>
            </div>
          ) : user?.role === 'student' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Available to Book</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>Your Booking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span>Fully Booked</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border-l-2 border-yellow-300">
                <strong>Booking Rules:</strong> You cannot cancel on the actual day of your duty.
                If you cancel a booking today, you cannot book another duty for that same date until tomorrow.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Child Assigned</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Confirmed Duty</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Pending Confirmation</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // My Duties View Component
  const renderDutiesView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Duties</h2>
        <div className="flex space-x-2">
          <button className="btn-secondary flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {studentDuties.map((duty) => (
          <div key={duty.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <CalendarIcon className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-lg">
                    {new Date(duty.schedules.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Booked:</p>
                    <p className="font-medium">{new Date(duty.booking_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Location:</p>
                    <p className="font-medium">{duty.schedules.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Approval Status:</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${duty.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      duty.status === 'approved' ? 'bg-green-100 text-green-800' :
                        duty.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>

                      {duty.status === 'completed' ? 'Completed' :
                        duty.status === 'approved' ? 'Approved' :
                          duty.status === 'cancelled' ? (duty.cancellation_reason && duty.cancellation_reason.toLowerCase().includes('reject') ? 'Rejected' : 'Cancelled') :
                            'Pending Approval'}
                    </span>
                  </div>
                  {duty.status === 'cancelled' && duty.cancellation_reason && (
                    <div className="mt-2 text-red-600 col-span-1 md:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-wider">Reason:</p>
                      <p className="text-sm border-l-2 border-red-300 pl-2 mt-1">{duty.cancellation_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2 ml-4">
                {/* Cancel button - only for active bookings before duty day */}
                {duty.status === 'booked' && canCancelDuty(duty.schedules.date) && (
                  <button
                    onClick={() => handleCancelDuty(duty.id, duty.schedules.date)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                )}

                {!canCancelDuty(duty.schedules.date) && duty.status === 'booked' && (
                  <span className="text-xs text-red-500 px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                    Cannot cancel on duty day
                  </span>
                )}

                {/* Pending approval indicator */}
                {duty.status === 'booked' && duty.schedules.status === 'pending' && (
                  <span className="text-xs text-yellow-600 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                    ⏳ Awaiting Admin Approval
                  </span>
                )}

                {/* Complete duty button - only for approved bookings */}
                {duty.status === 'booked' && duty.schedules.status === 'approved' && (
                  <button
                    onClick={() => handleCompleteDuty(duty.id)}
                    className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 text-sm px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Mark duty as completed"
                  >
                    <Award className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                )}

                {/* View details button for completed duties */}
                {duty.status === 'completed' && (
                  <button
                    onClick={() => {
                      setSelectedDuty(duty);
                      setShowDutyDetailsModal(true);
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    title="View duty details"
                  >
                    <Info className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}

                {/* Delete button - only for pending bookings (not yet approved) */}
                {duty.status === 'booked' && duty.schedules.status === 'pending' && (
                  <button
                    onClick={() => handleDeleteDuty(duty.id)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete pending booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {studentDuties.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No duties scheduled yet</h3>
            <p className="text-gray-600 mb-4">Visit the Schedule Calendar to book your duties.</p>
            <button
              onClick={() => setActiveTab('schedule')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              View Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderDutyDetailsModal = () => {
    if (!selectedDuty) return null;
    const { schedules } = selectedDuty;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5 flex justify-between items-center text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Duty Details</h3>
                <p className="text-emerald-50 text-xs font-medium uppercase tracking-wider">Reference #{selectedDuty.id.slice(0, 8)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDutyDetailsModal(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Status & Date Row */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Duty Date</p>
                <p className="text-gray-900 font-bold text-lg">
                  {new Date(schedules.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1.5">Current Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${selectedDuty.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                  }`}>
                  {selectedDuty.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">Assigned Hospital / Location</p>
              <div className="flex items-center text-gray-900">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mr-4 border border-emerald-50">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{schedules.location || 'N/A'}</p>
                  <p className="text-xs text-gray-500">Public Health Facility</p>
                </div>
              </div>
            </div>

            {/* Shifts Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Shift Start</p>
                <div className="flex items-center text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Clock className="w-4 h-4 text-emerald-600 mr-2.5" />
                  <span className="font-bold text-sm">{schedules.shift_start}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Shift End</p>
                <div className="flex items-center text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Clock className="w-4 h-4 text-emerald-600 mr-2.5" />
                  <span className="font-bold text-sm">{schedules.shift_end}</span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            {schedules.description && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Notes & Instructions</p>
                <div className="text-sm text-gray-600 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 italic leading-relaxed">
                  "{schedules.description}"
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                <span className="flex items-center">
                  <CalendarIcon className="w-3 h-3 mr-1.5" />
                  Booked: {new Date(selectedDuty.booking_time).toLocaleString()}
                </span>
                {selectedDuty.status === 'completed' && (
                  <span className="text-emerald-600 flex items-center font-bold">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified Completion
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-8 py-5 flex justify-end">
            <button
              onClick={() => setShowDutyDetailsModal(false)}
              className="px-8 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all shadow-sm active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Notifications View Component
  const renderNotificationsView = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`card cursor-pointer transition-all hover:shadow-lg ${!notification.read ? 'border-l-4 border-l-emerald-500 bg-emerald-50/60' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 p-2 flex-shrink-0 border border-emerald-100 flex items-center justify-center">
                <img
                  src="/image0.png"
                  alt="Kumadronas logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{new Date(notification.created_at).toLocaleDateString()}</span>
                    {!notification.read && (
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mt-1 text-sm">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1.5">{new Date(notification.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">You'll receive notifications here when there are updates.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardView();
      case 'pending':
        return renderPendingApprovalsView();
      case 'schedule':
        return renderCalendarView();
      case 'duties':
        return renderDutiesView();
      case 'notifications':
        return renderNotificationsView();
      case 'student-management':
        return <StudentManagement />;
      case 'user-management':
        return <UserManagement />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'profile':
        return <ProfileSettings user={user} onProfileUpdate={onProfileUpdate} />;
      case 'schedule-management':
        return <ScheduleManagement />;
      case 'logs':
        return renderSystemLogsView();
      case 'child-duties':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Children's Duty History</h2>
                <p className="text-gray-500 mt-1">Monitoring your children's clinical assignments</p>
              </div>

              {/* Add Child Search */}
              <form onSubmit={handleRequestLink} className="flex items-center space-x-2">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={linkStudentNumber}
                    onChange={(e) => setLinkStudentNumber(e.target.value)}
                    placeholder="Enter Student No. (e.g. C-23-1234)"
                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-64"
                    disabled={isRequestingLink}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRequestingLink || !linkStudentNumber.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-50"
                  title="Request Link"
                >
                  {isRequestingLink ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Plus className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* Child Selector Tabs */}
            {linkedChildren.length > 0 && (
              <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {linkedChildren.map((link) => (
                  <button
                    key={link.student_id}
                    onClick={() => setSelectedChildId(link.student_id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                      selectedChildId === link.student_id
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-500 hover:text-emerald-500'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>{link.student?.first_name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4">
              {childDuties.map((duty) => (
                <div key={duty.id} className="card hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <CalendarIcon className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-lg text-gray-900">
                          {new Date(duty.schedules.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Booked On</p>
                          <p className="font-bold text-gray-800">{new Date(duty.booking_time).toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Hospital Location</p>
                          <p className="font-bold text-gray-800 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-emerald-500" /> {duty.schedules.location || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Duty Shift</p>
                          <p className="font-bold text-gray-800 flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-emerald-500" /> {duty.schedules.shift_start} - {duty.schedules.shift_end}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Verification</p>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            duty.status === 'completed' || duty.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            duty.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {duty.status === 'completed' ? 'Duty Completed' :
                             duty.status === 'approved' ? 'Admin Approved' :
                             duty.status === 'cancelled' ? 'Cancelled' :
                             'Pending Review'}
                          </span>
                        </div>
                      </div>

                      {duty.schedules.description && (
                        <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Special Instructions:</p>
                          <p className="text-sm text-gray-700 italic">"{duty.schedules.description}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      {duty.status !== 'cancelled' && duty.schedules.status === 'approved' && (
                        <div className="bg-emerald-600 text-white rounded-xl p-2 shadow-sm" title="Duty Active">
                           <CheckCircle className="w-5 h-5" />
                        </div>
                      )}

                      {duty.status === 'cancelled' && (
                        <div className="bg-red-500 text-white rounded-xl p-2 shadow-sm" title="Cancelled">
                           <XCircle className="w-5 h-5" />
                        </div>
                      )}

                      {duty.status === 'booked' && duty.schedules.status === 'pending' && (
                        <div className="bg-amber-500 text-white rounded-xl p-2 shadow-sm" title="Awaiting Approval">
                           <Clock className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {childDuties.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Duty History Yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-8">This child hasn't been assigned any clinical duties yet. Assignments will appear here once they book their clinical schedules.</p>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
                  >
                    View Overall Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return renderDashboardView();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header with Navigation and Logout */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src="/image0.png"
                    alt="Comadronas System Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    Kumadronas Clinical On-call Duty System
                  </h1>
                  <p className="text-xs text-gray-600 hidden sm:block mt-0.5">Ilocos Sur Community College</p>
                </div>
              </div>
            </div>

            {/* Right side - Simplified Header Actions */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center p-2 px-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl mr-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white border border-emerald-200 flex-shrink-0">
                    <img
                      src="/image0.png"
                      alt="User Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user?.first_name} {user?.last_name}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold capitalize leading-tight mt-0.5">{user?.role}</p>
                    {user?.email && (
                      <p className="text-[10px] text-gray-500 truncate leading-tight">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation - Mobile Drawer & Desktop Sticky */}
          <aside className={`
            fixed lg:sticky
            top-0 lg:top-24
            left-0 lg:left-auto
            h-full lg:h-fit
            w-64 sm:w-72 lg:w-64
            bg-white lg:bg-transparent
            shadow-2xl lg:shadow-none
            z-40 lg:z-auto
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto lg:overflow-visible
            pb-20 lg:pb-0
          `}>
            <div className="p-4 lg:p-0 space-y-2">
              {/* Mobile Header */}
              <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src="/image0.png"
                      alt="Comadronas System Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Menu</h2>
                    <p className="text-xs text-gray-600">Navigation</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'signout') {
                          handleSignOut();
                        } else {
                          setActiveTab(item.id);
                        }
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id || (item.id === 'signout' && showLogoutModal)
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg transform scale-105'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 border border-white shadow-sm">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* User Info Card removed from here, moved to Header */}

              {/* Mobile Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="lg:hidden w-full flex items-center justify-center space-x-2 px-4 py-3 mt-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            ></div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to sign out of the Kumadronas System?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {bookingToConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-tight">are you sure.</h3>
            <p className="text-sm text-gray-600 mb-2">
              Confirm duty booking for:
            </p>
            <div className="bg-emerald-50 rounded-2xl p-4 mb-4 border border-emerald-100">
              <p className="text-base font-bold text-emerald-800 mb-1">
                {new Date(bookingToConfirm.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
              <p className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-1">
                <MapPin className="w-4 h-4" /> {bookingToConfirm.location || 'Hospital Location'}
              </p>
            </div>
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg py-2 px-3 mb-6 animate-pulse uppercase">
              ⚠️ confirmed booking cannot be undone
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setBookingToConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBookDuty}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Individual Student Modal */}
      {approveToConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve Student?</h3>
            <p className="text-sm text-gray-500 mb-2">
              Do you want to approve the duty booking for
            </p>
            <p className="text-base font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 mb-6">
              {approveToConfirm.studentName}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setApproveToConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveStudent}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve All Students Modal */}
      {approveAllToConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve All Students?</h3>
            <p className="text-sm text-gray-500 mb-2">
              Do you want to approve the duty booking for all
            </p>
            <p className="text-base font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 mb-1">
              {approveAllToConfirm.studentCount} student{approveAllToConfirm.studentCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400 mb-6">This will mark the entire schedule as approved.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setApproveAllToConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveAllStudents}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED: Reject Confirmation Modal - handles both individual and bulk rejections */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {studentToReject ? 'Reject Student Booking' : 'Reject All Bookings'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {studentToReject
                ? `Are you sure you want to reject the booking for ${studentToReject.studentName}? This student will be notified of the rejection.`
                : 'Are you sure you want to reject this entire schedule? All student bookings will be cancelled and students will be notified.'
              }
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Missing requirements, Schedule conflict..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-red-500 focus:border-red-500 transition-colors"
                rows="3"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={studentToReject ? confirmRejectStudent : confirmRejectAllStudents}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {studentToReject ? 'Reject Student' : 'Reject All'}
              </button>
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setScheduleToReject(null);
                  setStudentToReject(null);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duty Details Modal */}
      {showDutyDetailsModal && renderDutyDetailsModal()}
    </div>
  );
};

export default Dashboard;
