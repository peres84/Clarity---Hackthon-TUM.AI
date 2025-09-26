// src/components/DebugConsole.tsx
// Debug console component for monitoring API responses and voice expressions

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface DebugLog {
  id: string;
  timestamp: Date;
  type: 'tts' | 'stt' | 'agent' | 'websocket' | 'error';
  title: string;
  data: any;
  voiceTags?: string[];
}

interface DebugConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ isVisible, onToggle }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Add debug log method
  const addLog = (type: DebugLog['type'], title: string, data: any, voiceTags?: string[]) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      title,
      data,
      voiceTags
    };

    setLogs(prev => [...prev, newLog]);
  };

  // Expose addLog function globally for use by services
  useEffect(() => {
    (window as any).debugConsole = { addLog };
    return () => {
      delete (window as any).debugConsole;
    };
  }, []);

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setExpandedLogs(new Set());
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const getTypeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'tts': return 'bg-blue-500';
      case 'stt': return 'bg-green-500';
      case 'agent': return 'bg-purple-500';
      case 'websocket': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Debug Console</h3>
          <span className="text-xs text-gray-400">
            {logs.length} logs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Clear logs"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Close console"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            No debug logs yet. Start using the application to see API responses here.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            return (
              <div key={log.id} className="bg-gray-800 rounded border border-gray-700">
                {/* Log header */}
                <div
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-750"
                  onClick={() => toggleLog(log.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx('w-2 h-2 rounded-full', getTypeColor(log.type))} />
                    <span className="font-mono text-xs text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className="font-medium">{log.title}</span>
                    {log.voiceTags && log.voiceTags.length > 0 && (
                      <div className="flex gap-1">
                        {log.voiceTags.map((tag, idx) => (
                          <span key={idx} className="bg-purple-600 text-xs px-1 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(JSON.stringify(log.data, null, 2));
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                      title="Copy data"
                    >
                      <Copy size={12} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded data */}
                {isExpanded && (
                  <div className="p-2 pt-0">
                    <pre className="bg-gray-900 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

// Debug console toggle button
export const DebugToggle: React.FC<{ onToggle: () => void; isVisible: boolean }> = ({ onToggle, isVisible }) => {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'fixed bottom-4 right-4 p-3 rounded-full shadow-lg transition-all z-40',
        'text-white font-mono text-sm',
        isVisible
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-gray-800 hover:bg-gray-700'
      )}
      title="Toggle Debug Console"
    >
      {isVisible ? 'Hide' : 'Debug'}
    </button>
  );
};