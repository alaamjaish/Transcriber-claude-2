# Network Disconnection & Reconnection Research
## Soniox Real-Time Audio Streaming Resilience

**Research Date:** November 7, 2025
**Status:** Planning Phase - Ready for Implementation
**Priority:** CRITICAL
**Update:** November 7, 2025 - Added key insight about session continuity

---

## 🎯 KEY INSIGHT - THE SIMPLE SOLUTION

**CRITICAL UNDERSTANDING:** We DON'T need complex multi-connection architectures!

### The Core Concept (Simple!)

```
ONE Student Session (in our database)
         ↓
MULTIPLE Soniox WebSocket Sessions (when network drops & reconnects)
         ↓
ALL transcripts merge into ONE student session
         ↓
User sees: CONTINUOUS recording (no interruption!)
```

### What This Means

**From the User's Perspective:**
- Click "Start Recording" → Recording begins
- Internet drops → Recording continues (user barely notices)
- Internet reconnects → Recording continues seamlessly
- Click "Stop Recording" → ONE complete transcript

**Behind the Scenes:**
- Student Session #123 created in database
- Soniox WebSocket Connection A established
- Internet drops → Connection A dies
- **Keep recording audio locally (buffer it!)**
- Internet reconnects → Open NEW Soniox Connection B
- **Send buffered audio to Connection B**
- Both Connection A and B transcripts → Student Session #123
- User sees continuous transcript ✅

### The ONLY Challenge: The Gap

**During disconnection:**
- Teacher keeps talking
- Audio must be saved locally (browser memory)
- When reconnected, replay that audio to new Soniox session
- This is what **Solution #1 (Audio Buffering + Auto-Reconnect)** does!

### Why This Works

**Soniox Pricing Model:**
- Charges per **audio duration** (tokens), NOT per session
- $2.00 per 1M input audio tokens for real-time streaming
- ~$0.12 per hour of audio
- Multiple sessions processing same audio = SAME COST (no duplication!)

**Database Structure:**
```sql
student_sessions table:
  id: 123
  student_id: 456
  status: recording

transcript_segments table:
  id: 1, session_id: 123, text: "Hello class", source: "soniox_A"
  id: 2, session_id: 123, text: "today we", source: "soniox_A"
  [DISCONNECT]
  [RECONNECT - NEW SONIOX SESSION]
  id: 3, session_id: 123, text: "learn math", source: "soniox_B"
  id: 4, session_id: 123, text: "and science", source: "soniox_B"
```

**Result:** User queries `session_id: 123` → Gets complete transcript from both sources merged!

---

## 1. The Problem Statement

### Issue Overview
The application experiences **complete recording failure** when network connectivity is interrupted during active audio recording sessions. This creates a catastrophic user experience where:

- Any Wi-Fi switch or network change stops the recording entirely
- Brief internet disconnections (even 1-2 seconds) terminate the session
- Users lose entire recording sessions without warning
- No automatic recovery mechanism exists
- All in-memory transcript data is permanently lost

### Business Impact
- **User frustration:** Students lose lesson recordings after network hiccups
- **Data loss:** No transcript recovery after disconnection
- **Unreliable service:** Cannot be trusted for important recordings
- **Poor UX:** No feedback or recovery options for users

### Technical Impact
- WebSocket connection to Soniox terminates permanently
- In-memory transcript segments are lost
- Audio recording stops (no continuation)
- User must manually restart entire recording session
- No buffering or queuing mechanism exists

---

## 2. Current System Flow

### Architecture Overview

**Recording Modes:**
1. **Demo Mode** (Simple)
   - MediaRecorder API
   - WebM format recording
   - 3-minute maximum duration
   - IP-based rate limiting (3 trials/day)
   - File uploaded after recording completes

2. **Advanced Mode** (Real-Time Streaming)
   - Web Audio API with 48kHz mixing
   - Microphone + system audio support
   - Real-time Soniox WebSocket streaming
   - Live transcription with speaker diarization
   - **This is where the disconnection problem occurs**

### Current Real-Time Recording Flow

```
User clicks "Start Recording"
         ↓
Initialize Audio Context (Web Audio API)
         ↓
Request microphone permissions
         ↓
Fetch Soniox temporary token (1-hour validity)
         ↓
Establish WebSocket connection to Soniox
  (wss://stt-rt.soniox.com/transcribe-websocket)
         ↓
Start capturing audio chunks
         ↓
Stream audio chunks → Soniox WebSocket
         ↓
Receive real-time transcription results
         ↓
Display live transcript to user
         ↓
User clicks "Stop Recording"
         ↓
Finalize WebSocket connection
         ↓
Save transcript to database
```

### What Happens During Network Disconnection

```
Recording in progress...
         ↓
Network disconnects (Wi-Fi change, signal loss, etc.)
         ↓
WebSocket connection drops
         ↓
❌ WebSocket onError event fires
         ↓
❌ Connection terminates permanently
         ↓
❌ Audio streaming stops
         ↓
❌ All in-memory transcript segments LOST
         ↓
❌ User sees error or frozen UI
         ↓
❌ No recovery mechanism
         ↓
User must start over completely
```

### Key Components Involved

