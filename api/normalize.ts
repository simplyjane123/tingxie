import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface NormalizeRequest {
  raw_ocr_text: string;
  remove_pinyin: boolean;
  remove_english: boolean;
}

interface NormalizeResponse {
  sentences: string[];
  lessonName?: string;
  dropped: {
    pinyin_lines: string[];
    english_lines: string[];
    other_noise: string[];
  };
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: NormalizeRequest = await req.json();
    const { raw_ocr_text, remove_pinyin, remove_english } = body;

    if (!raw_ocr_text) {
      return new Response(JSON.stringify({ error: 'Missing raw_ocr_text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a text normalisation engine for Chinese OCR output.

Your task:
- Identify and extract the lesson header (听写 number/title) if present
- Reconstruct broken OCR lines into complete, natural Chinese sentences.
- Do not change the meaning.
- Fix obvious punctuation and spacing issues.
- Merge lines that belong to the same sentence.
- Output one complete sentence per line.

Input:
raw_ocr_text:
"""
${raw_ocr_text}
"""

Settings:
- remove_pinyin: ${remove_pinyin}
- remove_english: ${remove_english}

Rules:
1. Look for lesson headers like "听写(三)", "听写三", "听写(三)《标题》", "ting xie (3)", etc.
2. If a lesson header is found, extract it and output it on the FIRST line starting with "LESSON: "
3. Do NOT include the lesson header line as a sentence - remove it from the output sentences
4. Treat a line as pinyin if it contains only Latin letters, tone marks, spaces, or apostrophes.
5. If remove_pinyin is true, drop all pinyin-only lines and remove pinyin fragments from sentences.
6. If remove_english is true, drop English-only lines and remove English fragments from sentences.
7. Keep original meaning and wording as much as possible.
8. Do not invent new content.
9. Do not explain your steps.

Output format:
CRITICAL: Follow this exact format:
- First line: "LESSON: 听写三" (if lesson header found) OR "LESSON: none" (if no lesson header found)
- Following lines: One normalized sentence per line

Example output when lesson header is found:
LESSON: 听写(三)《妈妈,对不起》
完整句子一。
完整句子二。
完整句子三。

Example output when no lesson header:
LESSON: none
完整句子一。
完整句子二。
完整句子三。`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse plain text response - one sentence per line
    const responseText = content.text.trim();
    const lines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Extract lesson name from first line
    let lessonName: string | undefined;
    let sentences: string[];

    if (lines.length > 0 && lines[0].startsWith('LESSON:')) {
      const lessonLine = lines[0].replace('LESSON:', '').trim();
      lessonName = lessonLine !== 'none' ? lessonLine : undefined;
      sentences = lines.slice(1); // Skip the LESSON line
    } else {
      // If format is not followed, treat all lines as sentences
      sentences = lines;
    }

    // Construct the normalized response
    const normalized: NormalizeResponse = {
      sentences,
      ...(lessonName ? { lessonName } : {}),
      dropped: {
        pinyin_lines: [],
        english_lines: [],
        other_noise: []
      }
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Normalization error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to normalize text' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
