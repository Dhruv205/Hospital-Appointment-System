import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { User, Mail, Phone, Calendar, MapPin, Shield, DollarSign, Award } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, changePassword, isUpdatingProfile, isChangingPassword } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Fetch profile data
  const { data: profileData, isLoading } = useQuery(
    'profile',
    () => authAPI.getProfile(),
    {
      enabled: !!user,
    }
  );

  const profile = profileData?.data || {};

  const {
    register: registerPersonal,
    handleSubmit: handleSubmitPersonal,
    formState: { errors: personalErrors },
    reset: resetPersonal,
  } = useForm({
    defaultValues: profile,
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm();

  // Update form when profile data changes
  React.useEffect(() => {
    if (profile) {
      resetPersonal(profile);
    }
  }, [profile, resetPersonal]);

  const onPersonalSubmit = (data) => {
    updateProfile(data);
  };

  const onPasswordSubmit = (data) => {
    changePassword(data);
    setShowPasswordForm(false);
    resetPassword();
  };

  const tabs = [
    { id: 'personal', name: 'Personal Information', icon: User },
    { id: 'password', name: 'Change Password', icon: Shield },
  ];

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
            Profile Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {user?.userType}
              </p>
              <p className="text-sm text-gray-500">
                {profile.email}
              </p>
            </div>

            {/* Profile Stats */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span>{profile.phone}</span>
              </div>
              {profile.date_of_birth && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{new Date(profile.date_of_birth).toLocaleDateString()}</span>
                </div>
              )}
              {profile.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="truncate">{profile.address}</span>
                </div>
              )}
              {profile.consultation_fee && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>${profile.consultation_fee}</span>
                </div>
              )}
              {profile.experience_years && (
                <div className="flex items-center text-sm text-gray-600">
                  <Award className="h-4 w-4 mr-2" />
                  <span>{profile.experience_years} years experience</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Forms */}
        <div className="lg:col-span-3">
          <div className="bg-white shadow rounded-lg">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'personal' && (
                <form onSubmit={handleSubmitPersonal(onPersonalSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        {...registerPersonal('firstName', {
                          required: 'First name is required',
                          minLength: {
                            value: 2,
                            message: 'First name must be at least 2 characters',
                          },
                        })}
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {personalErrors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{personalErrors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        {...registerPersonal('lastName', {
                          required: 'Last name is required',
                          minLength: {
                            value: 2,
                            message: 'Last name must be at least 2 characters',
                          },
                        })}
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {personalErrors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{personalErrors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      {...registerPersonal('phone', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[\+]?[1-9][\d]{0,15}$/,
                          message: 'Invalid phone number',
                        },
                      })}
                      type="tel"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {personalErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{personalErrors.phone.message}</p>
                    )}
                  </div>

                  {user?.userType === 'patient' && (
                    <>
                      <div>
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                          Date of Birth
                        </label>
                        <input
                          {...registerPersonal('dateOfBirth')}
                          type="date"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                          Gender
                        </label>
                        <select
                          {...registerPersonal('gender')}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Address
                        </label>
                        <textarea
                          {...registerPersonal('address')}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </>
                  )}

                  {user?.userType === 'doctor' && (
                    <>
                      <div>
                        <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
                          License Number
                        </label>
                        <input
                          {...registerPersonal('licenseNumber', {
                            required: 'License number is required',
                          })}
                          type="text"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {personalErrors.licenseNumber && (
                          <p className="mt-1 text-sm text-red-600">{personalErrors.licenseNumber.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-700">
                            Experience (Years)
                          </label>
                          <input
                            {...registerPersonal('experienceYears', {
                              required: 'Experience is required',
                              min: { value: 0, message: 'Experience must be 0 or more' },
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="0"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                          {personalErrors.experienceYears && (
                            <p className="mt-1 text-sm text-red-600">{personalErrors.experienceYears.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="consultationFee" className="block text-sm font-medium text-gray-700">
                            Consultation Fee ($)
                          </label>
                          <input
                            {...registerPersonal('consultationFee', {
                              required: 'Consultation fee is required',
                              min: { value: 0, message: 'Fee must be 0 or more' },
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                          {personalErrors.consultationFee && (
                            <p className="mt-1 text-sm text-red-600">{personalErrors.consultationFee.message}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isUpdatingProfile ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <Shield className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Change Password
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          For security reasons, you'll need to enter your current password to change it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-6">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        {...registerPassword('currentPassword', {
                          required: 'Current password is required',
                        })}
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        {...registerPassword('newPassword', {
                          required: 'New password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {passwordErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        {...registerPassword('confirmPassword', {
                          required: 'Please confirm your new password',
                          validate: (value) =>
                            value === registerPassword('newPassword') || 'Passwords do not match',
                        })}
                        type="password"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isChangingPassword ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          'Change Password'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
