<!-- File: transcriber.html — Local (no server) voice + system audio transcription with Soniox + Speaker Diarization
     What’s new:
       • Speaker diarization (labels like “Speaker 1/2/…”) with live grouping
       • “Speakers: N” pill updates in real time
       • Everything else unchanged: mixed Arabic–English, tab/system audio capture, no endpoint wipeout

     Use:
       1) Open in Chrome/Edge (best). Safari/Firefox: mic OK; system audio varies.
       2) Set API key (stored in localStorage).
       3) (Optional) Check “Capture browser/system audio”, click Start → pick “This Tab” (+ Share tab audio) or “Entire screen” (+ Share system audio on Windows/ChromeOS).
       4) Speak/play audio. Live text shows instantly with speaker labels. Stop to save.
-->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Local Transcriber — Soniox (Mic + System/Tab Audio) + Diarization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg:#0b0c10; --panel:#11141a; --muted:#667085; --text:#e6e6e6; --accent:#6ee7ff; --danger:#ff6b6b; --ok:#22c55e; --warn:#f59e0b;
    }
    html,body{height:100%}
    body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
    .wrap{max-width:920px;margin:auto;padding:24px}
    .card{background:var(--panel);border:1px solid #1f2430;border-radius:16px;padding:20px}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
    .grow{flex:1}
    label{font-size:14px;color:var(--muted)}
    input[type="text"], input[type="password"]{
      width:100%;padding:12px 14px;border-radius:12px;border:1px solid #262b36;background:#0d0f14;color:#e6e6e6;
    }
    button{
      border:0;border-radius:14px;padding:14px 18px;font-weight:700;cursor:pointer;
      background:#1a90ff;color:#fff;transition:transform .02s ease;
    }
    button:active{transform:translateY(1px)}
    button.secondary{background:#2b323f}
    button.danger{background:var(--danger)}
    button.ok{background:var(--ok);color:#0a0a0a}
    .big{font-size:18px;padding:18px 22px}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#1a2130;color:#cbd5e1;font-size:12px}
    .statusdot{width:10px;height:10px;border-radius:50%;background:#475569;display:inline-block}
    .statusdot.live{background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.8);animation:pulse 1.4s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 10px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
    .transcript{min-height:160px;white-space:pre-wrap;background:#0d0f14;border:1px solid #1f2430;border-radius:14px;padding:16px}
    .sub{color:#94a3b8;font-size:13px}
    .note{background:#0e121a;border:1px dashed #223049;border-radius:12px;padding:12px;font-size:13px;color:#b8c3cf}
    .warn{color:var(--warn)}
    .history{display:grid;gap:10px}
    .hist-item{background:#0d1017;border:1px solid #1f2430;border-radius:12px;padding:12px}
    .small{font-size:12px}
    .sliders{display:flex;gap:16px;align-items:center}
    input[type="range"]{width:180px}
  </style>
</head>
<body>
<div class="wrap">
  <h2 style="margin:0 0 12px 0;">Local Transcriber</h2>
  <div class="sub" style="margin-bottom:18px">Mic + (optional) system/tab audio → real-time Soniox transcription with speaker diarization. Local-only UI; only Soniox API is contacted.</div>

  <!-- API KEY PANEL -->
  <div class="card" id="keyPanel" style="display:none; margin-bottom:16px">
    <div class="row">
      <div class="grow">
        <label for="apiKey">SONIOX API Key</label>
        <input id="apiKey" type="password" placeholder="soniox_************************" autocomplete="off" />
        <div class="sub">Stored only in your browser (<code>localStorage</code>).</div>
      </div>
      <div>
        <button id="saveKeyBtn" class="big ok">Save Key</button>
      </div>
    </div>
  </div>

  <!-- CONTROLS -->
  <div class="card" style="margin-bottom:16px">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div class="row">
        <span class="pill"><span id="statusDot" class="statusdot"></span><span id="statusText">idle</span></span>
      </div>
      <div class="row small">
        <span id="currentModel" class="pill">model: stt-rt-preview</span>
        <span id="langId" class="pill">multilingual: on</span>
        <span class="pill"><span>speakers:</span><span id="speakersCount">0</span></span>
        <span class="pill"><span>sessions:</span><span id="sessionCount">0</span></span>
      </div>
    </div>

    <div class="row" style="margin-bottom:10px">
      <div class="row">
        <input id="captureSystem" type="checkbox" />
        <label for="captureSystem" style="margin-left:6px">Capture browser/system audio (tab/system sound)</label>
      </div>
      <div class="row sliders">
        <label>Mic gain</label><input id="micGain" type="range" min="0" max="200" value="100">
        <label>System gain</label><input id="sysGain" type="range" min="0" max="200" value="100">
      </div>
      <div class="grow"></div>
      <div class="row">
        <button id="startBtn" class="big">Start Transcribing</button>
        <button id="stopBtn" class="big danger" disabled>Stop</button>
        <button id="cancelBtn" class="big secondary" disabled>Cancel</button>
      </div>
    </div>

    <div class="note" id="sysNote" style="display:none;margin-top:8px">
      Pick <b>This Tab</b> + enable <b>Share tab audio</b>, or pick <b>Entire screen</b> + enable <b>Share system audio</b> (Windows/ChromeOS).
      macOS typically allows <i>tab audio</i> only. If no system audio track is detected, you’ll see a warning.
    </div>

    <div id="systemWarn" class="sub warn" style="display:none;margin-top:8px"></div>

    <div class="row" style="margin-top:12px">
      <button id="setKeyLink" class="secondary">Set / Change API Key</button>
      <button id="clearAllBtn" class="secondary">Clear All Sessions</button>
    </div>
  </div>

  <!-- LIVE + FINAL -->
  <div class="card" style="margin-bottom:16px">
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="row"><strong>Live Transcript</strong></div>
      <div class="small sub" id="timer">00:00</div>
    </div>
    <div id="live" class="transcript" aria-live="polite"></div>
    <div class="sub" style="margin-top:10px">Final (words locked):</div>
    <div id="final" class="transcript"></div>
  </div>

  <!-- HISTORY -->
  <div class="card">
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
      <strong>Session History</strong>
      <span class="small sub">Saved locally</span>
    </div>
    <div id="history" class="history"></div>
  </div>

  <p class="sub" style="margin-top:18px">
    Tips: Chrome/Edge give best system-audio capture. Soniox auto-detects languages (English + Arabic) and we now add speaker labels in real time.
  </p>
</div>

<script type="module">
  import { SonioxClient } from 'https://unpkg.com/@soniox/speech-to-text-web?module';

  // ===== DOM =====
  const keyPanel = document.getElementById('keyPanel');
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const setKeyLink = document.getElementById('setKeyLink');
  const captureSystem = document.getElementById('captureSystem');
  const sysNote = document.getElementById('sysNote');
  const sysWarn = document.getElementById('systemWarn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const liveEl = document.getElementById('live');
  const finalEl = document.getElementById('final');
  const timerEl = document.getElementById('timer');
  const historyEl = document.getElementById('history');
  const sessionCountEl = document.getElementById('sessionCount');
  const speakersCountEl = document.getElementById('speakersCount');
  const micGainEl = document.getElementById('micGain');
  const sysGainEl = document.getElementById('sysGain');

  // ===== STATE =====
  let soniox = null;
  let audioCtx = null;
  let micStream = null;
  let displayStream = null;
  let mixedStream = null;
  let micGainNode = null;
  let sysGainNode = null;
  let destNode = null;
  let running = false;
  let startedAt = 0;
  let timerInt = null;

  // text assembly with diarization
  let finalSegments = [];  // [{label: 'Speaker 1', text: '...'}]
  let lastRenderedLive = '';
  const speakerMap = new Map(); // numericSpeakerId -> 'Speaker N'
  function resetSpeakersUI(){ speakersCountEl.textContent = '0'; }
  function getSpeakerId(tok){
    // Try multiple possible fields defensively
    return tok?.speaker ?? tok?.speaker_id ?? tok?.spk ?? tok?.spk_id ?? tok?.channel ?? 0;
  }
  function labelForSpeaker(id){
    const key = String(id);
    if (!speakerMap.has(key)){
      const nextNum = speakerMap.size + 1;
      speakerMap.set(key, `Speaker ${nextNum}`);
      speakersCountEl.textContent = String(speakerMap.size);
    }
    return speakerMap.get(key);
  }
  function renderSegments(segments){
    return segments.map(s => `${s.label}: ${s.text}`).join('\n');
  }
  function cloneSegments(){ return finalSegments.map(s => ({label:s.label, text:s.text})); }

  // ===== INIT =====
  function ensureKeyPanelVisibility() {
    const hasKey = !!localStorage.getItem('soniox_api_key');
    keyPanel.style.display = hasKey ? 'none' : 'block';
  }
  ensureKeyPanelVisibility();

  setKeyLink.onclick = () => {
    keyPanel.style.display = 'block';
    apiKeyInput.focus();
  };
  saveKeyBtn.onclick = () => {
    const k = (apiKeyInput.value || '').trim();
    if (!k) return alert('Enter a valid SONIOX API key.');
    localStorage.setItem('soniox_api_key', k);
    apiKeyInput.value = '';
    keyPanel.style.display = 'none';
    alert('API key saved locally.');
  };

  captureSystem.addEventListener('change', () => {
    sysNote.style.display = captureSystem.checked ? 'block' : 'none';
  });

  micGainEl.addEventListener('input', () => { if (micGainNode) micGainNode.gain.value = Number(micGainEl.value)/100; });
  sysGainEl.addEventListener('input', () => { if (sysGainNode) sysGainNode.gain.value = Number(sysGainEl.value)/100; });

  // ===== STATUS =====
  function setStatus(text, mode='idle'){
    statusText.textContent = text;
    statusDot.className = 'statusdot' + (mode==='live' ? ' live' : mode==='busy' ? ' busy' : mode==='err' ? ' err' : '');
  }
  function setButtonsRecordingState(isRecording){
    if (isRecording){
      startBtn.textContent = 'Recording…';
      startBtn.disabled = true;
      stopBtn.disabled = false;
      cancelBtn.disabled = false;
    } else {
      startBtn.textContent = 'Start Transcribing';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      cancelBtn.disabled = true;
    }
  }
  function fmtTime(ms){
    const s = Math.floor(ms/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }
  function startTimer(){
    startedAt = Date.now();
    timerInt = setInterval(()=>{ timerEl.textContent = fmtTime(Date.now()-startedAt); }, 200);
  }
  function stopTimer(){
    clearInterval(timerInt);
    timerEl.textContent = '00:00';
  }

  // ===== AUDIO (mix mic + system/tab) =====
  async function buildMixedStream(wantSystemAudio){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    destNode = audioCtx.createMediaStreamDestination();

    // mic — disable echoCancellation to avoid AEC killing system audio when mixing
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:false, noiseSuppression:true, autoGainControl:true },
      video:false
    });
    const micSrc = audioCtx.createMediaStreamSource(micStream);
    micGainNode = audioCtx.createGain(); micGainNode.gain.value = Number(micGainEl.value)/100;
    micSrc.connect(micGainNode).connect(destNode);

    // optional system/tab
    sysWarn.style.display = 'none';
    if (wantSystemAudio) {
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video:true,
          audio: { systemAudio: 'include' } // some browsers ignore; harmless
        });
        const hasAudio = displayStream.getAudioTracks().length > 0;
        if (!hasAudio) {
          sysWarn.textContent = 'No system/tab audio track detected. Enable “Share tab audio” (or “Share system audio” on Windows).';
          sysWarn.style.display = 'block';
        } else {
          const sysSrc = audioCtx.createMediaStreamSource(displayStream);
          sysGainNode = audioCtx.createGain(); sysGainNode.gain.value = Number(sysGainEl.value)/100;
          sysSrc.connect(sysGainNode).connect(destNode);
        }

        // if user stops screen-share from Chrome UI
        const vTracks = displayStream.getVideoTracks();
        if (vTracks[0]) vTracks[0].addEventListener('ended', () => {
          console.warn('Screen share ended by user.');
          if (running) stopTranscription();
        });
      } catch(e){
        console.warn('Display media not granted, continuing mic-only.', e);
        sysWarn.textContent = 'Screen share permission denied. Transcribing microphone only.';
        sysWarn.style.display = 'block';
      }
    }

    mixedStream = destNode.stream;
    return mixedStream;
  }
  function stopAllTracks(){
    [micStream, displayStream].forEach(s => {
      if (!s) return;
      s.getTracks().forEach(t => t.stop());
    });
    micStream = displayStream = null;
    mixedStream = null;
    if (audioCtx) { audioCtx.close().catch(()=>{}); audioCtx = null; }
  }

  // ===== SESSIONS (localStorage) =====
  function saveSession(text, durMs){
    const id = `session-${Date.now()}`;
    const session = {
      id,
      timestamp: new Date().toLocaleString(),
      duration_ms: durMs,
      transcript: text
    };
    localStorage.setItem(id, JSON.stringify(session));
    renderHistory();
  }
  function loadSessions(){
    const out = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('session-')) {
        try {
          const obj = JSON.parse(localStorage.getItem(k) || '{}');
          if (!obj.id) obj.id = k;
          out.push(obj);
        } catch {}
      }
    }
    out.sort((a, b) => {
      const tb = Number(String(b?.id ?? '').replace('session-',''));
      const ta = Number(String(a?.id ?? '').replace('session-',''));
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });
    return out;
  }
  function renderHistory(){
    const sessions = loadSessions();
    sessionCountEl.textContent = sessions.length;
    historyEl.innerHTML = '';
    sessions.forEach(s => {
      const div = document.createElement('div');
      div.className = 'hist-item';
      div.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div>
            <div><strong>${s.timestamp}</strong></div>
            <div class="sub small">${fmtTime(s.duration_ms || 0)} — ${s.id}</div>
          </div>
          <div class="row">
            <button data-act="view" data-id="${s.id}" class="secondary">View</button>
            <button data-act="copy" data-id="${s.id}" class="secondary">Copy</button>
            <button data-act="dl" data-id="${s.id}" class="secondary">Export .txt</button>
            <button data-act="del" data-id="${s.id}" class="danger">Delete</button>
          </div>
        </div>
        <pre id="p-${s.id}" style="display:none;margin-top:10px" class="transcript small"></pre>
      `;
      historyEl.appendChild(div);
    });

    historyEl.querySelectorAll('button').forEach(btn=>{
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        const raw = localStorage.getItem(id);
        let s = null;
        try { s = JSON.parse(raw || '{}'); } catch {}
        if (!s) return;

        if (act==='view'){
          const pre = document.getElementById('p-'+id);
          pre.textContent = s.transcript || '';
          pre.style.display = pre.style.display==='none' ? 'block' : 'none';
        } else if (act==='copy'){
          navigator.clipboard.writeText(s.transcript || '');
          alert('Copied.');
        } else if (act==='dl'){
          const blob = new Blob([`[${s.timestamp}] (${fmtTime(s.duration_ms||0)})\n\n${s.transcript||''}`], {type:'text/plain'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${(s.id||'session')}.txt`;
          a.click();
          URL.revokeObjectURL(a.href);
        } else if (act==='del'){
          localStorage.removeItem(id);
          renderHistory();
        }
      };
    });
  }
  renderHistory();

  document.getElementById('clearAllBtn').onclick = () => {
    if (!confirm('Delete all saved sessions?')) return;
    const keys = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('session-')) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
    renderHistory();
  };

  // ===== TOKEN FILTERS (avoid weird control artifacts like "end end") =====
  function isDisplayableTokenText(txt){
    if (!txt) return false;
    const t = String(txt);
    if (!t.trim()) return false;
    const low = t.trim().toLowerCase();
    if (low === 'end' || low === 'endpoint') return false;         // hide endpoint markers
    if (/^<[^>]+>$/.test(t)) return false;                         // hide <eos>/<...> style
    return true;
  }

  // ===== TRANSCRIPTION (with diarization grouping) =====
  function resetText(){
    finalSegments = [];
    lastRenderedLive = '';
    speakerMap.clear(); resetSpeakersUI();
    liveEl.textContent = '';
    finalEl.textContent = '';
  }

  function appendFinalToken(tok){
    const txt = String(tok.text || '');
    if (!isDisplayableTokenText(txt)) return;
    const label = labelForSpeaker(getSpeakerId(tok));
    if (finalSegments.length === 0 || finalSegments[finalSegments.length - 1].label !== label){
      finalSegments.push({ label, text: txt });
    } else {
      finalSegments[finalSegments.length - 1].text += txt;
    }
  }

  function buildLiveFromNonfinal(tokens){
    const copy = cloneSegments();
    tokens.forEach(tok => {
      const txt = String(tok.text || '');
      if (!isDisplayableTokenText(txt)) return;
      const label = labelForSpeaker(getSpeakerId(tok));
      if (copy.length === 0 || copy[copy.length - 1].label !== label){
        copy.push({ label, text: txt });
      } else {
        copy[copy.length - 1].text += txt;
      }
    });
    return renderSegments(copy);
  }

  async function startTranscription(){
    const apiKey = localStorage.getItem('soniox_api_key');
    if (!apiKey) { keyPanel.style.display='block'; apiKeyInput.focus(); return alert('Set your Soniox API key first.'); }

    setStatus('requesting permissions…', 'busy');
    resetText();
    setButtonsRecordingState(false); // during setup

    try {
      const stream = await buildMixedStream(captureSystem.checked);
      setStatus('connecting…', 'busy');

      soniox = new SonioxClient({
        apiKey: () => localStorage.getItem('soniox_api_key'),
        onStarted: () => {
          running = true;
          setStatus('LIVE', 'live');
          setButtonsRecordingState(true);
          startTimer();
        },
        onFinished: () => {
          running = false;
          setStatus('finished');
          stopTimer();
          saveSession((finalEl.textContent || '').trim(), Date.now() - startedAt);
          stopAllTracks();
          setButtonsRecordingState(false);
        },
        onError: (status, message) => {
          console.error('Soniox error:', status, message);
          setStatus(message || status, 'err');
          running = false;
          stopTimer();
          stopAllTracks();
          setButtonsRecordingState(false);
          if (status === 'api_error' && /401|unauthorized/i.test(String(message))) {
            alert('Invalid API key. Please set a valid key.');
            keyPanel.style.display='block';
          }
        }
      });

      await soniox.start({
        model: 'stt-rt-preview',
        stream,
        // Keep live partials flowing; we stop explicitly:
        enableEndpointDetection: false,
        // Multilingual in one stream:
        enableLanguageIdentification: true,
        languageHints: ['en','ar'],
        // NEW: speaker diarization
        enableSpeakerDiarization: true,

        // Build the live + final text with speaker grouping:
        onPartialResult: (result) => {
          try {
            const tokens = Array.isArray(result?.tokens) ? result.tokens : [];

            // Append finalized tokens to finalSegments
            for (const t of tokens) {
              if (t?.is_final) appendFinalToken(t);
            }
            finalEl.textContent = renderSegments(finalSegments);

            // Live preview = final + current non-finals (grouped by speaker)
            const nonfinal = tokens.filter(t => !t?.is_final);
            const liveNow = buildLiveFromNonfinal(nonfinal);
            if (liveNow !== lastRenderedLive){
              lastRenderedLive = liveNow;
              liveEl.textContent = liveNow;
            }
          } catch (e) {
            console.warn('onPartialResult parse issue:', e);
          }
        }
      });

    } catch (e) {
      console.error(e);
      if (String(e).includes('NotAllowedError')) {
        setStatus('mic/screen permission denied', 'err');
        alert('Permission denied. Enable microphone (and screen audio if selected).');
      } else if (String(e).includes('NotFoundError')) {
        setStatus('no audio device found', 'err');
        alert('No microphone found.');
      } else {
        setStatus('failed to start', 'err');
        alert('Failed to start. See console for details.');
      }
      stopAllTracks();
      setButtonsRecordingState(false);
    }
  }

  async function stopTranscription(){
    if (!running || !soniox) return;
    setStatus('stopping…', 'busy');
    stopBtn.disabled = true;
    try {
      await soniox.stop(); // waits for finalization
    } catch (e) {
      console.warn('stop error', e);
      stopTimer();
      saveSession((finalEl.textContent || '').trim(), Date.now() - startedAt);
      stopAllTracks();
      setStatus('finished');
      setButtonsRecordingState(false);
    }
  }
  function cancelTranscription(){
    if (!running || !soniox) return;
    setStatus('cancelling…', 'busy');
    cancelBtn.disabled = true;
    try { soniox.cancel(); } catch {}
    running = false;
    stopTimer();
    stopAllTracks();
    setStatus('cancelled');
    setButtonsRecordingState(false);
  }

  startBtn.onclick = startTranscription;
  stopBtn.onclick = stopTranscription;
  cancelBtn.onclick = cancelTranscription;

  // Heads-up if the environment blocks mic from file://
  if (!('mediaDevices' in navigator)) {
    setStatus('your browser blocked mic (secure context required)', 'err');
  }
</script>
</body>
</html>
