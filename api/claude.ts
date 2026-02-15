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
    const { ocrText, wantPinyin, wantEnglish } = req.body;
    if (!ocrText) {
      return res.status(400).json({ error: 'No OCR text provided' });
    }

    const systemPrompt = `You are a Chinese language learning assistant. Extract spelling/dictation words from OCR text of a Chinese spelling list.

The OCR text may contain:
- Chinese characters (汉字)
- Pinyin with tone marks (e.g., wǒ, nǐ, tā)
- English translations
- Numbers, formatting, headers, and other noise

Your task:
1. Extract ONLY the actual vocabulary words (Chinese characters)
2. Extract pinyin from the text if present, otherwise infer it with correct tone marks
3. ${wantEnglish ? 'Extract English translations if present' : 'Skip English translations'}
4. Ignore headers, instructions, dates, and formatting

Return a JSON array:
[
  {
    "characters": "汉字",
    "pinyin": "hàn zì",
    "english": "Chinese characters"
  }
]

Rules:
- Only include items with Chinese characters
- For pinyin: use what's in the text, or infer with correct tone marks (ā, á, ǎ, à, etc.)
- Multi-character words: pinyin has syllables separated by spaces (e.g., "yǔ yī" for "雨衣")
- If English is missing or not requested, use empty string ""
- Skip headers like "听写三", dates, instructions, page numbers
- Remove duplicates`;

    const userPrompt = `Extract vocabulary from this OCR text:

${ocrText}

Return a JSON array of vocabulary items.`;

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
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({
        error: errorData?.error?.message || `Claude API failed: ${response.status}`,
      });
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'No response from Claude' });
    }

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = content.match(/\[[\s\S]*\]/);
    }

    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', content);
      return res.status(500).json({
        error: 'Could not parse AI response',
        rawResponse: content.substring(0, 200)
      });
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const items = JSON.parse(jsonText);

    return res.status(200).json({ items });
  } catch (e: any) {
    console.error('Claude API error:', e);
    return res.status(500).json({ error: e.message || 'Claude processing failed' });
  }
}