**1. useSonioxStream.ts**
- Location: `webapp/src/hooks/useSonioxStream.ts`
- Manages WebSocket connection to Soniox
- Handles audio chunk streaming
- Receives and processes transcription results
- **CRITICAL FLAW:** No reconnection logic

**2. useSonioxToken.ts**
- Location: `webapp/src/hooks/useSonioxToken.ts`
- Fetches temporary API tokens (1-hour validity)
- Server-side generation via `/api/soniox/token`
- Token expires after 1 hour (no refresh mechanism)

**3. useAudioMixer.ts**
- Location: `webapp/src/hooks/useAudioMixer.ts`
- Web Audio API integration
- Mixes microphone + system audio
- 48kHz sample rate processing
- Continues capturing even when WebSocket fails (audio is lost)

**4. StudentRecordingInterface.tsx**
- Location: `webapp/src/components/recording/StudentRecordingInterface.tsx`
- Main recording UI component
- Displays live transcription
- Shows recording status
- **ISSUE:** No connection status indicator

**5. Backend Token Generation**
- Location: `webapp/src/lib/soniox.ts`
- Generates 1-hour temporary tokens
- API endpoint: `/api/soniox/token`
- No token refresh capability during active sessions

### Current Error Handling

**Existing Error Callbacks:**
- `onError` - Fires when WebSocket errors occur
- `onStateChange` - Tracks connection state changes
- No automatic retry mechanism
- No user-facing reconnection UI
- No audio buffering during failures

---

## 3. Research Results

### A. Soniox Technical Capabilities Analysis

#### WebSocket Connection Details
- **Endpoint:** `wss://stt-rt.soniox.com/transcribe-websocket`
- **Model:** `stt-rt-preview` (real-time transcription)
- **Protocol:** WebSocket binary streaming
- **Audio Format:** PCM, various sample rates supported
- **Features:** Speaker diarization, language ID, multi-language

#### Token System
- **Type:** Temporary API tokens
- **Validity:** 1 hour maximum
- **Generation:** Server-side via Soniox API
- **Limitation:** Cannot refresh during active session
- **Risk:** Recordings over 1 hour will fail

#### Error Handling Mechanisms
Soniox provides these callbacks:
- `websocket_error` - WebSocket connection failures
- `api_error` - Server-side errors (includes HTTP status)
- `queue_limit_exceeded` - Buffer overflow during setup
- `get_user_media_failed` - Microphone access issues
- `api_key_fetch_failed` - Token retrieval failure
- `onStateChange({newState, oldState})` - Connection lifecycle
- `onStarted()` - Called after WebSocket establishes
- `onError(status, message, errorCode)` - General error notification

#### Buffering Capabilities
**Pre-Connection Buffering:**
- `bufferQueueSize` option (default: 1000 chunks)
- Buffers audio in memory before WebSocket establishes
- Audio queued while fetching temporary API keys
- Throws error if buffer limit exceeded
- Buffered audio automatically sent once connected

**During-Session Buffering:**
- ❌ **NO buffering support during active sessions**
- ❌ **NO session state preservation**
- ❌ **NO audio queuing during disconnections**

#### Reconnection Support
**Official Stance:**
- ❌ **NO automatic reconnection built-in**
- ❌ **NO session resume feature**
- ❌ **NO state recovery after disconnection**
- ✅ Must implement reconnection logic manually
- ✅ Can create new sessions programmatically

**Session Behavior on Disconnection:**
- Server closes connection completely
- Session terminates permanently
- All session state is lost
- New session must be created from scratch
- Previous audio cannot be recovered server-side

#### Best Practices from Soniox Documentation
1. "Implements graceful recovery when a limit is reached"
2. Use manual finalization with connection keepalive for pause/mute
3. Respect API limits to ensure session stability
4. `stop()` for graceful termination (waits for final results)
5. `cancel()` for immediate termination
6. Monitor `bufferQueueSize` to prevent overflow
7. Handle prolonged network jitter/buffering (may cause disconnection)

### B. WebRTC & Web Audio Best Practices Research

#### Connection State Monitoring
- Monitor `iceConnectionState` for WebRTC connections
- Watch for "failed" and "disconnected" states
- Implement custom health checks (heartbeats/pings)
- Use `navigator.onLine` for basic network detection
- `navigator.connection` API for connection quality (limited browser support)

#### Automatic Reconnection Patterns
**Exponential Backoff:**
- Start with short delay (1 second)
- Double delay on each retry (1s → 2s → 4s → 8s → 16s)
- Cap maximum delay (typically 30-60 seconds)
- Set maximum retry attempts (5-10 attempts)
- Reset on successful connection

**ICE Restart for WebRTC:**
- Execute `restartIce()` when connection fails
- Continual gathering with `GATHER_CONTINUALLY` policy
- Allows new ICE candidates without full renegotiation

**WebSocket Reconnection:**
- Detect closure/error events
- Close old connection cleanly
- Create new WebSocket instance
- Replay buffered data on reconnection
- Track connection attempts

#### Buffering Strategies for Real-Time Audio

**Jitter Buffers:**
- Typical size: 15ms to 120ms for audio
- Starts around 40ms, grows on poor connections
- Adaptive buffers respond to network conditions
- Use NACK (Negative Acknowledgement) for packet loss recovery

