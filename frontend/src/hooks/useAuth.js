import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      authAPI.getProfile()
        .then(response => {
          if (response.data.success) {
            setUser(response.data.data);
          } else {
            // Invalid response, clear token and user
            localStorage.removeItem('token');
            setUser(null);
          }
        })
        .catch((error) => {
          console.debug('Profile fetch failed', error?.response?.status, error?.response?.data);
          // If it's an auth error (401/403) or the error has isAuthError flag, clear the token
          if (error.response?.status === 401 || error.response?.status === 403 || error.isAuthError) {
            localStorage.removeItem('token');
          }
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const loginMutation = useMutation(authAPI.login, {
    onSuccess: (response) => {
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem('token', token);
        setUser(userData);
        toast.success('Login successful!');
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  });

  const registerMutation = useMutation(authAPI.register, {
    onSuccess: (response) => {
      if (response.data.success) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem('token', token);
        setUser(userData);
        toast.success('Registration successful!');
      } else {
        toast.error(response.data.message || 'Registration failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  });

  const updateProfileMutation = useMutation(authAPI.updateProfile, {
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        queryClient.invalidateQueries('profile');
      } else {
        toast.error(response.data.message || 'Profile update failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Profile update failed');
    }
  });

  const changePasswordMutation = useMutation(authAPI.changePassword, {
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Password changed successfully!');
      } else {
        toast.error(response.data.message || 'Password change failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Password change failed');
    }
  });

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    queryClient.clear();
    toast.success('Logged out successfully!');
  };

  const value = {
    user,
    loading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    isUpdatingProfile: updateProfileMutation.isLoading,
    isChangingPassword: changePasswordMutation.isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
