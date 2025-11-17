import React from 'react';
import { useQuery } from 'react-query';
import { appointmentAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { patientAPI } from '../services/api';
import { Calendar, Clock, Bell, Plus, Stethoscope, CheckCircle, AlertCircle, Users, XCircle, Award } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const PatientDashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'patientDashboard',
    () => patientAPI.getDashboard(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fallback: fetch appointments to compute stats client-side if needed
  const { data: fallbackAppointments } = useQuery(
    ['patientAppointmentsForStats'],
    () => appointmentAPI.getPatientAppointments({ limit: 100, offset: 0 }),
    { staleTime: 30000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const dashboardPayload = dashboardData?.data;
  const dashboardContent = dashboardPayload?.data || {};
  const {
    upcomingAppointments,
    notifications,
    statistics,
    nextAppointment,
    recentActivity,
  } = dashboardContent;

  const fallbackPayload = fallbackAppointments?.data;
  const appts = Array.isArray(fallbackPayload?.data) ? fallbackPayload.data : [];
  const computedStats = appts.length
    ? {
        total_appointments: appts.length,
        approved_appointments: appts.filter(a => a.status === 'approved').length,
        pending_appointments: appts.filter(a => a.status === 'pending').length,
        completed_appointments: appts.filter(a => a.status === 'completed').length,
        cancelled_appointments: appts.filter(a => a.status === 'cancelled').length,
        rejected_appointments: appts.filter(a => a.status === 'rejected').length,
        upcoming_appointments: appts.filter(a => {
          const appointmentDate = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const now = new Date();
          return appointmentDate >= now && ['approved', 'pending'].includes(a.status);
        }).length,
        completed_appointments_this_month: appts.filter(a => {
          if (a.status !== 'completed') return false;
          const appointmentDate = new Date(a.appointment_date);
          const now = new Date();
          return appointmentDate.getMonth() === now.getMonth() && appointmentDate.getFullYear() === now.getFullYear();
        }).length,
      }
    : null;
  const stats = {
    total_appointments: 0,
    approved_appointments: 0,
    pending_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0,
    rejected_appointments: 0,
    upcoming_appointments: 0,
    completed_appointments_this_month: 0,
    distinct_doctors_seen: 0,
    ...(statistics || computedStats || {}),
  };

  const statCards = [
    {
      label: 'Total Appointments',
      value: stats.total_appointments,
      icon: Calendar,
      iconClass: 'text-gray-400',
    },
    {
      label: 'Approved',
      value: stats.approved_appointments,
      icon: CheckCircle,
      iconClass: 'text-green-400',
    },
    {
      label: 'Completed',
      value: stats.completed_appointments,
      icon: CheckCircle,
      iconClass: 'text-emerald-500',
    },
    {
      label: 'Upcoming',
      value: stats.upcoming_appointments,
      icon: Clock,
      iconClass: 'text-blue-400',
    },
    {
      label: 'Pending Requests',
      value: stats.pending_appointments,
      icon: AlertCircle,
      iconClass: 'text-yellow-400',
    },
    {
      label: 'Cancelled',
      value: stats.cancelled_appointments,
      icon: XCircle,
      iconClass: 'text-red-400',
    },
    {
      label: 'Doctors Visited',
      value: stats.distinct_doctors_seen ?? '—',
      icon: Users,
      iconClass: 'text-purple-400',
    },
    {
      label: 'Completed This Month',
      value: stats.completed_appointments_this_month,
      icon: Award,
      iconClass: 'text-emerald-400',
    },
    {
      label: 'Notifications',
      value: notifications?.length || 0,
      icon: Bell,
      iconClass: 'text-indigo-400',
    },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Patient Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your appointments and health records
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/appointments"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 ${iconClass}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {value ?? '—'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next appointment */}
      {nextAppointment && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
              Next Appointment
            </h3>
            <div className="md:flex md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">With</p>
                <p className="text-base font-semibold text-gray-900">
                  Dr. {nextAppointment.doctor_name}
                </p>
                <p className="text-sm text-gray-500">{nextAppointment.specialization}</p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(nextAppointment.appointment_date)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{formatTime(nextAppointment.appointment_time)}</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  nextAppointment.status
                )}`}
              >
                {nextAppointment.status}
              </span>
            </div>
            {nextAppointment.problem_description && (
              <p className="mt-4 text-sm text-gray-600">
                {nextAppointment.problem_description}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upcoming Appointments
            </h3>
            {upcomingAppointments?.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Stethoscope className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.specialization}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(appointment.appointment_date)}</span>
                      <Clock className="h-4 w-4 ml-3 mr-1" />
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {appointment.problem_description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Book an appointment to get started.
                </p>
                <div className="mt-6">
                  <Link
                    to="/appointments"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Notifications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Notifications
                </h3>
                <Link
                  to="/notifications"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </Link>
              </div>
              {notifications?.length > 0 ? (
                <div className="space-y-4">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.notification_id}
                      className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Bell className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm text-blue-700 font-medium">
                            {notification.message}
                          </p>
                          {notification.doctor_name && (
                            <p className="mt-1 text-xs text-blue-600">
                              From: Dr. {notification.doctor_name}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-blue-500">
                            {new Date(notification.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You'll receive notifications about your appointments here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              {recentActivity?.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.appointment_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Dr. {activity.doctor_name}
                          </p>
                          <p className="text-xs text-gray-500">{activity.specialization}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{formatDate(activity.appointment_date)}</span>
                        <Clock className="h-4 w-4 ml-3 mr-1" />
                        <span>{formatTime(activity.appointment_time)}</span>
                      </div>
                      {activity.problem_description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {activity.problem_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Stethoscope className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Book or attend appointments to see them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