**Client-Side Audio Buffering:**
- Queue audio chunks in memory during disconnections
- Use IndexedDB for large buffers (prevents memory overflow)
- Pre-buffer before playback begins
- Flush data immediately on reconnect
- Implement streaming rather than chunked delivery

**MediaSource Extensions:**
- Provides advanced control over audio playback
- Supports various codecs/containers
- Allows appending buffered data to active streams
- Better suited for playback than recording (may not apply here)

#### Network-Aware Applications

**Proactive Detection:**
- Monitor network quality metrics
- Detect weak connections before failure
- Switch to offline mode preemptively
- Buffer data when network degrades

**Reconnection Mechanisms:**
- Watchdog pattern: monitors connection health continuously
- Heartbeat/ping every N seconds
- Timeout detection for unresponsive connections
- Graceful degradation on partial failures

### C. Industry Solutions & Patterns

#### Real-Time Communication Apps
**Zoom/WebEx Approach:**
- Multiple redundant connections
- Automatic quality adjustment
- Local recording fallback
- Buffering with automatic catch-up

**Google Meet Pattern:**
- Connection health monitoring
- Proactive reconnection attempts
- User notifications during degradation
- Seamless reconnection with state preservation

#### Audio Streaming Services
**Spotify/YouTube Music:**
- Aggressive pre-buffering (30-60 seconds)
- Offline mode with cached content
- Seamless switching between streams
- Quality adaptation based on bandwidth

#### Live Transcription Services
**Otter.ai/Rev.ai Patterns:**
- Dual recording (cloud + local)
- Chunk-based uploads with retry
- Offline queue management
- Post-processing for failed segments

---

## 4. Technical State of Soniox

### Strengths
✅ **Real-time transcription** with low latency
✅ **Speaker diarization** with multi-speaker support
✅ **Multi-language support** (English, Arabic, etc.)
✅ **High accuracy** with state-of-the-art models
✅ **Pre-connection buffering** handles initial delays
✅ **Flexible error callbacks** for monitoring
✅ **WebSocket streaming** for real-time data flow

### Limitations
❌ **No automatic reconnection** - must be implemented manually
❌ **No session resume** - cannot continue interrupted sessions
❌ **No server-side buffering** during active sessions
❌ **No state preservation** on disconnection
❌ **Token expiration** at 1 hour (no mid-session refresh)
❌ **No official reconnection examples** in documentation
❌ **No offline mode** or queuing support
❌ **No graceful degradation** on network issues

### Verdict
**Soniox is excellent for real-time transcription under stable network conditions, but completely fails when networks are unreliable. All resilience logic must be implemented client-side by the developer.**

### 💰 Critical Pricing Insight

**IMPORTANT DISCOVERY:** Soniox charges per **audio duration (tokens)**, NOT per session/connection!

**Pricing Details:**
- **Input audio tokens:** $2.00 per 1M tokens (real-time)
- **Conversion:** ~30,000 tokens per hour of audio
- **Cost:** ~$0.12 per hour of transcribed audio

**What This Means for Reconnections:**
```
Scenario: 1-hour recording with 2 disconnections

Traditional thinking (WRONG):
- 3 Soniox sessions created
- Assumption: 3x cost = $0.36
- This is INCORRECT!

Reality (CORRECT):
- 3 Soniox sessions created
- BUT: Audio chunks distributed, not duplicated
- Total audio processed: Still only 1 hour
- Cost: $0.12 (same as single session!)
```

**Example Flow:**
```
10:00-10:20 → Soniox Session A (20 min of audio)
[DISCONNECT]
[RECONNECT]
10:20-10:40 → Soniox Session B (20 min of audio)
[DISCONNECT]
[RECONNECT]
10:40-11:00 → Soniox Session C (20 min of audio)

Total audio: 60 minutes
Total cost: $0.12 (NOT $0.36!)
```

**Why This Changes Everything:**
- ✅ Multiple sessions during reconnections = NO extra cost
- ✅ Can reconnect as many times as needed
- ✅ Solution #5 (multi-connection) would be same cost IF chunks distributed (not duplicated)
- ✅ But Solution #1 (auto-reconnect) is simpler and achieves same goal

**Key Takeaway:** Don't worry about creating multiple Soniox sessions due to reconnections. As long as we're not duplicating audio (which we're not - we're buffering and replaying gaps), the cost remains the same! 💡

---

## 5. Proposed Solutions

### Solution 1: Client-Side Audio Buffering + Auto-Reconnect ⭐ **RECOMMENDED**

#### How It Works
```
Recording starts
         ↓
Initialize both:
  1. Soniox WebSocket streaming
  2. Local audio buffer (in-memory queue)
         ↓
Audio flows to BOTH:
  - Soniox (real-time transcription)
  - Local buffer (safety net)
         ↓
Network disconnects
         ↓
✅ WebSocket closes
✅ Audio continues to buffer locally
✅ Show "Reconnecting..." UI
         ↓
Auto-reconnect with exponential backoff
  Attempt 1: 1 second delay
  Attempt 2: 2 seconds delay
  Attempt 3: 4 seconds delay
  Attempt 4: 8 seconds delay
  Attempt 5: 16 seconds delay
         ↓
Reconnection successful
         ↓
✅ Fetch new Soniox token
✅ Establish new WebSocket
✅ Replay buffered audio chunks
✅ Resume real-time streaming
✅ Merge transcripts seamlessly
         ↓
Continue recording normally
```

