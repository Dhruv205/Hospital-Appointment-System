import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { appointmentAPI, patientAPI } from '../services/api';
import { Calendar, Clock, User, Plus, Search, Filter, CheckCircle, XCircle, Video } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Appointments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    problemDescription: '',
    symptoms: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    date: '',
  });

  // Fetch appointments based on user type
  const { data: appointmentsData, isLoading, error } = useQuery(
    ['appointments', filters, user?.userType],
    () => {
      if (user?.userType === 'patient') {
        return appointmentAPI.getPatientAppointments(filters);
      } else {
        return appointmentAPI.getDoctorAppointments(filters);
      }
    },
    {
      enabled: !!user?.userType, // Only fetch when user is loaded
    }
  );

  // Fetch available doctors for patients
  const { data: doctorsData } = useQuery(
    'availableDoctors',
    () => patientAPI.getDoctors(),
    {
      enabled: user?.userType === 'patient',
    }
  );

  // Fetch specializations
  const { data: specializationsData } = useQuery(
    'specializations',
    () => patientAPI.getSpecializations(),
    {
      enabled: user?.userType === 'patient',
    }
  );

  // Create appointment mutation (Patient)
  const createAppointmentMutation = useMutation(
    (payload) => appointmentAPI.create(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments');
        queryClient.invalidateQueries('patientDashboard');
        toast.success('Appointment request created successfully!');
        setShowBookingForm(false);
        setBookingForm({
          doctorId: '',
          appointmentDate: '',
          appointmentTime: '',
          problemDescription: '',
          symptoms: ''
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create appointment');
      }
    }
  );

  // Update appointment status mutation
  const updateStatusMutation = useMutation(
    ({ appointmentId, status, message }) =>
      appointmentAPI.updateStatus(appointmentId, { status, message }),
    {
      onSuccess: (response, variables) => {
        queryClient.invalidateQueries('appointments');
        queryClient.invalidateQueries('doctorDashboard');
        if (variables.status === 'rejected') {
          toast.success('Appointment rejected and deleted successfully!');
        } else {
          toast.success('Appointment status updated successfully!');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update appointment status');
      },
    }
  );

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation(
    (appointmentId) => appointmentAPI.cancel(appointmentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments');
        queryClient.invalidateQueries('patientDashboard');
        toast.success('Appointment cancelled successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to cancel appointment');
      },
    }
  );

  // Normalize API response: axios response structure is { data: { success: true, data: [...] } }
  // Handle both nested structure and direct array
  let rawAppointments = [];
  if (appointmentsData) {
    if (appointmentsData.data?.data && Array.isArray(appointmentsData.data.data)) {
      rawAppointments = appointmentsData.data.data;
    } else if (Array.isArray(appointmentsData.data)) {
      rawAppointments = appointmentsData.data;
    }
  }
  const appointments = Array.isArray(rawAppointments) ? rawAppointments : [];

  // Derived counts for patient view
  const totalCount = appointments.length;
  const upcomingCount = appointments.filter(a => new Date(a.appointment_date) >= new Date(new Date().toDateString())).length;
  const doctorsList = Array.from(
    new Map(((doctorsData?.data?.data) || []).map((d) => [d.doctor_id, d])).values()
  );

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

  const handleStatusUpdate = (appointmentId, status, message = '') => {
    updateStatusMutation.mutate({ appointmentId, status, message });
  };

  const handleCancelAppointment = (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelAppointmentMutation.mutate(appointmentId);
    }
  };

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
        <p className="text-red-600">Error loading appointments: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Appointments
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {user?.userType === 'patient'
              ? 'Manage your medical appointments'
              : 'Manage your patient appointments'}
          </p>
        </div>
        {user?.userType === 'patient' && (
          <div className="mt-4 md:mt-0 md:ml-4 flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total:</span> {totalCount}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Upcoming:</span> {upcomingCount}
            </div>
          </div>
        )}
        {user?.userType === 'patient' && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowBookingForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date-filter"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', date: '' })}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {user?.userType === 'patient'
                              ? `Dr. ${appointment.doctor_name}`
                              : appointment.patient_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {user?.userType === 'patient'
                              ? appointment.specialization
                              : appointment.patient_phone}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{formatDate(appointment.appointment_date)}</span>
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

                      {/* Show approval information for patients */}
                      {user?.userType === 'patient' && appointment.status === 'approved' && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-800">
                            <strong>✓ Approved by:</strong> Dr. {appointment.doctor_name}
                            {appointment.updated_at && (
                              <span className="text-green-600">
                                {' '}on {new Date(appointment.updated_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })} at {new Date(appointment.updated_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status === 'approved' && user?.userType === 'patient' && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {appointment.status}
                      </span>

                      {/* Action buttons based on user type and status */}
                      {user?.userType === 'doctor' && appointment.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleStatusUpdate(appointment.appointment_id, 'approved')
                            }
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(appointment.appointment_id, 'rejected')
                            }
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </button>
                        </div>
                      )}

                      {user?.userType === 'patient' && 
                       appointment.status === 'pending' && (
                        <button
                          onClick={() => handleCancelAppointment(appointment.appointment_id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      )}

                      {user?.userType === 'doctor' && 
                       appointment.status === 'approved' && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(appointment.appointment_id, 'completed')
                          }
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          Mark Complete
                        </button>
                      )}

                      {appointment.status === 'approved' && (
                        <Link
                          to={`/appointments/${appointment.appointment_id}/call`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <Video className="h-3.5 w-3.5 mr-1" />
                          Join Video Call
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.status || filters.date
                  ? 'Try adjusting your filters to see more appointments.'
                  : 'Get started by booking your first appointment.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Modal - Simplified for demo */}
      {showBookingForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Book New Appointment
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Doctor</label>
                    <select
                      value={bookingForm.doctorId}
                      onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a doctor</option>
                      {doctorsList.map((doc) => (
                        <option key={doc.doctor_id} value={doc.doctor_id}>
                          {`Dr. ${doc.doctor_name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <input
                        type="date"
                        value={bookingForm.appointmentDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Time</label>
                      <input
                        type="time"
                        value={bookingForm.appointmentTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, appointmentTime: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Problem Description</label>
                    <textarea
                      rows={3}
                      value={bookingForm.problemDescription}
                      onChange={(e) => setBookingForm({ ...bookingForm, problemDescription: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Describe your problem (min 10 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Symptoms (optional)</label>
                    <textarea
                      rows={2}
                      value={bookingForm.symptoms}
                      onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Symptoms (max 500 characters)"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBookingForm(false)}
                    className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (!bookingForm.doctorId || !bookingForm.appointmentDate || !bookingForm.appointmentTime || bookingForm.problemDescription.trim().length < 10) {
                        toast.error('Please fill all required fields and ensure description is at least 10 characters.');
                        return;
                      }
                      // Additional client-side validation for future date/time
                      const now = new Date();
                      const selectedDate = new Date(bookingForm.appointmentDate + 'T' + (bookingForm.appointmentTime.length === 5 ? bookingForm.appointmentTime + ':00' : bookingForm.appointmentTime));
                      if (!(selectedDate > now)) {
                        toast.error('Appointment must be scheduled for a future date and time.');
                        return;
                      }
                      const timeValue = bookingForm.appointmentTime.length === 5 ? bookingForm.appointmentTime + ':00' : bookingForm.appointmentTime;
                      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
                      if (!timeRegex.test(timeValue)) {
                        toast.error('Please enter a valid time in HH:MM format.');
                        return;
                      }
                      // Enforce clinic hours 08:00 - 18:00 inclusive (matches DB CHECK constraint)
                      const [hourStr, minuteStr] = timeValue.split(':');
                      const hour = parseInt(hourStr, 10);
                      const minute = parseInt(minuteStr, 10);
                      const minutesSinceMidnight = hour * 60 + minute;
                      const minMinutes = 8 * 60;   // 08:00
                      const maxMinutes = 18 * 60;  // 18:00
                      if (minutesSinceMidnight < minMinutes || minutesSinceMidnight > maxMinutes) {
                        toast.error('Please choose a time between 08:00 and 18:00.');
                        return;
                      }
                      createAppointmentMutation.mutate({
                        doctorId: parseInt(bookingForm.doctorId, 10),
                        appointmentDate: bookingForm.appointmentDate,
                        appointmentTime: timeValue.length === 8 ? timeValue.slice(0,5) : bookingForm.appointmentTime,
                        problemDescription: bookingForm.problemDescription.trim(),
                        symptoms: bookingForm.symptoms.trim() || undefined
                      });
                    }}
                    className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    disabled={createAppointmentMutation.isLoading}
                  >
                    {createAppointmentMutation.isLoading ? 'Booking...' : 'Book Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
