import React, { useState } from 'react';
import { Bell, X, Check, MessageCircle, ThumbsUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ notifications, colorMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return MessageCircle;
      case 'vote':
        return ThumbsUp;
      case 'status_change':
        return CheckCircle;
      case 'bug':
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'comment':
        return 'text-blue-500';
      case 'vote':
        return 'text-green-500';
      case 'status_change':
        return 'text-purple-500';
      case 'bug':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const markAsRead = (notificationId) => {
    // In production, this would call the API
    console.log('Marking notification as read:', notificationId);
  };

  const markAllAsRead = () => {
    // In production, this would call the API
    console.log('Marking all notifications as read');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          colorMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
        }`}
      >
        <Bell className={`h-6 w-6 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 top-full mt-2 w-80 ${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={`text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded ${colorMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications && notifications.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {notifications.slice(0, 10).map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? (colorMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 ${iconColor}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className={`text-xs ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className={`h-12 w-12 mx-auto mb-4 ${colorMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <h3 className={`text-lg font-medium ${colorMode ? 'text-gray-300' : 'text-gray-900'} mb-2`}>
                    No notifications
                  </h3>
                  <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications && notifications.length > 10 && (
              <div className={`p-4 border-t ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <button className={`w-full text-sm ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