#### Technical Components Needed

**1. AudioBufferManager Class**
```typescript
class AudioBufferManager {
  private buffer: Float32Array[] = [];
  private maxBufferSize: number = 10000; // ~10 minutes at 48kHz

  // Add audio chunk to buffer
  addChunk(audioData: Float32Array): void

  // Get all buffered chunks
  getBufferedChunks(): Float32Array[]

  // Clear buffer after successful replay
  clearBuffer(): void

  // Persist to IndexedDB if buffer exceeds memory limit
  persistToIndexedDB(): Promise<void>

  // Restore from IndexedDB
  restoreFromIndexedDB(): Promise<void>

  // Get buffer size in seconds
  getBufferDuration(): number
}
```

**2. ReconnectionController Class**
```typescript
class ReconnectionController {
  private retryCount: number = 0;
  private maxRetries: number = 10;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 30000; // 30 seconds

  // Calculate next retry delay (exponential backoff)
  getNextDelay(): number

  // Attempt reconnection
  async reconnect(): Promise<boolean>

  // Reset retry counter on success
  resetRetries(): void

  // Check if should retry
  shouldRetry(): boolean
}
```

**3. TranscriptStateManager Class**
```typescript
class TranscriptStateManager {
  private segments: TranscriptSegment[] = [];

  // Auto-save to localStorage every 10 seconds
  autoSave(): void

  // Merge segments from multiple sessions
  mergeSegments(newSegments: TranscriptSegment[]): void

  // Handle speaker ID continuity across sessions
  alignSpeakerIDs(oldSession: string[], newSession: string[]): void

  // Timestamp alignment between sessions
  alignTimestamps(disconnectTime: number, reconnectTime: number): void

  // Restore from localStorage on crash
  restoreSession(): TranscriptSegment[]
}
```

**4. Enhanced useSonioxStream Hook**
```typescript
const useSonioxStream = () => {
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');

  const audioBuffer = useRef(new AudioBufferManager());
  const reconnection = useRef(new ReconnectionController());

  // Existing WebSocket handlers + reconnection logic
  const handleDisconnection = async () => {
    setConnectionStatus('reconnecting');

    // Keep buffering audio locally
    // Attempt reconnection with exponential backoff
    // Replay buffered audio on success
  };

  return {
    connectionStatus,
    startStreaming,
    stopStreaming,
    manualReconnect, // New: allow user to manually retry
  };
};
```

#### Implementation Steps
1. Create `AudioBufferManager` utility class
2. Create `ReconnectionController` utility class
3. Create `TranscriptStateManager` utility class
4. Enhance `useSonioxStream` hook with reconnection logic
5. Add connection status UI component
6. Implement auto-save to localStorage (every 10s)
7. Add manual reconnect button
8. Test with network throttling/disconnection

#### Pros
✅ **No audio data loss** - everything buffered
✅ **Automatic recovery** - user doesn't restart
✅ **Seamless experience** - transcription continues
✅ **Transparent to user** - happens in background
✅ **Memory efficient** - IndexedDB for large buffers
✅ **Low complexity** - straightforward implementation

#### Cons
❌ **Memory management** - large buffers need IndexedDB
❌ **Replay delay** - buffered audio must be reprocessed
❌ **Session continuity** - Soniox treats as new session
❌ **Speaker ID alignment** - may need manual mapping

#### Estimated Effort
- **Development Time:** 2-3 days
- **Testing Time:** 1-2 days
- **Complexity:** Medium

---

### Solution 2: WebSocket Reconnection Wrapper with State Management

#### How It Works
```
Wrap Soniox WebSocket in ResilientWebSocket class
         ↓
Monitor connection health continuously:
  - Heartbeat ping every 5 seconds
  - Track response times
  - Detect dead connections early
         ↓
Save transcript state to localStorage every 10 seconds
         ↓
Network disconnects
         ↓
✅ Detect disconnection immediately (not wait for timeout)
✅ Save current transcript state
✅ Show "Reconnecting..." UI with countdown
         ↓
Auto-reconnect with exponential backoff
         ↓
Restore transcript state from localStorage
         ↓
Continue from last known position
```

#### Technical Components

**1. ResilientWebSocket Wrapper**
```typescript
class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private heartbeatInterval: number = 5000;
  private lastPongTime: number = Date.now();
  private reconnectionController: ReconnectionController;

  // Wrap native WebSocket with reconnection logic
  connect(url: string): Promise<void>

  // Send heartbeat ping every N seconds
  startHeartbeat(): void

  // Detect dead connections (no pong received)
  checkHealth(): boolean

  // Auto-reconnect on failure
  handleDisconnection(): Promise<void>

  // Graceful close
  close(): void
}
```

**2. Connection Health Monitor**
```typescript
class ConnectionHealthMonitor {
  private pingLatencies: number[] = [];

  // Send ping, measure response time
  ping(): Promise<number>

  // Calculate average latency
  getAverageLatency(): number

  // Detect degrading connection quality
  isConnectionDegrading(): boolean

  // Warn user before complete failure
  shouldWarnUser(): boolean
}
```

