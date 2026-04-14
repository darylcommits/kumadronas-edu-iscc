import { createClient } from '@supabase/supabase-js'
import { sendSmsNotification, sendEmailNotification } from './externalNotifications'
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Enhanced database helper functions with better error handling
export const dbHelpers = {
  // Helper to get current session user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    
    // Get full profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return profile;
  },

  // Create user profile with role validation
  createProfile: async (userData) => {
    const allowedRoles = ['admin', 'co-admin', 'student', 'parent'];
    if (!allowedRoles.includes(userData.role)) {
      throw new Error('Invalid role specified');
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user profile with role-based data
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  // Get all schedules with enhanced student information
  getSchedules: async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        schedule_students (
          id,
          student_id,
          booking_time,
          status,
          profiles:student_id (*)
        )
      `)
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  // Create schedule with validation
  createSchedule: async (scheduleData) => {
    // Validate date is not in the past
    const scheduleDate = new Date(scheduleData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      throw new Error('Cannot create schedule for past dates');
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert([{
        ...scheduleData,
        status: 'pending',
        max_students: scheduleData.max_students || 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Enhanced book duty function with better validation and error handling
  bookDuty: async (scheduleId, studentId) => {
    try {
      console.log('Booking duty:', { scheduleId, studentId });

      // First, get detailed schedule information using our helper function
      const { data: scheduleInfo, error: scheduleError } = await supabase
        .rpc('get_schedule_booking_info', { schedule_uuid: scheduleId });

      console.log('Schedule info:', scheduleInfo);

      if (scheduleError) {
        console.error('Error getting schedule info:', scheduleError);
        throw new Error(`Failed to get schedule information: ${scheduleError.message}`);
      }

      if (!scheduleInfo || scheduleInfo.length === 0) {
        throw new Error('Schedule not found');
      }

      const info = scheduleInfo[0];

      // Client-side validation for better user experience
      const scheduleDate = new Date(info.schedule_date);
      const today = new Date();

      if (scheduleDate.toDateString() === today.toDateString()) {
        throw new Error('Cannot book duty for today. Please book in advance.');
      }

      if (scheduleDate < today.setHours(0, 0, 0, 0)) {
        throw new Error('Cannot book duty for past dates');
      }

      if (info.is_full) {
        throw new Error(`This date is fully booked (${info.current_bookings}/${info.max_students} students)`);
      }

      // Check if student already has a booking for this schedule
      const { data: existingBooking, error: existingError } = await supabase
        .from('schedule_students')
        .select('id')
        .eq('schedule_id', scheduleId)
        .eq('student_id', studentId)
        .eq('status', 'booked')
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing booking:', existingError);
        throw new Error('Failed to check existing bookings');
      }

      if (existingBooking) {
        throw new Error('You have already booked this date');
      }

      // Proceed with booking - the database trigger will do final validation
      const { data, error } = await supabase
        .from('schedule_students')
        .insert([{
          schedule_id: scheduleId,
          student_id: studentId,
          booking_time: new Date().toISOString(),
          status: 'booked'
        }])
        .select()
        .single();

      if (error) {
        console.error('Booking error:', error);

        // Parse database error messages for better user experience
        let userMessage = error.message;

        if (error.message.includes('Maximum number of students')) {
          userMessage = 'This date is fully booked. Please choose another date.';
        } else if (error.message.includes('Cannot book duty for today')) {
          userMessage = 'Cannot book duty for today. Bookings must be made in advance.';
        } else if (error.message.includes('Cannot book duty for past dates')) {
          userMessage = 'Cannot book duty for past dates. Please choose a future date.';
        } else if (error.message.includes('Student has already booked')) {
          userMessage = 'You have already booked this date.';
        }

        throw new Error(userMessage);
      }

      console.log('Booking successful:', data);

      // Create audit log
      try {
        await supabase.from('duty_logs').insert({
          schedule_student_id: data.id,
          schedule_id: scheduleId,
          action: 'booked',
          performed_by: studentId,
          target_user: studentId,
          notes: `Student booked duty for ${info.schedule_date.split('T')[0]}`
        });
      } catch (logError) {
        console.warn('Failed to create audit log:', logError);
      }

      // Create notification for admins and parents
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'co-admin']);

        const { data: parentLinks } = await supabase
          .from('parent_student_links')
          .select('parent_id, profiles!parent_id(id, phone_number, email)')
          .eq('student_id', studentId)
          .eq('status', 'approved');

        const parents = parentLinks?.map(link => link.profiles) || [];

        const dateStr = new Date(info.schedule_date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const notifications = [];

        if (admins && admins.length > 0) {
          admins.forEach(admin => {
            notifications.push({
              user_id: admin.id,
              title: 'New Duty Booking',
              message: `A student has booked duty for ${dateStr}`,
              type: 'info'
            });
          });
        }

        if (parents && parents.length > 0) {
          // Fetch student name for the external message
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', studentId)
            .single();
          
          const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : 'Your child';

          parents.forEach(parent => {
            const message = `${studentName} has booked duty for ${dateStr}. Status: Pending Admin Approval.`;
            
            // In-app notification
            notifications.push({
              user_id: parent.id,
              title: 'Child Duty Booked',
              message: message,
              type: 'info'
            });

            // External notifications (SMS & Email)
            if (parent.phone_number) {
              sendSmsNotification(parent.phone_number, message);
            }
            if (parent.email) {
              sendEmailNotification(parent.email, 'Child Duty Booked', message);
            }
          });
        }

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notificationError) {
        console.warn('Failed to create notifications:', notificationError);
      }

      return data;

    } catch (error) {
      console.error('Error in bookDuty:', error);
      throw error;
    }
  },

  // Cancel duty with same-day restriction
  cancelDuty: async (scheduleStudentId, userId, userRole) => {
    try {
      console.log('Cancelling duty:', { scheduleStudentId, userId, userRole });

      // Get the duty booking details
      const { data: booking, error: bookingError } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules (date, description)
        `)
        .eq('id', scheduleStudentId)
        .single();

      if (bookingError) {
        console.error('Error getting booking:', bookingError);
        throw new Error('Booking not found');
      }

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Validation: Same-day cancellation restriction
      const dutyDate = new Date(booking.schedules.date);
      const today = new Date();

      if (dutyDate.toDateString() === today.toDateString()) {
        throw new Error('Cannot cancel duties on the same day. Cancellations must be done in advance.');
      }

      // Authorization check
      if (userRole === 'student' && booking.student_id !== userId) {
        throw new Error('You can only cancel your own duties');
      }

      // Update the booking status - trigger will validate
      const { data, error } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: `Cancelled by ${userRole}`
        })
        .eq('id', scheduleStudentId)
        .select()
        .single();

      if (error) {
        console.error('Cancellation error:', error);
        throw new Error(error.message);
      }

      // Create audit log
      try {
        await supabase.from('duty_logs').insert({
          schedule_student_id: scheduleStudentId,
          schedule_id: booking.schedule_id,
          action: 'cancelled',
          performed_by: userId,
          target_user: booking.student_id,
          notes: `Duty cancelled by ${userRole} on ${new Date().toISOString()}`
        });
      } catch (logError) {
        console.warn('Failed to create audit log:', logError);
      }

      return data;

    } catch (error) {
      console.error('Error in cancelDuty:', error);
      throw error;
    }
  },

  // Get student's duty history with detailed information
  getStudentDuties: async (studentId) => {
    const { data, error } = await supabase
      .from('schedule_students')
      .select(`
        *,
        schedules (
          date,
          status,
          description,
          location,
          shift_start,
          shift_end,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .order('booking_time', { ascending: false })

    if (error) throw error
    return data
  },

  // Get child's duties for parent access (view-only)
  getChildDuties: async (studentId, parentId) => {
    // If no studentId provided, just return empty (parent must select a child)
    if (!studentId) return [];

    let targetParentId = parentId;
    if (!targetParentId) {
      const user = await dbHelpers.getCurrentUser();
      if (!user) throw new Error('Not authenticated');
      targetParentId = user.id;
    }

    // Verify parent is linked and approved for this child
    const { data: link, error: linkError } = await supabase
      .from('parent_student_links')
      .select('id')
      .eq('parent_id', targetParentId)
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .maybeSingle();

    if (linkError || !link) throw new Error('You do not have permission to view this child\'s duties');

    return await dbHelpers.getStudentDuties(studentId);
  },

  // Update schedule status with approval workflow
  updateScheduleStatus: async (scheduleId, status, userId) => {
    const allowedStatuses = ['pending', 'approved', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approved_by = userId;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .select()
      .single()

    if (error) throw error;

    // Create audit log for status change
    try {
      await supabase.from('duty_logs').insert({
        schedule_id: scheduleId,
        action: `status_${status}`,
        performed_by: userId,
        notes: `Schedule status changed to ${status}`
      });
    } catch (logError) {
      console.warn('Failed to create audit log:', logError);
    }

    // If approved, notify students
    if (status === 'approved') {
      try {
        const { data: scheduleStudents } = await supabase
          .from('schedule_students')
          .select('student_id')
          .eq('schedule_id', scheduleId)
          .eq('status', 'booked');

        if (scheduleStudents && scheduleStudents.length > 0) {
          const notifications = scheduleStudents.map(ss => ({
            user_id: ss.student_id,
            title: 'Duty Schedule Approved',
            message: `Duty schedule for ${new Date(data.date).toLocaleDateString()} has been approved`,
            type: 'success'
          }));

          await supabase.from('notifications').insert(notifications);
        }
      } catch (notificationError) {
        console.warn('Failed to create notifications:', notificationError);
      }
    }

    return data;
  },

  // Get available dates (not fully booked and not in past)
  getAvailableDates: async (startDate = new Date()) => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        schedule_students!left (
          id,
          status
        )
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) throw error

    // Filter dates with available slots
    return data.filter(schedule => {
      const activeBookings = schedule.schedule_students?.filter(s =>
        s.status === 'booked'
      ) || [];
      const maxStudents = schedule.max_students || 2;
      return activeBookings.length < maxStudents;
    });
  },

  // Get comprehensive system logs for admin monitoring
  getSystemLogs: async (limit = 100) => {
    const { data, error } = await supabase
      .from('duty_logs')
      .select(`
        *,
        schedule_students (
          schedules (date, description),
          profiles:student_id (first_name, last_name, middle_initial, email)
        ),
        performed_by_profile:profiles!performed_by (
          first_name,
          last_name,
          middle_initial,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Create notification
  createNotification: async (userId, title, message, type = 'info') => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        read: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark notification as read
  markNotificationRead: async (notificationId, userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get duty statistics for reporting
  getDutyStatistics: async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('schedule_students')
      .select(`
        *,
        schedules!inner (date, description),
        profiles!student_id (first_name, last_name, middle_initial, year_level)
      `)
      .gte('schedules.date', startDate)
      .lte('schedules.date', endDate);

    if (error) throw error;

    // Calculate statistics
    const totalDuties = data.length;
    const completedDuties = data.filter(d => d.status === 'completed').length;
    const cancelledDuties = data.filter(d => d.status === 'cancelled').length;
    const pendingDuties = data.filter(d => d.status === 'booked').length;

    // Group by student
    const studentStats = data.reduce((acc, duty) => {
      const student = duty.profiles;
      const studentName = student ? `${student.last_name}, ${student.first_name}${student.middle_initial ? ' ' + student.middle_initial : ''}` : 'Unknown';
      if (!acc[studentName]) {
        acc[studentName] = { total: 0, completed: 0, cancelled: 0 };
      }
      acc[studentName].total++;
      if (duty.status === 'completed') acc[studentName].completed++;
      if (duty.status === 'cancelled') acc[studentName].cancelled++;
      return acc;
    }, {});

    return {
      totalDuties,
      completedDuties,
      cancelledDuties,
      pendingDuties,
      studentStats,
      rawData: data
    };
  },

  // ============================================================================
  // NEW APPROVAL FUNCTIONS - Individual and Bulk Booking Approvals
  // ============================================================================

  /**
   * Approve an individual student booking
   * @param {string} bookingId - The schedule_students record ID
   * @param {string} adminId - The admin user ID performing the approval
   * @returns {Promise<{data, error}>}
   */
  approveIndividualBooking: async (bookingId, adminId) => {
    try {
      // Update the booking status
      const { data: booking, error: updateError } = await supabase
        .from('schedule_students')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select('*, profiles:student_id(*), schedules(date, location)')
        .single();

      if (updateError) throw updateError;

      // Log the approval
      await supabase.from('duty_logs').insert([{
        schedule_student_id: bookingId,
        schedule_id: booking.schedule_id,
        action: 'approved_individual',
        performed_by: adminId,
        target_user: booking.student_id,
        notes: `Admin approved booking for ${booking.profiles ? `${booking.profiles.last_name}, ${booking.profiles.first_name}` : 'student'}`
      }]);

      // Create notification for student
      try {
        const dateStr = new Date(booking.schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await supabase.from('notifications').insert([{
          user_id: booking.student_id,
          title: 'Duty Booking Approved',
          message: `Duty booking for ${dateStr} at ${booking.schedules.location} has been approved`,
          type: 'success'
        }]);

        // Notify Parents (Internal + SMS + Email)
        const { data: parentLinks } = await supabase
          .from('parent_student_links')
          .select('parent_id, profiles!parent_id(id, phone_number, email)')
          .eq('student_id', booking.student_id)
          .eq('status', 'approved');

        const parents = parentLinks?.map(link => link.profiles) || [];

        if (parents && parents.length > 0) {
          const parentNotifications = [];
          parents.forEach(parent => {
            const student = booking.profiles;
            const childName = student ? `${student.first_name} ${student.last_name}` : 'Child';
            const message = `Hello, your child Name: ${childName} booked duty on Date: ${dateStr} and Time: 8:00 AM - 5:00 PM at ${booking.schedules.location}. The admin has approved this schedule.`;
            parentNotifications.push({
              user_id: parent.id,
              title: 'Child Duty Approved',
              message: message,
              type: 'success'
            });

            if (parent.phone_number) {
               sendSmsNotification(parent.phone_number, message);
            }
            if (parent.email) {
               sendEmailNotification(parent.email, 'Child Duty Approved', message);
            }
          });

          if (parentNotifications.length > 0) {
            await supabase.from('notifications').insert(parentNotifications);
          }
        }
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }

      return { data: booking, error: null };
    } catch (error) {
      console.error('Error approving individual booking:', error);
      return { data: null, error };
    }
  },

  /**
   * Approve all bookings for a specific schedule
   * @param {string} scheduleId - The schedule ID
   * @param {string} adminId - The admin user ID performing the approval
   * @returns {Promise<{data, error, count}>}
   */
  approveAllBookingsForSchedule: async (scheduleId, adminId) => {
    try {
      // Get all pending bookings for this schedule
      const { data: bookings, error: fetchError } = await supabase
        .from('schedule_students')
        .select('id, student_id, profiles:student_id(first_name, last_name, middle_initial)')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');

      if (fetchError) throw fetchError;

      if (!bookings || bookings.length === 0) {
        return { data: [], error: null, message: 'No pending bookings to approve', count: 0 };
      }

      // Update all bookings to approved
      const { data: updated, error: updateError } = await supabase
        .from('schedule_students')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked')
        .select('*, schedules(date, location)');

      if (updateError) throw updateError;

      // Log all approvals
      const logEntries = bookings.map(booking => ({
        schedule_student_id: booking.id,
        schedule_id: scheduleId,
        action: 'approved_all',
        performed_by: adminId,
        target_user: booking.student_id,
        notes: `Admin approved booking for ${booking.profiles ? `${booking.profiles.last_name}, ${booking.profiles.first_name}` : 'student'} (bulk approval)`
      }));

      await supabase.from('duty_logs').insert(logEntries);

      // Create notifications for all approved students
      try {
        if (updated && updated.length > 0) {
          const dateStr = new Date(updated[0].schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const notifications = bookings.map(booking => ({
            user_id: booking.student_id,
            title: 'Duty Booking Approved',
            message: `Duty booking for ${dateStr} at ${updated[0].schedules.location} has been approved`,
            type: 'success'
          }));

          await supabase.from('notifications').insert(notifications);

          // Notify Parents
          const studentIds = bookings.map(b => b.student_id);
          const { data: parentLinks } = await supabase
            .from('parent_student_links')
            .select('student_id, parent_id, profiles!parent_id(id, phone_number, email)')
            .in('student_id', studentIds)
            .eq('status', 'approved');

          const parents = parentLinks?.map(link => ({
            ...link.profiles,
            student_id: link.student_id
          })) || [];

          if (parents && parents.length > 0) {
            const parentNotifications = [];
            parents.forEach(parent => {
              const relatedBooking = bookings.find(b => b.student_id === parent.student_id);
              const student = relatedBooking?.profiles;
              const childName = student ? `${student.first_name} ${student.last_name}` : 'Child';
              const message = `Hello, your child Name: ${childName} booked duty on Date: ${dateStr} and Time: 8:00 AM - 5:00 PM at ${updated[0].schedules.location}. The admin has approved this schedule.`;
              
              parentNotifications.push({
                user_id: parent.id,
                title: 'Child Duty Approved',
                message: message,
                type: 'success'
              });

              if (parent.phone_number) {
                sendSmsNotification(parent.phone_number, message);
              }
              if (parent.email) {
                sendEmailNotification(parent.email, 'Child Duty Approved', message);
              }
            });

            if (parentNotifications.length > 0) {
              await supabase.from('notifications').insert(parentNotifications);
            }
          }
        }
      } catch (notificationError) {
        console.warn('Failed to create notifications:', notificationError);
      }

      return { data: updated, error: null, count: bookings.length };
    } catch (error) {
      console.error('Error approving all bookings:', error);
      return { data: null, error, count: 0 };
    }
  },

  /**
   * Reject an individual student booking
   * @param {string} bookingId - The schedule_students record ID
   * @param {string} adminId - The admin user ID performing the rejection
   * @param {string} reason - Reason for rejection
   * @returns {Promise<{data, error}>}
   */
  rejectIndividualBooking: async (bookingId, adminId, reason = 'Booking rejected by admin') => {
    try {
      const { data: booking, error: updateError } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', bookingId)
        .select('*, profiles:student_id(first_name, last_name, middle_initial), schedules(date, location)')
        .single();

      if (updateError) throw updateError;

      // Log the rejection
      await supabase.from('duty_logs').insert([{
        schedule_student_id: bookingId,
        schedule_id: booking.schedule_id,
        action: 'rejected_individual',
        performed_by: adminId,
        target_user: booking.student_id,
        notes: `Admin rejected booking for ${booking.profiles ? `${booking.profiles.last_name}, ${booking.profiles.first_name}` : 'student'}: ${reason}`
      }]);

      // Create notification for student
      try {
        const dateStr = new Date(booking.schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await supabase.from('notifications').insert([{
          user_id: booking.student_id,
          title: 'Duty Booking Rejected',
          message: `Duty booking for ${dateStr} at ${booking.schedules.location} has been rejected. Reason: ${reason}`,
          type: 'error'
        }]);
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }

      return { data: booking, error: null };
    } catch (error) {
      console.error('Error rejecting individual booking:', error);
      return { data: null, error };
    }
  },

  /**
   * Reject all bookings for a specific schedule
   * @param {string} scheduleId - The schedule ID
   * @param {string} adminId - The admin user ID performing the rejection
   * @param {string} reason - Reason for rejection
   * @returns {Promise<{data, error, count}>}
   */
  rejectAllBookingsForSchedule: async (scheduleId, adminId, reason = 'All bookings rejected by admin') => {
    try {
      // Get all pending bookings
      const { data: bookings, error: fetchError } = await supabase
        .from('schedule_students')
        .select('id, student_id, profiles:student_id(first_name, last_name, middle_initial)')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');

      if (fetchError) throw fetchError;

      if (!bookings || bookings.length === 0) {
        return { data: [], error: null, message: 'No pending bookings to reject', count: 0 };
      }

      // Update all bookings to cancelled
      const { data: updated, error: updateError } = await supabase
        .from('schedule_students')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked')
        .select('*, schedules(date, location)');

      if (updateError) throw updateError;

      // Log all rejections
      const logEntries = bookings.map(booking => ({
        schedule_student_id: booking.id,
        schedule_id: scheduleId,
        action: 'rejected_all',
        performed_by: adminId,
        target_user: booking.student_id,
        notes: `Admin rejected booking for ${booking.profiles ? `${booking.profiles.last_name}, ${booking.profiles.first_name}` : 'student'} (bulk rejection): ${reason}`
      }));

      await supabase.from('duty_logs').insert(logEntries);

      // Create notifications for all rejected students
      try {
        if (updated && updated.length > 0) {
          const dateStr = new Date(updated[0].schedules.date + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const notifications = bookings.map(booking => ({
            user_id: booking.student_id,
            title: 'Duty Booking Rejected',
            message: `Duty booking for ${dateStr} at ${updated[0].schedules.location} has been rejected. Reason: ${reason}`,
            type: 'error'
          }));

          await supabase.from('notifications').insert(notifications);
        }
      } catch (notificationError) {
        console.warn('Failed to create notifications:', notificationError);
      }

      return { data: updated, error: null, count: bookings.length };
    } catch (error) {
      console.error('Error rejecting all bookings:', error);
      return { data: null, error, count: 0 };
    }
  },

  /**
   * Get pending bookings with full details
   * @returns {Promise<{data, error}>}
   */
  getPendingBookings: async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules (
            id,
            date,
            description,
            location,
            shift_start,
            shift_end,
            status,
            max_students
          ),
          profiles:student_id (
            id,
            first_name,
            last_name,
            middle_initial,
            email,
            student_number,
            year_level
          )
        `)
        .eq('status', 'booked')
        .order('booking_time', { ascending: false });

      if (error) throw error;

      // Filter out any bookings with missing data
      const validBookings = (data || []).filter(booking =>
        booking.schedules && booking.profiles
      );

      return { data: validBookings, error: null };
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      return { data: null, error };
    }
  },

  /**
   * Get all bookings for a specific schedule
   * @param {string} scheduleId - The schedule ID
   * @returns {Promise<{data, error}>}
   */
  getBookingsForSchedule: async (scheduleId) => {
    try {
      const { data, error } = await supabase
        .from('schedule_students')
        .select(`
          *,
          profiles:student_id (
            id,
            first_name,
            last_name,
            middle_initial,
            email,
            student_number,
            year_level
          )
        `)
        .eq('schedule_id', scheduleId)
        .order('booking_time', { ascending: true });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching bookings for schedule:', error);
      return { data: null, error };
    }
  },

  /**
   * Get booking statistics for admin dashboard
   * @returns {Promise<{data, error}>}
   */
  getBookingStats: async () => {
    try {
      const { data: allBookings, error: allError } = await supabase
        .from('schedule_students')
        .select('status, booking_time');

      if (allError) throw allError;

      const stats = {
        total: allBookings.length,
        pending: allBookings.filter(b => b.status === 'booked').length,
        approved: allBookings.filter(b => b.status === 'approved').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length,
        completed: allBookings.filter(b => b.status === 'completed').length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      return { data: null, error };
    }
  },

  /**
   * Send a notification to all registered students
   */
  notifyAllStudents: async (adminId, title, message) => {
    try {
      // Get all students
      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      if (studentError) throw studentError;
      if (!students || students.length === 0) return { success: true, count: 0 };

      // Batch insert notifications
      const notifications = students.map(s => ({
        user_id: s.id,
        title,
        message,
        type: 'info',
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error: notifyError } = await supabase.from('notifications').insert(notifications);
      if (notifyError) throw notifyError;

      // Log the broadcast
      try {
        await supabase.from('duty_logs').insert([{
          action: 'broadcast_notification',
          performed_by: adminId,
          notes: `System Broadcast: ${title}`
        }]);
      } catch (logErr) {}

      return { success: true, count: students.length };
    } catch (error) {
      console.error('Error in notifyAllStudents:', error);
      return { success: false, error };
    }
  },

  // ============================================================================
  // PARENT-STUDENT LINKING FUNCTIONS
  // ============================================================================

  /**
   * Request to link a parent to a student using student number
   */
  requestParentStudentLink: async (studentNumber) => {
    try {
      const user = await dbHelpers.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Find the student by student number (case-insensitive)
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .ilike('student_number', studentNumber)
        .eq('role', 'student')
        .single();

      if (studentError || !student) {
        throw new Error('Student not found with that student number');
      }

      // 2. Check if link already exists
      const { data: existing } = await supabase
        .from('parent_student_links')
        .select('id, status')
        .eq('parent_id', user.id)
        .eq('student_id', student.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'approved') throw new Error('You are already linked to this student');
        if (existing.status === 'pending') throw new Error('A link request is already pending for this student');
        // If declined, we allow re-requesting (status will be updated to pending)
      }

      // 3. Create or update the link request
      const { error } = await supabase
        .from('parent_student_links')
        .upsert([{
          parent_id: user.id,
          student_id: student.id,
          status: 'pending',
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // 4. Notify admins of new request
      try {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'co-admin']);
        if (admins) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'New Parent-Student Link Request',
            message: `A parent has requested to link with student ${student.first_name} ${student.last_name}`,
            type: 'info'
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (e) {}

      return { success: true, message: 'Link request sent!' };
    } catch (error) {
      console.error('Error requesting link:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all children linked to a parent
   */
  getLinkedChildren: async (parentId) => {
    try {
      let targetParentId = parentId;
      
      if (!targetParentId) {
        const user = await dbHelpers.getCurrentUser();
        if (!user) throw new Error('Not authenticated');
        targetParentId = user.id;
      }

      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          status,
          student_id,
          student:profiles!student_id (
            id, first_name, last_name, middle_initial, student_number, email, avatar_url
          )
        `)
        .eq('parent_id', targetParentId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting linked children:', error);
      return { data: null, error };
    }
  },

  /**
   * Get all pending link requests (Admin only)
   */
  getPendingLinkRequests: async () => {
    try {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          *,
          parent:profiles!parent_id (first_name, last_name, email),
          student:profiles!student_id (first_name, last_name, student_number)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return { data: null, error };
    }
  },

  /**
   * Approve or Decline link request
   */
  handleLinkRequest: async (linkId, status, adminId) => {
    try {
      const { data: link, error: updateError } = await supabase
        .from('parent_student_links')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', linkId)
        .select('*, parent:profiles!parent_id(first_name), student:profiles!student_id(first_name, last_name)')
        .single();

      if (updateError) throw updateError;

      // Notify parent
      await supabase.from('notifications').insert([{
        user_id: link.parent_id,
        title: status === 'approved' ? 'Link Request Approved' : 'Link Request Declined',
        message: status === 'approved' 
          ? `Your request to link with ${link.student.first_name} ${link.student.last_name} has been approved.` 
          : `Your request to link with ${link.student.first_name} ${link.student.last_name} was declined.`,
        type: status === 'approved' ? 'success' : 'error'
      }]);

      return { data: link, error: null };
    } catch (error) {
      console.error('Error handling link request:', error);
      return { data: null, error };
    }
  },

  /**
   * Get all hospital locations from system_settings
   */
  getHospitalLocations: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hospital_locations')
        .single();
      
      if (error) throw error;
      return { data: data ? JSON.parse(data.value) : [], error: null };
    } catch (error) {
      console.error('Error fetching hospital locations:', error);
      return { data: null, error };
    }
  },

  /**
   * Update hospital locations in system_settings
   */
  updateHospitalLocations: async (locations) => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(locations), updated_at: new Date().toISOString() })
        .eq('key', 'hospital_locations')
        .select()
        .single();

      if (error) throw error;
      return { data: data ? JSON.parse(data.value) : [], error: null };
    } catch (error) {
      console.error('Error updating hospital locations:', error);
      return { data: null, error };
    }
  }
}