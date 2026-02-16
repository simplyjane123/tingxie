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
1. Treat a line as pinyin if it contains only Latin letters, tone marks, spaces, or apostrophes.
2. If remove_pinyin is true, drop all pinyin-only lines and remove pinyin fragments from sentences.
3. If remove_english is true, drop English-only lines and remove English fragments from sentences.
4. Keep original meaning and wording as much as possible.
5. Do not invent new content.
6. Do not explain your steps.

Output format:
CRITICAL: Output ONLY the normalized Chinese sentences, one per line. No JSON, no explanations, no extra text.
Just the sentences themselves, each on its own line.

Example output:
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

    // Split by newlines and filter out empty lines
    const sentences = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Construct the normalized response
    const normalized: NormalizeResponse = {
      sentences,
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