#### Implementation Steps
1. Create `ResilientWebSocket` wrapper class
2. Create `ConnectionHealthMonitor` class
3. Implement heartbeat/ping mechanism
4. Add dead connection detection
5. Integrate with existing `useSonioxStream` hook
6. Add connection quality UI indicator
7. Implement state persistence to localStorage
8. Add user warnings for degrading connections

#### Pros
✅ **Faster disconnection detection** - proactive monitoring
✅ **Transcript preservation** - saved to localStorage
✅ **Connection quality indicators** - user awareness
✅ **Predictive warnings** - alert before failure
✅ **Cleaner abstraction** - wrapper pattern

#### Cons
❌ **Still need audio buffering** - doesn't solve data loss
❌ **Cannot truly resume** - Soniox limitation
❌ **Heartbeat overhead** - additional bandwidth usage
❌ **Complex state management** - synchronization issues

#### Estimated Effort
- **Development Time:** 2-3 days
- **Testing Time:** 1-2 days
- **Complexity:** Medium-High

---

### Solution 3: Hybrid Fallback Recording ⭐ **BEST SAFETY NET**

#### How It Works
```
User starts recording
         ↓
Initialize BOTH simultaneously:
  1. Primary: Soniox real-time WebSocket streaming
  2. Backup: Local MediaRecorder (WebM file)
         ↓
Audio flows to BOTH systems in parallel
         ↓
Network disconnects
         ↓
❌ Soniox WebSocket fails
✅ Local MediaRecorder continues recording
✅ Show "Recording locally - will sync when online"
         ↓
Try to reconnect Soniox (with backoff)
         ↓
If reconnection succeeds:
  ✅ Resume Soniox streaming
  ✅ Keep local recording as backup
         ↓
If reconnection fails after max retries:
  ✅ Continue with local recording only
  ✅ Upload local file when online
  ✅ Process via Soniox batch API
         ↓
User stops recording
         ↓
Merge transcripts:
  - Real-time portion (before disconnect)
  - Batch processed portion (during disconnect)
  - Real-time portion (after reconnect)
```

#### Technical Components

**1. HybridRecorder Class**
```typescript
class HybridRecorder {
  private sonioxStream: SonioxStream;
  private localRecorder: MediaRecorder;
  private recordingMode: 'realtime' | 'local' | 'both';

  // Start both recording systems
  start(): Promise<void>

  // Handle Soniox failure gracefully
  handleSonioxFailure(): void

  // Continue with local-only recording
  fallbackToLocal(): void

  // Process local backup file
  processLocalBackup(file: Blob): Promise<Transcript>

  // Merge transcripts from multiple sources
  mergeTranscripts(
    realtime1: Segment[],
    batchProcessed: Segment[],
    realtime2: Segment[]
  ): Segment[]
}
```

**2. Transcript Merger**
```typescript
class TranscriptMerger {
  // Align timestamps across different recording sessions
  alignTimestamps(segments: Segment[][]): Segment[]

  // Remove duplicate segments
  deduplicateSegments(segments: Segment[]): Segment[]

  // Handle speaker ID continuity
  mergeSpeakerIDs(segments: Segment[][]): Segment[]

  // Sort by timestamp
  sortByTimestamp(segments: Segment[]): Segment[]
}
```

**3. Offline Queue Manager**
```typescript
class OfflineQueueManager {
  private queue: PendingUpload[] = [];

  // Add file to upload queue
  enqueue(file: Blob, metadata: RecordingMetadata): void

  // Process queue when online
  processQueue(): Promise<void>

  // Retry failed uploads
  retryFailedUploads(): Promise<void>

  // Persist queue to IndexedDB
  persistQueue(): Promise<void>
}
```

#### Implementation Steps
1. Create `HybridRecorder` class
2. Modify recording interface to start both systems
3. Create `TranscriptMerger` utility
4. Implement fallback logic in `useSonioxStream`
5. Add offline queue management
6. Create batch processing API endpoint
7. Build transcript merging algorithm
8. Add UI indicators for recording mode
9. Test with various disconnection scenarios

#### Pros
✅ **Zero data loss guarantee** - local backup always works
✅ **Simple fallback mechanism** - well-understood pattern
✅ **Works with prolonged outages** - no reconnection needed
✅ **Graceful degradation** - switches modes seamlessly
✅ **User confidence** - always recording something

#### Cons
❌ **Transcription delay** for fallback portion
❌ **Merging complexity** - aligning multiple transcripts
❌ **Extra storage needed** - local files + transcripts
❌ **Batch processing costs** - may be higher than streaming
❌ **No real-time feedback** during local-only mode

#### Estimated Effort
- **Development Time:** 3-4 days
- **Testing Time:** 2 days
- **Complexity:** Medium

---

### Solution 4: Network-Aware Recording with Pause/Resume

#### How It Works
```
Monitor network quality continuously:
  - navigator.connection API
  - Custom ping tests
  - WebSocket health checks
         ↓
Detect weak/degrading connection BEFORE failure
         ↓
✅ Proactively pause Soniox streaming
✅ Buffer audio locally
✅ Show "Network unstable - buffering locally"
         ↓
Wait for network to stabilize
  - Monitor connection quality
  - Run periodic health checks
         ↓
Network quality improves
         ↓
✅ Resume Soniox streaming
✅ Replay buffered audio
✅ Continue real-time transcription
         ↓
Use Soniox manual finalization to keep connection alive
```

