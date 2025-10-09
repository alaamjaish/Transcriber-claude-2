'use client';

/**
 * AI Agent Test Playground - Client Component
 * Test the hybrid RAG + SQL agent in real-time
 */

import { useState } from 'react';
import { testAgentAction } from '@/app/actions/agent';
import type { Student } from '@/lib/types';

interface AITestClientProps {
  students: Student[];
}

export function AITestClient({ students }: AITestClientProps) {
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const exampleQueries = [
    'آخر 5 دروس',
    'last 10 lessons',
    'متى تعلمنا شباك؟',
    'lessons about food',
    'دروس آخر 3 شهور',
    'all vocab from last 2 months',
    'أعطني واجب من آخر 3 دروس',
    'summarize the last month',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      // Use selected student from dropdown
      const response = await testAgentAction(query, selectedStudentId);
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🤖 AI Agent Test Playground</h1>
        <p className="text-gray-600 mb-8">
          Test the hybrid RAG + SQL intelligent agent. Try temporal queries (SQL) or semantic searches (RAG).
        </p>

        {/* Example Queries */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Example Queries:</h2>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Student Selector */}
        {students.length > 0 ? (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Select Student:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isLoading}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No students found. Please create a student first.</p>
          </div>
        )}

        {/* Query Form */}
        <form onSubmit={handleSubmit} className="mb-8 space-y-3">
          {/* Query Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question (Arabic or English)..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Running...' : 'Run Agent'}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {result.success ? (
              <>
                {/* Response */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">📝 Response</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{String(result.response)}</p>
                  </div>
                </div>

                {/* Tool Calls */}
                {result.toolCalls && Array.isArray(result.toolCalls) && result.toolCalls.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">🔧 Tool Calls</h3>
                    <div className="space-y-2">
                      {(result.toolCalls as Array<Record<string, unknown>>).map((step, idx: number) => (
                        <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                          <p className="font-mono text-sm">
                            <span className="font-semibold">{String(step.toolName || 'Tool')}</span>
                            {step.toolCallId ? (
                              <span className="text-gray-500 ml-2">({String(step.toolCallId)})</span>
                            ) : null}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Stats */}
                {result.usage && typeof result.usage === 'object' && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">📊 Token Usage</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Prompt</p>
                        <p className="text-xl font-semibold">{Number((result.usage as Record<string, unknown>).promptTokens || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Completion</p>
                        <p className="text-xl font-semibold">{Number((result.usage as Record<string, unknown>).completionTokens || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-xl font-semibold">{Number((result.usage as Record<string, unknown>).totalTokens || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cost Estimate */}
                {result.usage && typeof result.usage === 'object' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">💰 Cost Estimate</h3>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm">
                        Estimated cost:{' '}
                        <span className="font-semibold">
                          $
                          {(
                            (Number((result.usage as Record<string, unknown>).promptTokens || 0) * 0.003) / 1000 +
                            (Number((result.usage as Record<string, unknown>).completionTokens || 0) * 0.015) / 1000
                          ).toFixed(4)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        (Claude 3.5 Sonnet: $3/MTok input, $15/MTok output)
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h3>
                <p className="text-red-600">{String(result.error)}</p>
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">ℹ️ How It Works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>SQL Tools:</strong> Use for precise temporal queries (&quot;last 10 lessons&quot;, &quot;lessons from
              September&quot;)
            </li>
            <li>
              <strong>RAG Tools:</strong> Use for semantic searches (&quot;when did we learn window?&quot;, &quot;lessons about
              food&quot;)
            </li>
            <li>
              <strong>Generation Tools:</strong> The agent retrieves relevant lessons first, then generates content
            </li>
            <li>
              <strong>Smart Decision:</strong> The agent automatically chooses the right tool based on your query
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
