import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationAPI } from '../services/api';
import { Bell, Check, Trash2, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Notifications = () => {
  const queryClient = useQueryClient();
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery(
    'notifications',
    () => notificationAPI.getAll({ limit: 50 })
  );

  // Fetch unread count
  const { data: unreadData } = useQuery(
    'unreadCount',
    () => notificationAPI.getUnreadCount()
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (notificationId) => notificationAPI.markAsRead(notificationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
        queryClient.invalidateQueries('unreadCount');
        toast.success('Notification marked as read');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to mark notification as read');
      },
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => notificationAPI.markAllAsRead(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
        queryClient.invalidateQueries('unreadCount');
        toast.success('All notifications marked as read');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to mark all notifications as read');
      },
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => notificationAPI.delete(notificationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
        queryClient.invalidateQueries('unreadCount');
        toast.success('Notification deleted');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete notification');
      },
    }
  );

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadData?.data?.unreadCount || 0;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_approved':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'appointment_rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'appointment_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'doctor_message':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type, isRead) => {
    if (isRead) {
      return 'bg-gray-50 border-gray-200';
    }

    switch (type) {
      case 'appointment_approved':
        return 'bg-green-50 border-green-200';
      case 'appointment_rejected':
        return 'bg-red-50 border-red-200';
      case 'appointment_reminder':
        return 'bg-blue-50 border-blue-200';
      case 'doctor_message':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (notificationId) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(notificationId => {
      markAsReadMutation.mutate(notificationId);
    });
    setSelectedNotifications([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedNotifications.length} notifications?`)) {
      selectedNotifications.forEach(notificationId => {
        deleteNotificationMutation.mutate(notificationId);
      });
      setSelectedNotifications([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Stay updated with your appointment notifications
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Notifications</p>
                <p className="text-2xl font-bold text-blue-900">{notifications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Unread</p>
                <p className="text-2xl font-bold text-yellow-900">{unreadCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Read</p>
                <p className="text-2xl font-bold text-green-900">{notifications.length - unreadCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-700">
              {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkMarkAsRead}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark as Read
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </button>
              <button
                onClick={() => setSelectedNotifications([])}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`border rounded-lg p-4 ${getNotificationColor(notification.notification_type, notification.is_read)}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedNotifications.includes(notification.notification_id)}
                            onChange={() => handleSelectNotification(notification.notification_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <p className={`text-sm font-medium ${
                              notification.is_read ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.notification_id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.notification_id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                You'll receive notifications about your appointments here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
