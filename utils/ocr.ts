export async function recognizeImage(base64Image: string): Promise<string> {
  const content = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: content }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `OCR request failed: ${response.status}`);
  }

  return data.text;
}
