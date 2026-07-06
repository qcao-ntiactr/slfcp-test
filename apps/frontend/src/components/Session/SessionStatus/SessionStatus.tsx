import React from 'react';

import { useSession } from '../../../hooks/useSession';

interface SessionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { sessionInfo, extendSession, refreshToken } = useSession();

  const formatTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return '0:00';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    const timeUntilLogout = sessionInfo.timeUntilLogout;
    if (timeUntilLogout <= 5 * 60 * 1000) return 'text-red-600'; // 5 minutes or less
    if (timeUntilLogout <= 10 * 60 * 1000) return 'text-yellow-600'; // 10 minutes or less
    return 'text-green-600';
  };

  const getTokenStatusColor = () => {
    const timeUntilExpiry = sessionInfo.timeUntilTokenExpiry;
    if (timeUntilExpiry <= 10 * 60 * 1000) return 'text-red-600'; // 10 minutes or less
    if (timeUntilExpiry <= 30 * 60 * 1000) return 'text-yellow-600'; // 30 minutes or less
    return 'text-green-600';
  };

  if (!sessionInfo.isActive) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Session Status Indicator */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${sessionInfo.isActive ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className="text-sm text-gray-600">
          {sessionInfo.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {showDetails && (
        <>
          {/* Time until logout */}
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {formatTime(sessionInfo.timeUntilLogout)}
            </span>
            <span className="text-xs text-gray-500">until logout</span>
          </div>

          {/* Token expiry */}
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <span className={`text-sm font-medium ${getTokenStatusColor()}`}>
              {formatTime(sessionInfo.timeUntilTokenExpiry)}
            </span>
            <span className="text-xs text-gray-500">token expires</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={extendSession}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              title="Extend session"
            >
              Extend
            </button>
            <button
              onClick={refreshToken}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              title="Refresh token"
            >
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
};
