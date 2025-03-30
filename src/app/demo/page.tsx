'use client';

import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const DemoPage = () => {
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [timer, setTimer] = useState(30); // 30-second demo timer
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    listening
  } = useSpeechRecognition();

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (textAreaRef.current && transcript) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    }
  }, [transcript]);

  // Setup space key shortcut for start/stop recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle space key for start/stop recording
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling the page
        
        if (isListening) {
          stopListening();
        } else if (timer > 0) {
          startListening();
        } else {
          toast.info('Demo time limit reached', {
            description: 'Sign up for unlimited recording time!'
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListening, timer]);

  // Setup audio visualization
  const setupAudioVisualization = async () => {
    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        source.connect(analyserRef.current);
      }
      
      const updateAudioLevel = () => {
        if (analyserRef.current && dataArrayRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
          setAudioLevel(Math.min(100, average * 2)); // Scale to 0-100 range
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // Cleanup audio visualization
  const cleanupAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    setAudioLevel(0);
  };

  useEffect(() => {
    if (isListening) {
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      setupAudioVisualization();
      
      // Simulate progress for visual feedback
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 300);
      
      // Demo timer
      timerRef.current = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            stopListening();
            setShowLoginPrompt(true);
            toast.info('Demo time limit reached', {
              description: 'Sign up for unlimited recording time!'
            });
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        if (timerRef.current) clearInterval(timerRef.current);
        SpeechRecognition.stopListening();
        cleanupAudioVisualization();
      };
    } else {
      SpeechRecognition.stopListening();
      cleanupAudioVisualization();
      setProgress(0);
    }
  }, [isListening]);
  
  const startListening = () => {
    resetTranscript();
    setTimer(30);
    setShowLoginPrompt(false);
    setIsListening(true);
  };
  
  const stopListening = () => {
    setIsListening(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Browser Not Supported</h1>
            <p className="text-muted-foreground">
              Your browser doesn't support speech recognition.
              Please try using Chrome, Edge, or another modern browser.
            </p>
          </div>
          <div className="flex justify-center">
            <Link 
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isMicrophoneAvailable) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Microphone Access Required</h1>
            <p className="text-muted-foreground">
              Please allow microphone access to use this feature.
            </p>
          </div>
          <div className="flex justify-center">
            <Link 
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-2">Speech-to-Text Demo</h1>
          </div>
          <p className="text-muted-foreground">
            Try our speech recognition technology - limited to 30 seconds in demo mode
          </p>
          <div className="mt-2">
            <div className="text-sm text-muted-foreground">
              Press <kbd className="px-2 py-1 bg-muted rounded border">SPACE</kbd> to start/stop recording
            </div>
          </div>
          <Separator className="mt-4" />
        </header>

        <main className="space-y-8">
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <div className="space-y-6">
              {/* Audio visualization */}
              <div className="relative h-8 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className="absolute inset-0 origin-left bg-primary transition-transform duration-150 ease-in-out"
                  style={{ transform: `translateX(${audioLevel - 100}%)` }}
                />
                {isListening && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-foreground">
                      {listening ? 'Listening...' : 'Ready'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Timer for demo */}
              {isListening && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Demo time remaining</span>
                    <span>{timer} seconds</span>
                  </div>
                  <Progress value={(timer / 30) * 100} className="h-2" />
                </div>
              )}
              
              {/* Progress bar */}
              {isListening && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Recording in progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              {/* Transcript display */}
              <div className="flex flex-col">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Transcript</span>
                  {transcript && <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
                    </svg>
                    Scroll to see more
                  </span>}
                </div>
                <div 
                  ref={textAreaRef}
                  className="min-h-[200px] max-h-[300px] p-3 bg-muted/50 border border-border rounded-md overflow-y-auto whitespace-pre-wrap"
                >
                  {transcript || (
                    <span className="text-muted-foreground">
                      {isListening 
                        ? 'Speak now... Your words will appear here.'
                        : 'Click the "Start Recording" button and begin speaking.'
                      }
                    </span>
                  )}
                </div>
              </div>
              
              {/* Control buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-3 rounded-md font-medium min-w-36"
                  >
                    Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    disabled={timer === 0}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium min-w-36 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Recording
                  </button>
                )}
                <button
                  onClick={resetTranscript}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-md font-medium min-w-36"
                >
                  Clear Transcript
                </button>
              </div>
            </div>
          </div>
          
          {/* Demo limitation notice */}
          <div className={`bg-muted p-6 rounded-lg border-l-4 border-primary ${showLoginPrompt ? 'animate-pulse' : ''}`}>
            <h2 className="text-xl font-semibold mb-2">Demo Limitations</h2>
            <p className="mb-4 text-muted-foreground">
              You're currently using our demo version with the following limitations:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-1 text-muted-foreground">
              <li>Limited to 30 seconds of recording time</li>
              <li>English language only</li>
              <li>Cannot save transcripts</li>
              <li>Cannot edit or export text</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link
                href="/register"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium text-center"
              >
                Sign Up for Full Access
              </Link>
              <Link
                href="/login"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-md font-medium text-center"
              >
                Log In
              </Link>
            </div>
          </div>
        </main>
        
        <footer className="mt-16 pt-6 border-t border-border text-center text-muted-foreground">
          <p>
            <Link href="/" className="hover:underline">Back to Home</Link>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DemoPage; 