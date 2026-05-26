import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { appointmentAPI, chatAPI } from '../services/api';
import { ArrowLeft, User, Phone, Mail, FileText, CheckCircle2, ShieldAlert, MessageSquare, Send, Image, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const VideoCall = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [jitsiActive, setJitsiActive] = useState(false);
  const [apiReady, setApiReady] = useState(typeof window.JitsiMeetExternalAPI !== 'undefined');

  // State for Two-Way Chat Messaging
  const [activeTab, setActiveTab] = useState('chat'); // Default to Live Chat for quick messaging!
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Polling to detect when window.JitsiMeetExternalAPI becomes available
  useEffect(() => {
    if (apiReady) return;

    const interval = setInterval(() => {
      if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
        setApiReady(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [apiReady]);

  // 1. Fetch appointment details
  const { data: appointmentData, isLoading: isLoadingAppt, error } = useQuery(
    ['appointment', appointmentId],
    () => appointmentAPI.getById(appointmentId),
    {
      enabled: !!appointmentId,
    }
  );

  const appointment = appointmentData?.data?.data;

  // 2. Mutation to complete consultation
  const completeMutation = useMutation(
    () => appointmentAPI.updateStatus(appointmentId, { status: 'completed', message: 'Consultation completed successfully via video and chat.' }),
    {
      onSuccess: () => {
        toast.success('Consultation completed successfully!');
        queryClient.invalidateQueries(['appointment', appointmentId]);
        queryClient.invalidateQueries('appointments');
        navigate('/dashboard');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to complete consultation');
      }
    }
  );

  // 3. Initialize Jitsi Meet embedded frame
  useEffect(() => {
    if (!appointment || jitsiActive || !user || !apiReady) return;

    const domain = 'meet.jit.si';
    // Generate a robust and unique room name
    const roomName = `HospitalAppointment_${appointment.appointment_id}_${appointment.patient_id}_${appointment.doctor_id}`;

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: document.getElementById('jitsi-container'),
      userInfo: {
        displayName: user.userType === 'doctor'
          ? `Dr. ${user.firstName} ${user.lastName}`
          : `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true, // Avoid opening the mobile app redirect prompt on web
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'settings',
          'raisehand', 'videoquality', 'filmstrip', 'tileview',
          'videobackgroundblur', 'mute-everyone'
        ],
      }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    setJitsiActive(true);

    api.addEventListener('videoConferenceLeft', () => {
      toast.info('You left the video consultation.');
      navigate('/dashboard');
    });

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, [appointment, user, navigate, jitsiActive, apiReady]);

  // 4. Polling effect to sync two-way chat messages
  useEffect(() => {
    if (!appointmentId) return;

    const fetchMessages = async () => {
      try {
        const res = await chatAPI.getMessages(appointmentId);
        if (res.data?.success) {
          const freshMsgs = res.data.data || [];
          setMessages(freshMsgs);
        }
      } catch (err) {
        console.error('Failed to sync chat messages', err);
      }
    };

    fetchMessages(); // Run immediately on mount
    const interval = setInterval(fetchMessages, 3000); // Polling sync every 3 seconds

    return () => clearInterval(interval);
  }, [appointmentId]);

  // 5. Send message action
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !pendingImage) return;

    setIsSending(true);
    try {
      const payload = {
        messageText: newMessageText.trim() || null,
        image: pendingImage || null,
      };

      const res = await chatAPI.sendMessage(appointmentId, payload);
      if (res.data?.success) {
        setMessages((prev) => [...prev, res.data.data]);
        setNewMessageText('');
        setPendingImage(null);

        // Auto-scroll to bottom of chat
        setTimeout(() => {
          const chatBox = document.getElementById('chat-scroll-box');
          if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        }, 80);
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // 6. Handle image attachment
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImage(reader.result); // Base64 data URL string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteCall = () => {
    if (window.confirm('Are you sure you want to mark this consultation as completed? This will close the call.')) {
      completeMutation.mutate();
    }
  };

  if (isLoadingAppt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Securing connection and joining room...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-lg shadow-md text-center space-y-4 border border-red-100">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-gray-900">Access Denied / Room Not Found</h3>
        <p className="text-gray-500">We could not load the video room. Verify the appointment exists or that you have access.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </button>
      </div>
    );
  }

  // Determine who the "other party" is in the call
  const isDoctor = user?.userType === 'doctor';
  const otherPartyName = isDoctor ? appointment.patient_name : appointment.doctor_name;
  const otherPartyEmail = isDoctor ? appointment.patient_email : appointment.doctor_email;
  const otherPartyPhone = isDoctor ? appointment.patient_phone : appointment.doctor_phone;

  return (
    <div className="flex flex-col lg:flex-row h-[85vh] gap-6 bg-gray-50 p-2">
      {/* 1. Main Video Container */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl shadow-xl overflow-hidden relative border border-slate-800">
        <div className="bg-slate-950 px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-3.5 w-3.5 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-white font-medium text-sm md:text-base">
              Online Consultation Room with {otherPartyName}
            </h1>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Leave Room
          </button>
        </div>
        
        {/* WebRTC Video Canvas */}
        <div id="jitsi-container" className="flex-grow w-full min-h-[500px] lg:min-h-[550px] bg-slate-950" />
      </div>

      {/* 2. Side Panel - Information & Controls */}
      <div className="w-full lg:w-96 flex flex-col shrink-0">
        
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 flex flex-col h-full space-y-4 max-h-[80vh]">
          
          {/* Tab Navigation header */}
          <div className="flex border-b border-gray-100 pb-1">
            <button
              onClick={() => {
                setActiveTab('chat');
                // Force scroll chat box
                setTimeout(() => {
                  const chatBox = document.getElementById('chat-scroll-box');
                  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
                }, 80);
              }}
              className={`flex-1 pb-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all ${
                activeTab === 'chat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Message Chat
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 pb-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isDoctor ? 'Patient Info & Notes' : 'Doctor Info & Notes'}
            </button>
          </div>

          {/* TAB 1: LIVE MESSAGE CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-grow flex flex-col min-h-0">
              
              {/* Chat Scroll Container */}
              <div
                id="chat-scroll-box"
                className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 max-h-[380px]"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 space-y-2.5">
                    <MessageSquare className="h-10 w-10 text-gray-300 animate-pulse" />
                    <p className="text-xs font-medium">No messages yet. Send a note or attach a photo below!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = String(msg.sender_type) === String(user?.userType);
                    return (
                      <div
                        key={msg.message_id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] text-gray-400 font-semibold mb-0.5 px-1 capitalize">
                          {isOwn ? 'You' : msg.sender_type}
                        </span>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm transition-all ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                          }`}
                        >
                          {msg.message_text && (
                            <p className="text-xs leading-relaxed break-words">{msg.message_text}</p>
                          )}

                          {msg.image_url && (
                            <div className="mt-1.5 rounded-lg overflow-hidden border border-black/5 max-w-[200px]">
                              <img
                                src={`http://localhost:5000${msg.image_url}`}
                                alt="Attached scan"
                                className="w-full h-auto max-h-[160px] object-cover cursor-zoom-in hover:opacity-95"
                                onClick={() => window.open(`http://localhost:5000${msg.image_url}`, '_blank')}
                                onError={(e) => {
                                  e.target.src = msg.image_url;
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-[9px] text-gray-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pending Photo Preview Frame */}
              {pendingImage && (
                <div className="relative mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <img
                      src={pendingImage}
                      alt="Upload preview"
                      className="h-10 w-10 object-cover rounded-md border border-slate-300"
                    />
                    <span className="text-[10px] text-gray-500 font-semibold">Photo ready to upload</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="mt-3 flex items-center space-x-2 shrink-0 border-t border-gray-100 pt-3">
                <input
                  type="file"
                  id="chat-photo-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('chat-photo-input').click()}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Attach Photo / File"
                >
                  <Image className="h-4.5 w-4.5" />
                </button>
                
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                
                <button
                  type="submit"
                  disabled={isSending || (!newMessageText.trim() && !pendingImage)}
                  className="p-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

            </div>
          )}

          {/* TAB 2: CONSULTATION DETAILS & SYMPTOMS */}
          {activeTab === 'details' && (
            <div className="flex-grow flex flex-col space-y-4 overflow-y-auto max-h-[380px] pr-1">
              {/* Other Party Profile Card */}
              <div className="flex items-start space-x-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                    {isDoctor ? 'Patient Profile' : 'Consulting Doctor'}
                  </p>
                  <h3 className="font-bold text-gray-900 truncate">{otherPartyName}</h3>
                  
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span className="truncate">{otherPartyEmail}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>{otherPartyPhone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problem & Symptoms logs */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-semibold text-gray-900">
                  <FileText className="h-4 w-4 mr-1.5 text-blue-500" />
                  <span>Symptom / Notes Log</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2 max-h-[160px] overflow-y-auto">
                  <p><strong>Chief Complaint:</strong> {appointment.problem_description || 'N/A'}</p>
                  {appointment.symptoms && (
                    <p><strong>Associated Symptoms:</strong> {appointment.symptoms}</p>
                  )}
                  {appointment.specialization && (
                    <p className="pt-2 border-t border-gray-200/60">
                      <strong>Specialization:</strong> {appointment.specialization}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons (always visible at bottom) */}
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-3 shrink-0">
            {isDoctor && appointment.status === 'approved' && (
              <button
                onClick={handleCompleteCall}
                disabled={completeMutation.isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {completeMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Consultation
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VideoCall;
