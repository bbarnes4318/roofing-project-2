import React, { useState } from 'react';
import { Trophy, Medal, Award, Crown, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const Leaderboard = ({ colorMode }) => {
  const [timeframe, setTimeframe] = useState('weekly');
  
  // Mock data - in production, this would come from the API
  const leaderboardData = {
    weekly: [
      { id: 1, name: 'Sarah Johnson', points: 245, avatar: 'SJ', badges: 8, streak: 12 },
      { id: 2, name: 'Mike Chen', points: 198, avatar: 'MC', badges: 6, streak: 8 },
      { id: 3, name: 'Alex Rivera', points: 156, avatar: 'AR', badges: 5, streak: 15 },
      { id: 4, name: 'Emma Wilson', points: 134, avatar: 'EW', badges: 4, streak: 6 },
      { id: 5, name: 'David Kim', points: 112, avatar: 'DK', badges: 3, streak: 9 }
    ],
    monthly: [
      { id: 1, name: 'Alex Rivera', points: 892, avatar: 'AR', badges: 12, streak: 15 },
      { id: 2, name: 'Sarah Johnson', points: 756, avatar: 'SJ', badges: 10, streak: 12 },
      { id: 3, name: 'Mike Chen', points: 634, avatar: 'MC', badges: 8, streak: 8 },
      { id: 4, name: 'Emma Wilson', points: 523, avatar: 'EW', badges: 7, streak: 6 },
      { id: 5, name: 'David Kim', points: 445, avatar: 'DK', badges: 6, streak: 9 }
    ]
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return Crown;
      case 2:
        return Trophy;
      case 3:
        return Medal;
      default:
        return Award;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRankBgColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-200';
      case 3:
        return 'bg-gradient-to-r from-orange-100 to-orange-200';
      default:
        return colorMode ? 'bg-slate-700' : 'bg-gray-50';
    }
  };

  const currentData = leaderboardData[timeframe] || [];

  return (
    <div className={`p-3 rounded-lg border ${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
          🏆 Leaderboard
        </h3>
        <div className="flex space-x-1">
          {['weekly', 'monthly'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeframe === period
                  ? colorMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : colorMode
                  ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {Array.isArray(currentData) && currentData.map((user, index) => {
          const rank = index + 1;
          const RankIcon = getRankIcon(rank);
          const rankColor = getRankColor(rank);
          const rankBgColor = getRankBgColor(rank);

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-2 rounded border transition-all duration-200 hover:shadow-md ${rankBgColor} ${
                colorMode ? 'border-slate-600' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {/* Rank */}
                <div className="flex items-center justify-center w-6 h-6">
                  {rank <= 3 ? (
                    <RankIcon className={`h-4 w-4 ${rankColor}`} />
                  ) : (
                    <span className={`text-xs font-bold ${rankColor}`}>#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  colorMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {user.avatar}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'} truncate`}>
                    {user.name}
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className={`flex items-center space-x-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Star className="h-2 w-2" />
                      <span>{user.points.toLocaleString()}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Award className="h-2 w-2" />
                      <span>{user.badges}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <TrendingUp className="h-2 w-2" />
                      <span>{user.streak}d</span>
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.points?.toLocaleString() || '0'}
                  </div>
                  <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    points
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`mt-4 pt-4 border-t ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between text-sm">
          <span className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Updated {timeframe === 'weekly' ? 'this week' : 'this month'}
          </span>
          <button className={`text-blue-500 hover:text-blue-600 font-medium transition-colors`}>
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