#### Technical Components

**1. NetworkQualityMonitor Class**
```typescript
class NetworkQualityMonitor {
  // Use navigator.connection API (when available)
  getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown'

  // Measure effective bandwidth
  measureBandwidth(): Promise<number>

  // Run ping tests to gauge latency
  pingTest(): Promise<number>

  // Predict connection failure
  isPoorQuality(): boolean

  // Get quality score (0-100)
  getQualityScore(): number
}
```

**2. AdaptiveStreamingController**
```typescript
class AdaptiveStreamingController {
  private qualityMonitor: NetworkQualityMonitor;
  private audioBuffer: AudioBufferManager;

  // Decide whether to stream or buffer
  shouldStreamAudio(): boolean

  // Pause streaming proactively
  pauseStreaming(): void

  // Resume when quality improves
  resumeStreaming(): Promise<void>

  // Adjust audio quality based on bandwidth
  adjustAudioQuality(bandwidth: number): void
}
```

#### Implementation Steps
1. Create `NetworkQualityMonitor` class
2. Create `AdaptiveStreamingController` class
3. Integrate with `useSonioxStream` hook
4. Add proactive pause/resume logic
5. Implement quality-based audio adjustments
6. Add UI indicators for network quality
7. Test with network throttling tools
8. Handle browser compatibility (navigator.connection limited)

#### Pros
✅ **Proactive prevention** - stop before failure
✅ **Smoother experience** - intentional pausing
✅ **Less reconnection overhead** - fewer disconnects
✅ **Quality awareness** - adapt to conditions
✅ **User transparency** - explain what's happening

#### Cons
❌ **Browser support limited** - navigator.connection not universal
❌ **False positives** - may pause unnecessarily
❌ **Still need buffering** - doesn't eliminate the need
❌ **Complexity** - quality prediction is hard

#### Estimated Effort
- **Development Time:** 3-4 days
- **Testing Time:** 2-3 days
- **Complexity:** High

---

### Solution 5: Multi-Connection Architecture (Advanced)

#### How It Works
```
User starts recording
         ↓
Open MULTIPLE parallel WebSocket connections to Soniox:
  - Connection A (primary)
  - Connection B (backup)
  - Connection C (backup)
         ↓
Distribute audio chunks round-robin or by health:
  - Chunk 1 → Connection A
  - Chunk 2 → Connection B
  - Chunk 3 → Connection C
  - Chunk 4 → Connection A (cycle repeats)
         ↓
One connection fails
         ↓
✅ Other connections continue
✅ Redistribute traffic to healthy connections
✅ Attempt to reconnect failed connection
         ↓
Merge transcription results from all connections
         ↓
Deduplicate and align segments
```

#### Technical Components

**1. MultiConnectionManager**
```typescript
class MultiConnectionManager {
  private connections: SonioxConnection[] = [];
  private connectionCount: number = 3;
  private roundRobinIndex: number = 0;

  // Initialize multiple connections
  initializeConnections(): Promise<void>

  // Distribute audio chunk to healthy connection
  sendAudioChunk(chunk: Float32Array): void

  // Monitor connection health
  checkConnectionHealth(): void

  // Redistribute traffic on failure
  rebalanceConnections(): void

  // Merge results from all connections
  mergeResults(results: TranscriptResult[]): TranscriptSegment[]
}
```

**2. ConnectionLoadBalancer**
```typescript
class ConnectionLoadBalancer {
  // Choose best connection for next chunk
  selectConnection(): SonioxConnection

  // Round-robin strategy
  roundRobin(): SonioxConnection

  // Health-based selection
  healthBasedSelection(): SonioxConnection

  // Latency-based selection
  latencyBasedSelection(): SonioxConnection
}
```

#### Implementation Steps
1. Create `MultiConnectionManager` class
2. Create `ConnectionLoadBalancer` class
3. Modify Soniox integration to support multiple connections
4. Implement chunk distribution logic
5. Build result merging algorithm
6. Add connection health monitoring
7. Handle edge cases (all connections fail)
8. Test with various failure scenarios

#### Pros
✅ **Maximum resilience** - redundancy built-in
✅ **Lower latency** - distribute load
✅ **High availability** - single failure doesn't stop recording
✅ **Better performance** - parallel processing

#### Cons
❌ **Complex implementation** - hardest to build
❌ **Higher API costs** - multiple simultaneous sessions
❌ **Coordination overhead** - merging results is tricky
❌ **Resource intensive** - more memory/bandwidth
❌ **Deduplication complexity** - same audio chunks processed multiple times

#### Estimated Effort
- **Development Time:** 5-7 days
- **Testing Time:** 3-4 days
- **Complexity:** Very High

---

## 6. Recommended Implementation Strategy

### 🎯 UPDATED RECOMMENDATION (Based on Key Insight)

**Primary Approach: Solution #1 (Audio Buffering + Auto-Reconnect)**

This is the PERFECT solution because it implements exactly what we need:
- ONE student session
- MULTIPLE Soniox sessions (on reconnection)
- Audio buffering to cover gaps
- All transcripts merge seamlessly

