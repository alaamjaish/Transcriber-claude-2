// ====== AI FEATURES - SUMMARIZER MODULE ======
// Extracted from index.html and student.html
// Centralizes all OpenAI summarization logic

// ===== OPENAI CONFIG =====
export const OPENAI_MODEL = 'gpt-5-mini-2025-08-07';

export const SUMMARY_INSTRUCTIONS = `You are an expert AI assistant specialized in analyzing raw text transcripts from a voice recording application. Your primary goal is to intelligently discern the context of the conversation, categorize it into one of three types (Levantine Arabic Lesson, Professional Meeting, or General Conversation), and generate a structured, useful output tailored to that specific context. You must be able to handle potential inaccuracies from the speech-to-text engine.`;

export const SUMMARY_PROMPT =
 `
## **GENERAL INSTRUCTION: HANDLING TRANSCRIPTION ERRORS**

The input you receive is an automated transcription and may contain errors, typos, or nonsensical words. Your most crucial task is to use the overall context of the conversation to interpret and correct these mistakes. If a word does not make sense logically, grammatically, or contextually (e.g., a non-Arabic word in a language lesson, a nonsensical term in a business meeting), you have the authority to substitute it with the most probable intended word. Your output should reflect a coherent and logical understanding of the conversation.
---
## **CONTEXT ANALYSIS AND OUTPUT GENERATION**
Analyze the provided transcript and determine which of the following three cases it represents. Then, generate the output ONLY in the format specified for that case.
### **CASE 1: Levantine Arabic Lesson**

** Conditions for Identification:**
* The transcript contains at least two distinct speakers (e.g., "Speaker 1:", "Speaker 2:").
* The content is clearly educational and focuses on teaching or learning the Levantine dialect of Arabic. Look for keywords related to language, grammar, vocabulary, questions, and explanations.
* The transcript is of a substantial length, indicating a full-fledged lesson rather than a brief test.

** Required Output Format:**
If you identify the transcript as a Levantine Arabic Lesson, generate the following:

**##  Lesson Summary**

**###  New Vocabulary**
- **Word 1 (in Arabic script):** Meaning in English.
- **Word 2 (in Arabic script):** Meaning in English.
- *(List all new vocabulary words introduced)*

**###  Grammar Points**
- A bulleted list explaining the grammatical rules and concepts that were discussed in the lesson.
- Provide examples from the transcript where possible.

**###  Key Expressions & Phrases**
- A list of any new conversational phrases or expressions taught during the lesson.
- Provide the phrase and its English translation/context.

---

### **CASE 2: Professional Meeting**

** Conditions for Identification:**
* The transcript contains at least two distinct speakers.
* The content is professional in nature. Look for discussions about projects, tasks, deadlines, business strategy, or organizational matters.
* The transcript is long enough to be considered a formal meeting.

** Required Output Format:**
If you identify the transcript as a meeting, generate the following:

**##  Meeting Summary**

**###  Key Discussion Points**
- A concise, bulleted list of the main topics and conclusions discussed during the meeting.

**###  Action Items & Deadlines**
- **[Task/Action Item]:** Assigned to [Name/Role] - Due by [Date/Deadline].
- *(List all clear action items, who is responsible, and any mentioned deadlines.)*

**###  Participants & Roles Mentioned**
- A list of names mentioned and their context or role in the discussion.

---

### **CASE 3: General Conversation / Other**

** Conditions for Identification:**
* This is the default case. It applies if the transcript does not meet the criteria for a Lesson or a Meeting.
* This includes short test recordings (e.g., under 150 words), single-speaker monologues, or any random conversation.

** Required Output Format:**
If the transcript falls into this category, generate the following:

**## General Summary**
A brief, single-paragraph summary capturing the main points of what was said in the transcript.


`;

export const HOMEWORK_INSTRUCTIONS = `You are an expert language teacher creating homework assignments. Output ONLY Markdown with practical exercises based on the lesson content.`;

export const HOMEWORK_PROMPT = `I will give you a transcript of an Arabic–English language lesson.
Create a homework assignment that reinforces what was taught in this lesson.

The homework should include:

## Vocabulary Practice
- 5-7 key words/phrases from the lesson with translation exercises
- Use the EXACT words and phrases that appeared in the lesson transcript

## Grammar Exercises
- 3-4 fill-in-the-blank sentences using grammar patterns from the lesson
- Use similar sentence structures that appeared in the lesson

## Conversation Practice
- 2-3 short dialogue scenarios based on the lesson content
- Students should practice the expressions and phrases that were taught

## Writing Exercise
- 1 short writing prompt (3-4 sentences) using the new vocabulary and grammar
- Topic should relate directly to what was discussed in the lesson

## Review Questions
- 3-4 comprehension questions about the lesson content

Make it practical, achievable, and directly connected to the lesson content. Use Markdown formatting with clear headings and bullet points.`;

