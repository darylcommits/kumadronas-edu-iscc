// ReportsAnalytics.js - Admin reports and analytics page
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  PieChart,
  Activity,
  FileText
} from 'lucide-react';

const ReportsAnalytics = () => {
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({});

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Fetch duty statistics
      const { data: duties, error: dutiesError } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules!inner(date, status),
          profiles!student_id(full_name, year_level)
        `)
        .gte('schedules.date', startDate.toISOString().split('T')[0])
        .lte('schedules.date', endDate.toISOString().split('T')[0]);

      if (dutiesError) throw dutiesError;

      // Fetch student statistics
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      // Calculate analytics
      const totalDuties = duties?.length || 0;
      const completedDuties = duties?.filter(d => d.status === 'completed').length || 0;
      const cancelledDuties = duties?.filter(d => d.status === 'cancelled').length || 0;
      const pendingDuties = duties?.filter(d => d.status === 'booked').length || 0;

      // Group by year level
      const yearLevelStats = students?.reduce((acc, student) => {
        const yearLevel = student.year_level || 'Unknown';
        acc[yearLevel] = (acc[yearLevel] || 0) + 1;
        return acc;
      }, {});

      // Group duties by date
      const dailyDuties = duties?.reduce((acc, duty) => {
        const date = duty.schedules.date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Student performance
      const studentPerformance = duties?.reduce((acc, duty) => {
        const studentName = duty.profiles.full_name;
        if (!acc[studentName]) {
          acc[studentName] = { total: 0, completed: 0, cancelled: 0 };
        }
        acc[studentName].total++;
        if (duty.status === 'completed') acc[studentName].completed++;
        if (duty.status === 'cancelled') acc[studentName].cancelled++;
        return acc;
      }, {});

      setAnalyticsData({
        totalDuties,
        completedDuties,
        cancelledDuties,
        pendingDuties,
        totalStudents: students?.length || 0,
        activeStudents: students?.filter(s => s.is_active).length || 0,
        yearLevelStats,
        dailyDuties,
        studentPerformance,
        completionRate: totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0,
        cancellationRate: totalDuties > 0 ? Math.round((cancelledDuties / totalDuties) * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const exportReport = (format) => {
    const reportData = {
      period: `Last ${dateRange} days`,
      generated: new Date().toISOString(),
      data: analyticsData
    };

    // Prepare flat data for CSV/Excel
    const flatData = [
      { 'Metric': 'Total Duties', 'Value': analyticsData.totalDuties || 0 },
      { 'Metric': 'Completed Duties', 'Value': analyticsData.completedDuties || 0 },
      { 'Metric': 'Cancelled Duties', 'Value': analyticsData.cancelledDuties || 0 },
      { 'Metric': 'Pending Duties', 'Value': analyticsData.pendingDuties || 0 },
      { 'Metric': 'Total Students', 'Value': analyticsData.totalStudents || 0 },
      { 'Metric': 'Active Students', 'Value': analyticsData.activeStudents || 0 },
      { 'Metric': 'Completion Rate', 'Value': `${analyticsData.completionRate || 0}%` },
      { 'Metric': 'Cancellation Rate', 'Value': `${analyticsData.cancellationRate || 0}%` }
    ];

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duty-report-${dateRange}days-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Metric', 'Value'];
      const csvContent = [
        `Report Period: Last ${dateRange} days`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        headers.join(','),
        ...flatData.map(row => `"${row.Metric}","${row.Value}"`)
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duty-report-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      // Create HTML table for Excel
      const tableHTML = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Duty Report - Last ${dateRange} Days</title>
          </head>
          <body>
            <h1>Duty Report - Last ${dateRange} Days</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <br>
            <table border="1" cellpadding="5" cellspacing="0">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                ${flatData.map(row => `<tr><td>${row.Metric}</td><td>${row.Value}</td></tr>`).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duty-report-${dateRange}days-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      exportReportPDF();
    }
  };

  // FIXED: Proper PDF export using reportlab
  const exportReportPDF = async () => {
    try {
      // Create a simple HTML-based PDF using browser's print functionality
      const reportData = {
        dateRange: dateRange,
        totalDuties: analyticsData.totalDuties || 0,
        completedDuties: analyticsData.completedDuties || 0,
        cancelledDuties: analyticsData.cancelledDuties || 0,
        pendingDuties: analyticsData.pendingDuties || 0,
        totalStudents: analyticsData.totalStudents || 0,
        activeStudents: analyticsData.activeStudents || 0,
        completionRate: analyticsData.completionRate || 0,
        cancellationRate: analyticsData.cancellationRate || 0
      };

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Duty Report - Last ${dateRange} Days</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .title { font-size: 24px; color: #10b981; font-weight: bold; margin-bottom: 10px; }
            .subtitle { color: #666; margin-bottom: 20px; }
            .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .summary-table th { background-color: #10b981; color: white; padding: 12px; text-align: left; }
            .summary-table td { padding: 12px; border-bottom: 1px solid #ddd; }
            .summary-table tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-style: italic; }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Duty Report - Last ${dateRange} Days</div>
            <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
          </div>

          <table class="summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Total Duties</td><td>${reportData.totalDuties}</td></tr>
              <tr><td>Completed Duties</td><td>${reportData.completedDuties}</td></tr>
              <tr><td>Cancelled Duties</td><td>${reportData.cancelledDuties}</td></tr>
              <tr><td>Pending Duties</td><td>${reportData.pendingDuties}</td></tr>
              <tr><td>Total Students</td><td>${reportData.totalStudents}</td></tr>
              <tr><td>Active Students</td><td>${reportData.activeStudents}</td></tr>
              <tr><td>Completion Rate</td><td>${reportData.completionRate}%</td></tr>
              <tr><td>Cancellation Rate</td><td>${reportData.cancellationRate}%</td></tr>
            </tbody>
          </table>

          <div class="footer">
            Ilocos Sur Community College - Kumadronas System
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px; color: #666;">
            Note: This report was generated for printing. Please use your browser's print function to save as PDF.
          </div>
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        alert('PDF report generated! Use your browser\'s print dialog to save as PDF.');
      };

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  const OverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => setDateRange('30')} className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Duties</p>
              <p className="text-3xl font-bold">{analyticsData.totalDuties}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div onClick={() => setDateRange('30')} className="card bg-gradient-to-r from-green-500 to-green-600 text-white hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Completed</p>
              <p className="text-3xl font-bold">{analyticsData.completedDuties}</p>
              <p className="text-green-100 text-sm">{analyticsData.completionRate}% rate</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div onClick={() => setDateRange('30')} className="card bg-gradient-to-r from-red-500 to-red-600 text-white hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Cancelled</p>
              <p className="text-3xl font-bold">{analyticsData.cancelledDuties}</p>
              <p className="text-red-100 text-sm">{analyticsData.cancellationRate}% rate</p>
            </div>
            <XCircle className="w-10 h-10 text-red-200" />
          </div>
        </div>

        <div onClick={() => setDateRange('7')} className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:brightness-110 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Pending</p>
              <p className="text-3xl font-bold">{analyticsData.pendingDuties}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-200" />
          </div>
        </div>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Year Level Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Students by Year Level</h3>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {Object.entries(analyticsData.yearLevelStats || {}).map(([yearLevel, count]) => (
              <div key={yearLevel} className="flex items-center justify-between">
                <span className="text-gray-700">{yearLevel}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${(count / analyticsData.totalStudents) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Duty Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Daily Duty Distribution</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-48 flex items-end justify-between space-x-1">
            {Object.entries(analyticsData.dailyDuties || {})
              .slice(-7)
              .map(([date, count]) => (
                <div key={date} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-emerald-500 rounded-t w-full min-h-[4px]"
                    style={{ height: `${(count / Math.max(...Object.values(analyticsData.dailyDuties || {}))) * 100}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45">
                    {new Date(date).getDate()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Student Performance</h3>
          <TrendingUp className="w-5 h-5 text-gray-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">Student</th>
                <th className="text-center py-2 text-gray-600">Total Duties</th>
                <th className="text-center py-2 text-gray-600">Completed</th>
                <th className="text-center py-2 text-gray-600">Cancelled</th>
                <th className="text-center py-2 text-gray-600">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analyticsData.studentPerformance || {})
                .sort(([, a], [, b]) => (b.completed / b.total) - (a.completed / a.total))
                .slice(0, 10)
                .map(([name, stats]) => (
                  <tr key={name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{name}</td>
                    <td className="py-3 text-center">{stats.total}</td>
                    <td className="py-3 text-center text-green-600">{stats.completed}</td>
                    <td className="py-3 text-center text-red-600">{stats.cancelled}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(stats.completed / stats.total) >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : (stats.completed / stats.total) >= 0.6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {Math.round((stats.completed / stats.total) * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Comprehensive duty scheduling insights and performance metrics</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => exportReport('pdf')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => exportReport('excel')}
            className="btn-secondary flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field w-40"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input-field w-48"
            >
              <option value="overview">Overview Report</option>
              <option value="student">Student Performance</option>
              <option value="attendance">Attendance Report</option>
              <option value="trends">Trend Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'overview' && <OverviewReport />}

      {/* Additional report types would be implemented here */}
      {reportType !== 'overview' && (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </h3>
          <p className="text-gray-600">This report type is coming soon!</p>
        </div>
      )}

      {/* Export Summary */}
      <div className="card bg-gray-50 border-l-4 border-l-emerald-500">
        <div className="flex items-start space-x-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Export Options</h4>
            <p className="text-sm text-gray-600 mt-1">
              Reports can be exported in PDF, Excel, or JSON formats. Data includes duty schedules,
              student performance metrics, and attendance tracking for the selected period.
            </p>
            <div className="flex space-x-2 mt-3">
             
              <button
                onClick={() => exportReport('csv')}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;