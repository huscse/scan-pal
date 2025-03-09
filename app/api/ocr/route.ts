// app/api/ocr/route.ts
import { NextResponse } from 'next/server';

// Add this line to tell Next.js this route should be dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('OCR API: Request received');

  try {
    const body = await request.json();
    const { imageUrl } = body;

    console.log('OCR API: Processing image URL:', imageUrl);

    if (!imageUrl) {
      console.error('OCR API: No image URL provided');
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 },
      );
    }

    // Validate the URL
    try {
      new URL(imageUrl);
    } catch (e) {
      console.error('OCR API: Invalid URL format:', imageUrl);
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 },
      );
    }

    // Make sure we have an API key
    const apiKey = process.env.OCRSPACE_API_KEY;
    if (!apiKey) {
      console.error('OCR API: No API key found in environment variables');
      return NextResponse.json(
        { error: 'OCR API key not configured' },
        { status: 500 },
      );
    }
    console.log('OCR API: API key is configured');

    // Test if the image is accessible
    console.log('OCR API: Testing if image is accessible...');
    try {
      const imageAccessTest = await fetch(imageUrl, { method: 'HEAD' });
      if (!imageAccessTest.ok) {
        console.error(
          `OCR API: Image is not accessible. Status: ${imageAccessTest.status}`,
        );
        return NextResponse.json(
          {
            error: `Image URL is not accessible. Status: ${imageAccessTest.status}`,
          },
          { status: 400 },
        );
      }
      console.log('OCR API: Image is accessible');
    } catch (error) {
      console.error('OCR API: Error testing image accessibility:', error);
      return NextResponse.json(
        {
          error: `Could not access the image URL: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
        { status: 400 },
      );
    }

    // Call OCR.space API
    console.log('OCR API: Creating form data for OCR.space');
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('url', imageUrl);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');

    console.log('OCR API: Sending request to OCR.space');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    console.log('OCR API: Response status:', response.status);

    const responseText = await response.text();
    console.log(
      'OCR API: Raw response:',
      responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
    );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('OCR API: Failed to parse JSON response:', error);
      return NextResponse.json(
        { error: 'Invalid response from OCR service' },
        { status: 500 },
      );
    }

    if (!response.ok || data.OCRExitCode !== 1) {
      console.error('OCR API: Error response from service:', data);
      return NextResponse.json(
        {
          error:
            data.ErrorMessage || 'Failed to process image with OCR service',
          details: data,
        },
        { status: 500 },
      );
    }

    // Extract text from OCR.space response
    const text = data.ParsedResults?.[0]?.ParsedText || '';
    console.log(
      'OCR API: Extracted text:',
      text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    );

    return NextResponse.json({ text, details: data });
  } catch (error) {
    console.error('OCR API: Unexpected error:', error);
    return NextResponse.json(
      {
        error: `Failed to process the image: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }
}
