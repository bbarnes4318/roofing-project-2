import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Target, Award, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GamificationWidget = ({ userProfile, colorMode }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [recentBadge, setRecentBadge] = useState(null);

  useEffect(() => {
    if (userProfile?.recentBadge) {
      setRecentBadge(userProfile.recentBadge);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [userProfile?.recentBadge]);

  if (!userProfile || typeof userProfile !== 'object') {
    return (
      <div className={`p-4 rounded-xl border ${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="animate-pulse">
          <div className={`h-4 w-24 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'} mb-2`}></div>
          <div className={`h-3 w-16 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        </div>
      </div>
    );
  }

  const { points = 0, level = 0, badges = [], streak = 0, recentActivity = [] } = userProfile || {};
  const nextLevelPoints = (level + 1) * 100;
  const progressPercentage = nextLevelPoints > 0 ? (points / nextLevelPoints) * 100 : 0;

  const getLevelTitle = (level) => {
    if (level < 5) return 'Newcomer';
    if (level < 10) return 'Contributor';
    if (level < 20) return 'Expert';
    if (level < 50) return 'Champion';
    return 'Legend';
  };

  const getLevelColor = (level) => {
    if (level < 5) return 'gray';
    if (level < 10) return 'green';
    if (level < 20) return 'blue';
    if (level < 50) return 'purple';
    return 'gold';
  };

  const levelColor = getLevelColor(level);

  return (
    <div className="relative">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && recentBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-2xl"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Badge Earned!</h3>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{recentBadge.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{recentBadge.name}</div>
                    <div className="text-sm text-gray-600">{recentBadge.description}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`p-6 rounded-xl border ${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
            Your Progress
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${levelColor}-100 text-${levelColor}-800`}>
            Level {level}
          </div>
        </div>

        {/* Points and Level */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              {points?.toLocaleString() || '0'}
            </span>
            <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {getLevelTitle(level)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r from-${levelColor}-400 to-${levelColor}-600`}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {points?.toLocaleString() || '0'} points
            </span>
            <span className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {nextLevelPoints?.toLocaleString() || '100'} for next level
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg ${colorMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <Zap className={`h-4 w-4 text-yellow-500`} />
              <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Streak
              </span>
            </div>
            <div className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              {streak || 0} days
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${colorMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-2">
              <Award className={`h-4 w-4 text-purple-500`} />
              <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Badges
              </span>
            </div>
            <div className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              {Array.isArray(badges) ? badges.length : 0}
            </div>
          </div>
        </div>

        {/* Recent Badges */}
        {Array.isArray(badges) && badges.length > 0 && (
          <div className="mb-4">
            <h4 className={`text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Recent Badges
            </h4>
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 3).map((badge, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg ${colorMode ? 'bg-slate-700' : 'bg-gray-100'} flex items-center space-x-2`}
                  title={badge.description}
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className={`text-xs font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    {badge.name}
                  </span>
                </div>
              ))}
              {badges.length > 3 && (
                <div className={`p-2 rounded-lg ${colorMode ? 'bg-slate-700' : 'bg-gray-100'} flex items-center`}>
                  <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    +{badges.length - 3} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {Array.isArray(recentActivity) && recentActivity.length > 0 && (
          <div>
            <h4 className={`text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Recent Activity
            </h4>
            <div className="space-y-2">
              {recentActivity.slice(0, 3).map((activity, index) => (
                <div key={index} className={`flex items-center space-x-2 text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{activity.description}</span>
                  <span className="text-xs">+{activity.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className={`mt-4 p-3 rounded-lg ${colorMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className={`text-sm font-medium ${colorMode ? 'text-blue-300' : 'text-blue-800'}`}>
              Keep contributing to earn more badges!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationWidget;
