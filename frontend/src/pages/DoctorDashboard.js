import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { appointmentAPI, doctorAPI } from '../services/api';
import { Calendar, Clock, User, Bell, CheckCircle, AlertCircle, Users } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const DoctorDashboard = () => {
  const queryClient = useQueryClient();
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);

  const { data: dashboardData, isLoading, error } = useQuery(
    'doctorDashboard',
    () => doctorAPI.getDashboard(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const updateStatusMutation = useMutation(
    ({ appointmentId, status, message }) =>
      appointmentAPI.updateStatus(appointmentId, { status, message }),
    {
      onMutate: ({ appointmentId }) => {
        setUpdatingAppointmentId(appointmentId);
      },
      onSuccess: (response, variables) => {
        queryClient.invalidateQueries('doctorDashboard');
        queryClient.invalidateQueries('appointments');
        if (variables.status === 'rejected') {
          toast.success('Appointment rejected and deleted successfully');
        } else {
          toast.success(
            `Appointment ${variables.status === 'approved' ? 'approved' : 'updated'} successfully`
          );
        }
      },
      onError: (mutationError) => {
        toast.error(mutationError.response?.data?.message || 'Failed to update appointment status');
      },
      onSettled: () => {
        setUpdatingAppointmentId(null);
      },
    }
  );

  const handleStatusUpdate = (appointmentId, status) => {
    updateStatusMutation.mutate({ appointmentId, status });
  };

  const dashboardPayload = dashboardData?.data;
  const dashboardContent = dashboardPayload?.data || {};

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

  const { todayAppointments, pendingRequests, upcomingAppointments, statistics } = dashboardContent;

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
      case 'rejected':
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
            Doctor Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your appointments and patient care
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/appointments"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View All Appointments
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Appointments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics?.total_appointments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics?.approved_appointments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics?.pending_appointments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics?.completed_appointments || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Today's Appointments
            </h3>
            {todayAppointments?.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.patient_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.patient_phone}
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
                      <Clock className="h-4 w-4 mr-1" />
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You have no scheduled appointments for today.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending Appointment Requests
            </h3>
            {pendingRequests?.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="border-l-4 border-yellow-400 bg-yellow-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-yellow-500 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.patient_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.patient_phone}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-yellow-600 font-medium">
                        PENDING
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                      <Clock className="h-4 w-4 ml-3 mr-1" />
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {appointment.problem_description}
                    </p>
                    {appointment.symptoms && (
                      <p className="mt-1 text-sm text-gray-500">
                        <strong>Symptoms:</strong> {appointment.symptoms}
                      </p>
                    )}
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(appointment.appointment_id, 'approved')}
                        disabled={updatingAppointmentId === appointment.appointment_id}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 ${
                          updatingAppointmentId === appointment.appointment_id ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(appointment.appointment_id, 'rejected')}
                        disabled={updatingAppointmentId === appointment.appointment_id}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 ${
                          updatingAppointmentId === appointment.appointment_id ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All appointment requests have been processed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments?.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upcoming Appointments (Next 7 Days)
            </h3>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.patient_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.problem_description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