// ===== KEY MANAGEMENT =====
export function getOpenAIKey() {
  const k = localStorage.getItem('openai_api_key');
  if (!k) {
    throw new Error('OpenAI key not set.');
  }
  return k;
}

// ===== CORE AI FUNCTIONS =====
export async function openaiSummarize(markdownPrompt) {
  const key = getOpenAIKey();
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: SUMMARY_INSTRUCTIONS },
        { role: 'user', content: markdownPrompt }
      ]
    })
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || 'OpenAI API error');
  }
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

export function buildSummaryUserPrompt(transcript) {
  return `${SUMMARY_PROMPT}\n\n---\nTRANSCRIPT:\n${transcript}`;
}

// ===== CORE SUMMARY FUNCTION =====
// This function only handles the AI summarization
// Session management is left to the calling code
export async function generateSummary(transcript) {
  if (!transcript || !transcript.trim()) {
    throw new Error('No transcript provided');
  }

  const userPrompt = buildSummaryUserPrompt(transcript);
  const summary = await openaiSummarize(userPrompt);
  return summary;
}

// ===== HOMEWORK FUNCTIONS =====
export async function openaiHomework(markdownPrompt) {
  const key = getOpenAIKey();
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 1,
      messages: [
        { role: 'system', content: HOMEWORK_INSTRUCTIONS },
        { role: 'user', content: markdownPrompt }
      ]
    })
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || 'OpenAI API error');
  }
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

export function buildHomeworkUserPrompt(transcript) {
  return `${HOMEWORK_PROMPT}\n\n---\nTRANSCRIPT:\n${transcript}`;
}

// ===== CORE HOMEWORK FUNCTION =====
export async function generateHomework(transcript) {
  if (!transcript || !transcript.trim()) {
    throw new Error('No transcript provided');
  }

  const userPrompt = buildHomeworkUserPrompt(transcript);
  const homework = await openaiHomework(userPrompt);
  return homework;
}

// ===== AUTO-GENERATION STATUS TRACKING =====
const AUTO_GEN_STATUS_KEY = 'auto_generation_status';

function getAutoGenStatus() {
  try {
    return JSON.parse(localStorage.getItem(AUTO_GEN_STATUS_KEY) || '{}');
  } catch {
    return {};
  }
}

function setAutoGenStatus(sessionId, status) {
  const current = getAutoGenStatus();
  current[sessionId] = status;
  localStorage.setItem(AUTO_GEN_STATUS_KEY, JSON.stringify(current));
}

export function isGenerating(sessionId) {
  return getAutoGenStatus()[sessionId] === 'generating';
}

export function isEmpty(sessionId) {
  return getAutoGenStatus()[sessionId] === 'empty';
}

export function isAutoGenComplete(sessionId) {
  const status = getAutoGenStatus()[sessionId];
  return status === 'complete' || status === 'error';
}

export function setGeneratingStatus(sessionId) {
  setAutoGenStatus(sessionId, 'generating');
}

export function setEmptyStatus(sessionId) {
  setAutoGenStatus(sessionId, 'empty');
}

// ===== AUTOMATIC CONTENT GENERATION =====
export async function autoGenerateContent(sessionId, transcript, supabase) {
  // Guard against empty transcript
  if (!transcript || !transcript.trim()) {
    console.log('Auto-generation skipped: empty transcript');
    return;
  }

  // Check if OpenAI key exists
  try {
    getOpenAIKey();
  } catch (error) {
    console.error('Auto-generation skipped: OpenAI key not configured');
    setAutoGenStatus(sessionId, 'error');
    return;
  }

  // Mark as generating
  setAutoGenStatus(sessionId, 'generating');
  console.log(`Auto-generating content for session ${sessionId}...`);

  try {
    // Generate both summary and homework in parallel
    const [summaryMd, homeworkMd] = await Promise.all([
      generateSummary(transcript).catch(err => {
        console.error('Summary generation failed:', err);
        return null; // Don't fail the whole process if one fails
      }),
      generateHomework(transcript).catch(err => {
        console.error('Homework generation failed:', err);
        return null;
      })
    ]);

    // Update the session in Supabase with both results
    const updates = {};
    if (summaryMd) updates.summary_md = summaryMd;
    if (homeworkMd) updates.homework_md = homeworkMd;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId);
    }

    // Mark as complete
    setAutoGenStatus(sessionId, 'complete');
    console.log(`Auto-generation complete for session ${sessionId}`);

    // Trigger a history refresh to show the completed state
    if (typeof window.renderHistoryRefresh === 'function') {
      await window.renderHistoryRefresh();
    }

  } catch (error) {
    console.error('Auto-generation failed:', error);
    setAutoGenStatus(sessionId, 'error');
  }
}