**Why Solution #1 is Sufficient:**
- ✅ Solves the gap problem (audio buffering)
- ✅ Automatic reconnection (new Soniox sessions)
- ✅ Same student session throughout
- ✅ User sees continuous transcript
- ✅ Reasonable complexity
- ✅ No extra cost (Soniox charges per audio duration, not per session)

**Why We DON'T Need Solution #5 (Multi-Connection):**
- ❌ Overly complex (3 parallel connections to manage)
- ❌ Not necessary (auto-reconnect is sufficient)
- ❌ Higher client-side resource usage
- ❌ More complex result merging
- ⚠️ Solution #1 achieves the same goal with less complexity

---

### Phase 1: Core Implementation (Week 1)
**Implement Solution #1 with Simple Fallback**

1. **Audio Buffering System**
   - Create `AudioBufferManager` class
   - Buffer audio chunks in memory during recording
   - Use IndexedDB for buffers > 5 minutes
   - Clear buffer after successful transcription

2. **Auto-Reconnection Logic**
   - Detect WebSocket disconnection
   - Fetch NEW Soniox token
   - Establish NEW WebSocket connection
   - Exponential backoff (1s, 2s, 4s, 8s, 16s, max 10 retries)
   - Keep same student session ID throughout

3. **Buffer Replay Mechanism**
   - When reconnected, send buffered audio to NEW Soniox session
   - Continue with live audio streaming
   - Save all segments to SAME student session

4. **Session Continuity in Database**
   - Keep student session active during disconnections
   - Add `soniox_session_id` column to track which Soniox session created each segment
   - All segments share same `student_session_id`
   - Query returns merged transcript sorted by timestamp

5. **Basic UI Feedback**
   - Connection status indicator (connected/reconnecting/disconnected)
   - "Reconnecting in X seconds..." countdown
   - Manual reconnect button
   - Show buffered audio duration during disconnection

6. **Simple Local Backup** (Optional Safety Net)
   - Keep local MediaRecorder running in background
   - Only use if reconnection fails completely after max retries
   - Upload and process later if needed

**Deliverables:**
- ✅ Zero data loss (audio buffered during disconnection)
- ✅ Automatic reconnection (creates new Soniox sessions)
- ✅ Continuous student session (same session ID throughout)
- ✅ Seamless transcript (user sees no gaps)
- ✅ Clear user feedback (connection status)

**Estimated Time:** 4-5 days (simpler than original estimate!)

---

### Phase 2: Enhanced Resilience (Week 2-3)

1. **Add Solution #2 features:**
   - Heartbeat/ping mechanism for early detection
   - Connection quality monitoring
   - Predictive warnings before failure

2. **Add Solution #4 features:**
   - Network quality monitoring (where supported)
   - Proactive pause on poor connections
   - Quality-based streaming adjustments

3. **Advanced UI:**
   - Network quality indicator
   - Buffering progress bar
   - Connection latency display
   - Warning before starting recording on weak network

**Deliverables:**
- Proactive disconnection prevention
- Early warning system
- Better user awareness
- Quality-adaptive streaming

**Estimated Time:** 7-10 days

---

### Phase 3: Production Hardening (Week 4)

1. **Testing & edge cases:**
   - Test with various disconnection scenarios
   - Test with long recordings (1+ hours)
   - Test token expiration handling
   - Test IndexedDB persistence
   - Test transcript merging accuracy

2. **Performance optimization:**
   - Memory management for large buffers
   - Efficient IndexedDB usage
   - Optimize reconnection timing
   - Reduce unnecessary API calls

3. **Monitoring & analytics:**
   - Track disconnection frequency
   - Monitor reconnection success rate
   - Log network quality metrics
   - User experience analytics

**Deliverables:**
- Production-ready system
- Comprehensive test coverage
- Performance optimizations
- Monitoring & analytics

**Estimated Time:** 5-7 days

---

## 7. Technical Requirements

### New Dependencies (Minimal)
```json
{
  "idb": "^8.0.0"  // IndexedDB wrapper (optional, can use native)
}
```

### Environment Variables
No new environment variables needed (use existing Soniox credentials).

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited (navigator.connection not supported)
- Mobile browsers: Varies (test thoroughly)

### Performance Considerations
- **Memory:** Buffer up to 10 minutes of audio (~50MB at 48kHz stereo)
- **IndexedDB:** Use for buffers > 5 minutes
- **Network:** Additional heartbeat traffic (~1KB every 5s)
- **CPU:** Minimal impact (buffering is lightweight)

---

## 8. Success Metrics

### Before Implementation (Current State)
❌ 100% recording failure on network disconnection
❌ 0% automatic recovery
❌ No user feedback on connection issues
❌ Complete data loss on disconnect

### After Phase 1 (Target)
✅ 0% recording failure (local fallback guarantees recording)
✅ 80%+ automatic reconnection success rate
✅ 100% transcript preservation (buffering + local backup)
✅ Clear user feedback on connection status

### After Phase 2 (Target)
✅ 90%+ automatic reconnection success rate
✅ 50%+ disconnections prevented proactively
✅ Sub-5-second reconnection time
✅ Quality-adaptive streaming reduces failures

### After Phase 3 (Target)
✅ Production-ready with comprehensive monitoring
✅ <1% data loss rate
✅ User satisfaction improvement (surveys)
✅ Reduced support tickets for "lost recording" issues

