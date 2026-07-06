import React, { useState, useEffect } from 'react';

import { useSession } from '../../../hooks/useSession';
import { SessionStatus } from '../SessionStatus/SessionStatus';

export const SessionTest: React.FC = () => {
  const { sessionInfo, extendSession, forceLogout, refreshToken } =
    useSession();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  useEffect(() => {
    addLog('Session test component mounted');
  }, []);

  useEffect(() => {
    addLog(`Session active: ${sessionInfo.isActive}`);
  }, [sessionInfo.isActive]);

  const handleExtendSession = () => {
    extendSession();
    addLog('Session extended manually');
  };

  const handleRefreshToken = async () => {
    addLog('Attempting token refresh...');
    try {
      const success = await refreshToken();
      addLog(`Token refresh ${success ? 'successful' : 'failed'}`);
    } catch (error) {
      addLog(`Token refresh error: ${error}`);
    }
  };

  const handleForceLogout = () => {
    addLog('Forcing logout...');
    forceLogout('Manual logout from test component');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Session Management Test</h2>

      {/* Session Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Session Status</h3>
        <SessionStatus showDetails={true} className="mb-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Active:</span>
            <span
              className={`ml-2 ${sessionInfo.isActive ? 'text-green-600' : 'text-red-600'}`}
            >
              {sessionInfo.isActive ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Time to Logout:</span>
            <span className="ml-2 text-blue-600">
              {formatTime(sessionInfo.timeUntilLogout)}
            </span>
          </div>
          <div>
            <span className="font-medium">Token Expires:</span>
            <span className="ml-2 text-purple-600">
              {formatTime(sessionInfo.timeUntilTokenExpiry)}
            </span>
          </div>
          <div>
            <span className="font-medium">Last Activity:</span>
            <span className="ml-2 text-gray-600">
              {new Date(sessionInfo.lastActivity).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Session Controls</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExtendSession}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Extend Session
          </button>
          <button
            onClick={handleRefreshToken}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Refresh Token
          </button>
          <button
            onClick={handleForceLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Force Logout
          </button>
        </div>
      </div>

      {/* Activity Simulation */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Activity Simulation</h3>
        <p className="text-sm text-gray-600 mb-3">
          Move your mouse, click, or type to simulate user activity. The session
          will automatically extend.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Mouse Activity</h4>
            <div
              className="h-20 bg-gray-100 rounded cursor-pointer flex items-center justify-center hover:bg-gray-200"
              onMouseMove={() => addLog('Mouse activity detected')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  addLog('Keyboard activity detected');
                }
              }}
            >
              Move mouse here
            </div>
          </div>
          <div className="p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Click Activity</h4>
            <button
              className="w-full h-20 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => addLog('Click activity detected')}
            >
              Click me
            </button>
          </div>
          <div className="p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Keyboard Activity</h4>
            <input
              type="text"
              placeholder="Type here..."
              className="w-full h-20 p-2 border rounded"
              onKeyPress={() => addLog('Keyboard activity detected')}
            />
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Activity Log</h3>
        <div className="h-64 overflow-y-auto bg-white rounded border p-3">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity logged yet...</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setLogs([])}
          className="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear Log
        </button>
      </div>
    </div>
  );
};
