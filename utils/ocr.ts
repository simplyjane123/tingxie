const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export async function recognizeImage(base64Image: string, apiKey: string): Promise<string> {
  // Strip data URI prefix if present
  const content = base64Image.replace(/^data:image\/\w+;base64,/, '');

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
    throw new Error(errorData?.error?.message || `OCR request failed: ${response.status}`);
  }

  const data = await response.json();
  const fullText = data?.responses?.[0]?.fullTextAnnotation?.text ?? '';

  if (!fullText) {
    throw new Error('No text detected in the image');
  }

  return fullText;
}
