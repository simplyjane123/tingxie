const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TTS service not configured' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Longer sentences get a faster rate for more natural flow
    const speakingRate = text.length > 3 ? 0.90 : 0.70;

    const body = {
      input: { text },
      voice: {
        languageCode: 'cmn-CN',
        name: 'cmn-CN-Wavenet-A', // Female Mandarin voice with accurate tones
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
      },
    };

    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData?.error?.message || `TTS request failed: ${response.status}`,
      });
    }

    const data = await response.json();
    const audioContent = data?.audioContent;

    if (!audioContent) {
      return res.status(500).json({ error: 'No audio returned' });
    }

    return res.status(200).json({ audio: audioContent });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'TTS failed' });
  }
}