---

## 9. Risk Assessment

### Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB quota exceeded | High | Low | Implement cleanup, warn user |
| Token expiration during reconnection | Medium | Medium | Fetch new token on reconnect |
| Transcript merging errors | Medium | Medium | Extensive testing, manual review option |
| Browser compatibility issues | Medium | Medium | Feature detection, graceful degradation |
| Memory overflow on long buffers | High | Low | Automatic IndexedDB fallback |

### Business Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Development takes longer than estimated | Medium | Medium | Phased approach, MVP first |
| User experience during transition | Low | Low | Thorough testing, gradual rollout |
| Increased API costs (batch processing) | Low | Low | Monitor usage, optimize later |

---

## 10. Next Steps

### Immediate Actions (Before Starting Implementation)
1. ✅ Review this document with team
2. ⬜ Approve recommended strategy (Phase 1 first)
3. ⬜ Set up testing environment with network throttling
4. ⬜ Create implementation tasks/tickets
5. ⬜ Allocate development time (5-7 days for Phase 1)

### Development Workflow
1. Create feature branch: `feature/network-disconnection-resilience`
2. Implement Phase 1 components incrementally
3. Test each component thoroughly
4. Deploy to staging for real-world testing
5. Gather feedback from beta users
6. Fix issues, optimize
7. Deploy to production
8. Monitor metrics
9. Begin Phase 2 if Phase 1 successful

### Testing Requirements
- Unit tests for all new classes
- Integration tests for reconnection flow
- E2E tests simulating network failures
- Manual testing with various network conditions
- Performance testing with long recordings
- Cross-browser compatibility testing

---

## 11. Conclusion

The network disconnection problem is **critical and fully solvable**. The root cause is Soniox's lack of automatic reconnection support, but this can be overcome with client-side resilience logic.

### 🎯 The Simple Truth

After deep analysis, the solution is actually **simpler than it initially appeared**:

**The Problem:**
- Soniox WebSocket dies when network disconnects
- No built-in reconnection mechanism
- Audio during disconnection is lost

**The Solution:**
- Keep ONE student session in our database
- Create NEW Soniox sessions when reconnections happen
- Buffer audio locally during disconnections
- Replay buffered audio to new Soniox session
- All transcripts merge into the same student session
- User sees continuous recording ✅

**Why This Works:**
- Soniox charges per audio duration, NOT per session
- Multiple Soniox sessions → Same cost (no duplication)
- Database merges all segments by student session ID
- User experience is seamless

### The Recommended Approach

**Solution #1 (Audio Buffering + Auto-Reconnect)** is perfect because:
- ✅ **Zero data loss** - audio buffered during disconnection
- ✅ **Automatic recovery** - creates new Soniox sessions automatically
- ✅ **Session continuity** - same student session throughout
- ✅ **User transparency** - clear status indicators
- ✅ **Reasonable complexity** - straightforward implementation
- ✅ **Same cost** - Soniox charges per audio duration only

**We DON'T need:**
- ❌ Multiple parallel connections (Solution #5) - overly complex
- ❌ Complex state management - simple buffering is enough
- ❌ Advanced network prediction - auto-reconnect is sufficient

### Implementation Timeline

**Phase 1 (MVP): 4-5 days** → Solves 100% of the critical problem
- Audio buffering during disconnections
- Auto-reconnection with exponential backoff
- Session continuity (one student session, multiple Soniox sessions)
- Basic UI feedback

**Phase 2 (Enhanced): 7-10 days** → Prevents failures proactively
- Heartbeat monitoring for early detection
- Network quality indicators
- Predictive warnings

**Phase 3 (Production): 5-7 days** → Hardening & monitoring
- Comprehensive testing
- Performance optimization
- Analytics & monitoring

**Total estimated time: 2.5-3 weeks** for complete solution.

### The Transformation

This will transform the recording experience from **"unreliable and frustrating"** to **"bulletproof and trustworthy"** — even on unstable networks.

**Key Insight:** The solution leverages the fact that our student session is separate from Soniox sessions. We can create as many Soniox sessions as needed (on each reconnection) while maintaining ONE continuous student session. The user never knows the difference! 🎯

---

**Document Version:** 2.0
**Last Updated:** November 7, 2025 - Added key insight about session continuity
**Next Review:** After Phase 1 implementation
**Owner:** Development Team

---

## 12. Quick Reference - Implementation Checklist

### Must-Have (Phase 1)
- [ ] `AudioBufferManager` class - buffers audio during disconnection
- [ ] Auto-reconnection logic with exponential backoff
- [ ] NEW Soniox token fetching on reconnection
- [ ] Buffer replay to new Soniox session
- [ ] Database: `soniox_session_id` column in segments table
- [ ] UI: Connection status indicator
- [ ] UI: "Reconnecting..." message with countdown
- [ ] UI: Manual reconnect button

### Nice-to-Have (Phase 2)
- [ ] Heartbeat/ping mechanism for early detection
- [ ] Network quality monitoring
- [ ] Proactive warnings before disconnection
- [ ] Buffering progress indicator

### Production-Ready (Phase 3)
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Analytics & monitoring
- [ ] User documentation

**Start with Phase 1 - it solves the entire problem!** 🚀
