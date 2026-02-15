const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OCR service not configured' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Strip data URI prefix if present
    const content = image.replace(/^data:image\/\w+;base64,/, '');

    const body = {
      requests: [
        {
          image: { content },
          features: [{ type: 'TEXT_DETECTION' }],
          imageContext: { languageHints: ['zh-Hans', 'en'] },
        },
      ],
    };

    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData?.error?.message || `OCR request failed: ${response.status}`,
      });
    }

    const data = await response.json();
    const fullText = data?.responses?.[0]?.fullTextAnnotation?.text ?? '';

    if (!fullText) {
      return res.status(400).json({ error: 'No text detected in the image' });
    }

    return res.status(200).json({ text: fullText });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'OCR failed' });
  }
}
