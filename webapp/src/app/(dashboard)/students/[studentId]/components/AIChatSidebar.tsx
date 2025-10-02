'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendChatMessage,
  getTutorSettings,
  saveTeachingMethodology,
  deleteChatSession,
} from '@/app/actions/ai-tutor';
import type { AIChatSession, AIChatMessage } from '@/lib/types';

interface AIChatSidebarProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatSidebar({ studentId, studentName, isOpen, onClose }: AIChatSidebarProps) {
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMethodologyEditor, setShowMethodologyEditor] = useState(false);
  const [methodology, setMethodology] = useState('');
  const [isSavingMethodology, setIsSavingMethodology] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, studentId]);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function loadSessions() {
    const data = await getChatSessions(studentId);
    setSessions(data);

    if (data.length > 0) {
      setCurrentSession(data[0]);
    } else {
      await handleCreateSession();
    }
  }

  async function loadMessages(sessionId: string) {
    const data = await getChatMessages(sessionId);
    setMessages(data);
  }

  async function handleCreateSession() {
    const newSession = await createChatSession(studentId, 'New Conversation');
    if (newSession) {
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
    }
  }

  async function handleSendMessage() {
    if (!inputMessage.trim() || !currentSession || isSending) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    const tempUserMsg: AIChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSession.id,
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, tempUserMsg]);

    try {
      const result = await sendChatMessage(currentSession.id, studentId, userMsg);

      if (result.success && result.aiResponse) {
        await loadMessages(currentSession.id);

        // Reload sessions if title was auto-generated
        if (result.shouldGenerateTitle) {
          await loadSessions();
        }
      } else {
        alert(result.error || 'Failed to send message');
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
      setMessages(messages);
    } finally {
      setIsSending(false);
    }
  }

  async function handleOpenMethodologyEditor() {
    const settings = await getTutorSettings();
    if (settings) {
      setMethodology(settings.teachingMethodology);
    }
    setShowMethodologyEditor(true);
  }

  async function handleSaveMethodology() {
    setIsSavingMethodology(true);
    try {
      const result = await saveTeachingMethodology(methodology);
      if (result.success) {
        setShowMethodologyEditor(false);
        alert('Curriculum saved successfully!');
      } else {
        alert(result.error || 'Failed to save curriculum');
      }
    } catch (error) {
      console.error('Error saving methodology:', error);
      alert('Failed to save curriculum');
    } finally {
      setIsSavingMethodology(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;

    try {
      const result = await deleteChatSession(sessionId);
      if (result.success) {
        const updatedSessions = sessions.filter((s) => s.id !== sessionId);
        setSessions(updatedSessions);

        if (currentSession?.id === sessionId) {
          if (updatedSessions.length > 0) {
            setCurrentSession(updatedSessions[0]);
          } else {
            await handleCreateSession();
          }
        }
      } else {
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete conversation');
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Container - 70% width */}
      <div className="fixed inset-y-0 left-0 w-[70%] z-50 flex transition-transform duration-300 ease-out">

        {/* Left Panel - Sessions & Settings */}
        <div className="w-64 bg-slate-900 dark:bg-slate-950 flex flex-col border-r border-slate-700">
          {/* Header with padding for hamburger button */}
          <div className="p-4 border-b border-slate-700 pl-20">
            <h2 className="text-sm font-semibold text-white">AI Tutor</h2>
            <p className="text-xs text-slate-400 mt-0.5">{studentName}</p>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={handleCreateSession}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-750 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative rounded-lg transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-slate-800'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    onClick={() => setCurrentSession(session)}
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-200 pr-16"
                  >
                    <div className="truncate">{session.title}</div>
                  </button>
                  {currentSession?.id === session.id && (
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={handleOpenMethodologyEditor}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Curriculum
            </button>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Start a conversation</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  I know about the last 30 lessons for {studentName}
                </p>
              </div>
            )}

            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-white">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Thinking...</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask the AI tutor..."
                    disabled={isSending}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 disabled:opacity-50"
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className="flex-shrink-0 rounded-xl bg-slate-900 dark:bg-slate-700 p-3 text-white hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Editor Modal */}
      {showMethodologyEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Edit Teaching Curriculum</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Customize how the AI understands your teaching structure
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                rows={20}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700"
                placeholder="Enter your curriculum structure..."
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowMethodologyEditor(false)}
                disabled={isSavingMethodology}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMethodology}
                disabled={isSavingMethodology}
                className="rounded-lg bg-slate-900 dark:bg-slate-700 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                {isSavingMethodology ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

