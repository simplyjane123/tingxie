const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API not configured' });
  }

  try {
    const { ocrText, includesPinyin } = req.body;
    if (!ocrText) {
      return res.status(400).json({ error: 'No OCR text provided' });
    }

    const systemPrompt = `You are a Chinese language learning assistant. Your task is to extract spelling/dictation words from OCR text of a Chinese spelling list.

The OCR text may contain:
- Chinese characters (汉字)
- Pinyin with tone marks (e.g., wǒ, nǐ, tā)
- English translations
- Numbers, formatting, headers, and other noise

Your goal:
1. Extract ONLY the actual vocabulary words (Chinese characters)
2. Identify the corresponding pinyin if present in the text
3. Extract English translations if present
4. Ignore headers, instructions, dates, and formatting

Return a JSON array of items with this structure:
[
  {
    "characters": "汉字",
    "pinyin": "hàn zì",
    "english": "Chinese characters"
  }
]

Rules:
- Only include words that have Chinese characters
- If pinyin is missing from the OCR but you can infer it from the characters, include it with tone marks
- If English is missing, leave it as empty string ""
- Keep multi-character words together (e.g., "雨衣" not "雨" + "衣")
- Remove duplicates
- Skip any non-vocabulary content (instructions, dates, etc.)`;

    const userPrompt = `Here is the OCR text from a Chinese spelling list:

${ocrText}

${includesPinyin ? 'This list INCLUDES pinyin. Extract the pinyin from the text.' : 'This list does NOT include pinyin. Infer the correct pinyin with tone marks for each word.'}

Extract the vocabulary words and return them as a JSON array.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData?.error?.message || `Claude API request failed: ${response.status}`,
      });
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'No response from Claude' });
    }

    // Extract JSON from the response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse Claude response' });
    }

    const items = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ items });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Claude processing failed' });
  }
}
