'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Loader2, RefreshCw, ImageOff, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ScanPage() {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Set auth token for Supabase client
  useEffect(() => {
    const setSupabaseAuth = async () => {
      console.log('Setting up Supabase auth...');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          console.log('Session found, user is authenticated');
          // This sets the auth header for all Supabase requests
          supabase.auth.setSession(session);
        } else {
          console.log('No session found, user not authenticated');
        }
      } catch (error) {
        console.error('Error setting up Supabase auth:', error);
      }
    };

    setSupabaseAuth();
  }, []);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
        navigator.userAgent,
      );
      setIsMobile(isMobileDevice);
      console.log('Device type:', isMobileDevice ? 'Mobile' : 'Desktop');
    };
    checkMobile();
  }, []);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo((prev) => [...prev, message]);
  };

  const enableCamera = async () => {
    setCameraError(null);
    try {
      addDebugInfo('Requesting camera permissions...');
      // Explicitly request camera permission
      const constraints = {
        video: {
          width: { ideal: 2560, min: 1280 },
          height: { ideal: 1440, min: 720 },
          facingMode: isMobile ? 'environment' : 'user',
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addDebugInfo('Camera permission granted');

      // If we reach here, permission was granted
      setCameraEnabled(true);
      toast.success('Camera enabled', {
        description: 'You can now scan your assignment',
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      const errorMessage =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera access was denied. Please enable camera permissions in your browser settings.'
          : 'Could not access camera. Make sure your device has a working camera.';

      addDebugInfo(`Camera error: ${errorMessage}`);
      setCameraError(errorMessage);

      toast.error('Camera access failed', {
        description: 'Please check your browser settings and try again',
      });
    }
  };

  const capture = async () => {
    if (!webcamRef.current) {
      toast.error('Error', {
        description: 'Camera not ready. Please try again.',
      });
      return;
    }

    setIsProcessing(true);
    setDebugInfo([]);
    try {
      addDebugInfo('1. Taking screenshot...');
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      addDebugInfo('2. Screenshot captured successfully');

      // Store the captured image for display
      setCapturedImage(imageSrc);

      // First convert base64 to blob
      addDebugInfo('3. Converting image to blob...');
      const base64Data = imageSrc.split(',')[1];
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then(
        (res) => res.blob(),
      );
      addDebugInfo(
        `4. Blob created, size: ${(blob.size / 1024).toFixed(2)} KB`,
      );

      // Get current user
      addDebugInfo('5. Getting current user...');
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        addDebugInfo(`User error: ${userError.message}`);
        throw new Error(`Authentication error: ${userError.message}`);
      }

      if (!userData.user) {
        addDebugInfo('No authenticated user found');
        throw new Error('You must be logged in to scan');
      }
      addDebugInfo(`6. User authenticated: ${userData.user.id}`);

      // Upload to Supabase Storage with user ID in path
      const fileName = `${userData.user.id}/scan_${Date.now()}.png`;
      addDebugInfo(`7. Uploading to storage as: ${fileName}`);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('scans')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        addDebugInfo(`Upload error: ${uploadError.message}`);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
      addDebugInfo('8. Image uploaded successfully');

      // Get the public URL for the uploaded image
      addDebugInfo('9. Getting public URL...');
      const {
        data: { publicUrl },
      } = supabase.storage.from('scans').getPublicUrl(fileName);
      addDebugInfo(`10. Public URL: ${publicUrl}`);

      // Verify image is accessible
      addDebugInfo('11. Testing image accessibility...');
      try {
        const imageTestResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (imageTestResponse.ok) {
          addDebugInfo('12. Image is publicly accessible');
        } else {
          addDebugInfo(
            `Image accessibility check failed: ${imageTestResponse.status}`,
          );
        }
      } catch (error) {
        addDebugInfo(
          `Image accessibility check error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // Continue anyway, the OCR service might still be able to access it
      }

      // Call your OCR API with the image URL
      addDebugInfo('13. Calling OCR API...');
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      addDebugInfo(`14. OCR API response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = 'Failed to process image';
        try {
          const errorData = await response.json();
          addDebugInfo(`OCR API error: ${JSON.stringify(errorData)}`);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse JSON, just use the status text
          addDebugInfo(
            `Failed to parse error response: ${response.statusText}`,
          );
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      addDebugInfo(`15. OCR API returned data: ${JSON.stringify(data)}`);

      if (!data.text || !data.text.trim()) {
        addDebugInfo('16. No text detected in the image');
        throw new Error(
          'No text detected. Try adjusting the lighting and camera position.',
        );
      }

      addDebugInfo(`17. Text detected (${data.text.length} characters)`);
      setResult(data.text);
      toast.success('Text captured', {
        description: 'Text successfully extracted from image',
      });
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process image. Please try again with better lighting.';

      addDebugInfo(`ERROR: ${errorMessage}`);

      toast.error('Error', {
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const retake = () => {
    setResult('');
    setCapturedImage(null);
    setDebugInfo([]);
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">
          Assignment Scanner
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
          <Card className="p-4">
            {cameraEnabled ? (
              <>
                <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-black">
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/png"
                      videoConstraints={{
                        width: 2560,
                        height: 1440,
                        facingMode: isMobile ? 'environment' : 'user',
                      }}
                      className="w-full h-full object-cover"
                      audio={false}
                      mirrored={false}
                    />
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 animate-spin text-white" />
                        <p className="text-white text-sm">
                          Processing with cloud OCR...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-center gap-4">
                  {capturedImage ? (
                    <Button
                      onClick={retake}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Retake
                    </Button>
                  ) : (
                    <Button
                      onClick={capture}
                      disabled={isProcessing}
                      size="lg"
                      className="w-full"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Capture & Scan
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 md:p-12 space-y-6 min-h-[320px]">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <ImageOff className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">
                    Camera access required
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {cameraError ||
                      'We need access to your camera to scan your assignment. Click the button below to enable your camera.'}
                  </p>
                </div>
                <Button onClick={enableCamera} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Enable Camera
                </Button>
                {cameraError && (
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    If you've already allowed camera access but can't see the
                    camera, try refreshing the page.
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Scan Results</h2>
            <div className="min-h-[320px] md:min-h-[400px] p-4 bg-muted rounded-lg overflow-auto">
              {result ? (
                <div className="space-y-4">
                  <p className="whitespace-pre-wrap font-mono text-sm">
                    {result}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(result);
                        toast.success('Copied', {
                          description: 'Text copied to clipboard',
                        });
                      }}
                      variant="secondary"
                      className="w-full"
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      onClick={() => {
                        // Here you would save this to the database
                        toast.success('Saved', {
                          description: 'Text saved for analysis',
                        });
                      }}
                      className="w-full"
                    >
                      Save & Analyze
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <p className="text-muted-foreground text-center">
                    {isProcessing
                      ? 'Processing image with cloud OCR...'
                      : cameraEnabled
                      ? capturedImage
                        ? 'Processing your image...'
                        : 'Captured text will appear here'
                      : 'Enable camera access to start scanning'}
                  </p>

                  {debugInfo.length > 0 && (
                    <div className="w-full mt-4 text-xs text-muted-foreground overflow-auto max-h-[200px] border border-border p-2 rounded">
                      <h4 className="font-semibold mb-1">Debug Information:</h4>
                      {debugInfo.map((info, index) => (
                        <div
                          key={index}
                          className={
                            info.startsWith('ERROR') ? 'text-red-500' : ''
                          }
                        >
                          {info}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {cameraEnabled && !capturedImage && !result && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  Tips for better scanning:
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure good lighting on the document</li>
                  <li>• Hold the camera steady and parallel to the paper</li>
                  <li>• Make sure text is in focus before capturing</li>
                  <li>• Avoid shadows and glare on the paper</li>
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
