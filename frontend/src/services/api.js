import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Do not hard-redirect here to avoid refresh loops; let callers decide
      // Attach a flag so callers can handle auth errors consistently
      error.isAuthError = true;
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// Patient API
export const patientAPI = {
  getDashboard: () => api.get('/patients/dashboard'),
  getDoctors: (params) => api.get('/patients/doctors', { params }),
  getSpecializations: () => api.get('/patients/specializations'),
  getAppointmentHistory: (params) => api.get('/patients/appointments/history', { params }),
};

// Doctor API
export const doctorAPI = {
  getDashboard: () => api.get('/doctors/dashboard'),
  getSpecializations: () => api.get('/doctors/specializations'),
  addSpecialization: (data) => api.post('/doctors/specializations', data),
  getPatients: (params) => api.get('/doctors/patients', { params }),
  getSchedule: (date) => api.get(`/doctors/schedule/${date}`),
  getPerformance: (params) => api.get('/doctors/performance', { params }),
};

// Appointment API
export const appointmentAPI = {
  create: (data) => api.post('/appointments', data),
  getPatientAppointments: (params) => api.get('/appointments/patient', { params }),
  getDoctorAppointments: (params) => api.get('/appointments/doctor', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
  autoAssign: (data) => api.post('/appointments/auto-assign', data),
  getStats: (params) => api.get('/appointments/stats/overview', { params }),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
  sendMessage: (data) => api.post('/notifications/send-message', data),
};

// Chat API
export const chatAPI = {
  getMessages: (appointmentId) => api.get(`/chat/${appointmentId}`),
  sendMessage: (appointmentId, data) => api.post(`/chat/${appointmentId}`, data),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getAppointments: (params) => api.get('/admin/appointments', { params }),
  getLogs: (params) => api.get('/admin/logs', { params }),
  createSpecialization: (data) => api.post('/admin/specializations', data),
  deleteUser: (id, userType) => api.delete(`/admin/users/${id}`, { data: { userType } }),
};

export default api;
