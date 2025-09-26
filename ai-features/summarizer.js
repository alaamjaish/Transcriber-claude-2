// ====== AI FEATURES - SUMMARIZER MODULE ======
// Extracted from index.html and student.html
// Centralizes all OpenAI summarization logic

// ===== OPENAI CONFIG =====
export const OPENAI_MODEL = 'gpt-5-nano';

export const SUMMARY_INSTRUCTIONS = `You are an expert levant Arabic–English lesson summarizer. Output ONLY Markdown with the sections requested.`;

export const SUMMARY_PROMPT = `You will receive a transcript of a Levant Arabic–English lesson.
Your task is to create a structured lesson summary in Syrian/Levantine Arabic only (no English except inside translation columns).
The transcript may contain errors, typos, or misheard words.
Always:

Understand the context (Arabic learning).

Correct mistakes to natural Syrian Arabic.

Replace anything nonsensical with the intended meaning.

Output Format: (use Markdown headings and tables)

Vocabulary & Phrases

Create a table with these columns:

Arabic (Levantine)	English Meaning	Example Sentence (Arabic)
word/phrase 1	meaning	short natural Syrian example
word/phrase 2	meaning	example

Include all key words and expressions taught or practiced in the lesson.

Cultural Notes

List any cultural insights, customs, or usage tips mentioned in the lesson.

If nothing appears, write: (ما في ملاحظات ثقافية بهالدرس).

Grammar Highlights

Explain rules or corrections that came up.

Give simple examples in Syrian Arabic.

Key Expressions & Functional Language

Group ready-to-use phrases by function, for example:

Asking questions: …

Agreeing / Disagreeing: …

Giving opinions: …

Daily interactions: …

Practice Sentences / Mini-Dialogue

Write a short natural conversation or 5–6 practice sentences using the new vocabulary and grammar.

Critical Requirements

Output only in Syrian/Levantine Arabic (Arabic script).

Keep it clear, organized, and reusable for teaching.

Correct transcription errors automatically.`;

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