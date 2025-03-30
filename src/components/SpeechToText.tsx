'use client';

import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { saveAs } from 'file-saver';
import { transcriptService, SavedTranscript } from '@/services/transcriptService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileTextIcon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrashManagement from '@/components/TrashManagement';
import EditTranscriptButton from '@/components/buttons/EditTranscriptButton';
import DeleteTranscriptButton from '@/components/buttons/DeleteTranscriptButton';
import DownloadTranscriptButton from '@/components/buttons/DownloadTranscriptButton';
import EditTranscriptDialog from '@/components/EditTranscriptDialog';
import SessionRefresh from '@/components/SessionRefresh';

// Define the interface for component props
interface SpeechToTextProps {
  userDetails?: {
    id: string;
    email: string;
  };
  onTranscriptCreated?: (transcriptId: string) => void;
}

const MAX_CHARACTERS = 5000; // Maximum character limit

const SpeechToText = ({ userDetails, onTranscriptCreated }: SpeechToTextProps) => {
  const [isListening, setIsListening] = useState(false);
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>([]);
  const [trashedTranscripts, setTrashedTranscripts] = useState<SavedTranscript[]>([]);
  const [serverSaving, setServerSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<SavedTranscript | null>(null);
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentTab, setCurrentTab] = useState('transcripts');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [transcriptToEdit, setTranscriptToEdit] = useState<SavedTranscript | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [languageSearchQuery, setLanguageSearchQuery] = useState<string>('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    listening
  } = useSpeechRecognition();

  // Track current transcript to ensure keyboard shortcut properly saves it
  useEffect(() => {
    if (transcript) {
      setCurrentTranscript(transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (textAreaRef.current && transcript) {
      textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
    }
  }, [transcript]);

  // Load saved and trashed transcripts on mount and after changes
  const refreshTranscripts = () => {
    // Pass the user ID to get only user-specific transcripts
    setSavedTranscripts(transcriptService.getSavedTranscripts(userDetails?.id));
    setTrashedTranscripts(transcriptService.getTrashTranscripts(userDetails?.id));
  };

  useEffect(() => {
    refreshTranscripts();
  }, []);

  // Setup keyboard shortcut for start/stop recording (Alt+Space instead of Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Changed to Alt+Space instead of just Space
      if (e.code === 'Space' && e.altKey && keyboardShortcutsEnabled) {
        e.preventDefault(); // Prevent scrolling the page
        
        if (isListening) {
          // Need to store transcript before stopping to ensure it's saved
          const textToSave = currentTranscript || transcript;
          setIsListening(false);
          SpeechRecognition.stopListening();
          
          // Enter editing mode instead of saving directly
          if (textToSave.trim()) {
            setEditedTranscript(textToSave);
            setIsEditing(true);
            toast.info('Recording complete', {
              description: 'You can now edit your transcript before saving'
            });
          } else {
            toast.info('Recording stopped', {
              description: 'No speech detected'
            });
          }
        } else {
          // If in editing mode, append new recording to existing text
          if (isEditing) {
            const currentText = editedTranscript;
            resetTranscript();
            setCurrentTranscript('');
            setIsEditing(false);
            setIsListening(true);
            toast.info('Recording resumed', {
              description: 'New recording will be appended to your existing text'
            });
            
            // Store the current text to append later
            sessionStorage.setItem('previousEditText', currentText);
          } else {
            handleStartListening();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListening, keyboardShortcutsEnabled, transcript, currentTranscript, isEditing, editedTranscript]);

  // Append previous text after stopping recording that was started from edit mode
  useEffect(() => {
    if (!isListening && transcript && sessionStorage.getItem('previousEditText')) {
      const previousText = sessionStorage.getItem('previousEditText') || '';
      const newText = previousText + (previousText ? '\n\n' : '') + transcript;
      setEditedTranscript(newText);
      setIsEditing(true);
      sessionStorage.removeItem('previousEditText');
      toast.info('Recording added to previous text', {
        description: 'You can continue editing your combined transcript'
      });
    }
  }, [isListening, transcript]);

  // Add a keyboard shortcut handler for the editing mode - fixed Escape key handling
  useEffect(() => {
    if (!isEditing) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (editedTranscript.trim()) {
          handleManualSave();
        }
      }
      
      // Escape to cancel - fixed by using keyup instead of keydown
      if (e.key === 'Escape') {
        // Using a separate handler for Escape to avoid conflicts
        e.stopPropagation();
      }
    };

    const handleEscapeUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Discard changes and exit editing mode?')) {
          handleCancelEdit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleEscapeUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleEscapeUp);
    };
  }, [isEditing, editedTranscript]);

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
      SpeechRecognition.startListening({ continuous: true, language: selectedLanguage });
      setupAudioVisualization();
      
      // Simulate progress for visual feedback
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        SpeechRecognition.stopListening();
        cleanupAudioVisualization();
      };
    } else {
      SpeechRecognition.stopListening();
      cleanupAudioVisualization();
      setProgress(0);
    }
  }, [isListening, selectedLanguage]);

  const handleStartListening = () => {
    resetTranscript();
    setCurrentTranscript('');
    setIsListening(true);
    setProgress(0);
    toast.info('Listening started', {
      description: 'Speak clearly into your microphone (press SPACE to stop)'
    });
  };

  const handleStopListening = async () => {
    // Need to store transcript before setting isListening to false
    const textToSave = currentTranscript || transcript;
    setIsListening(false);
    setProgress(100);
    
    // Instead of saving automatically, enter editing mode
    if (textToSave.trim()) {
      // If we have previous text (because recording was started from edit mode), append to it
      if (sessionStorage.getItem('previousEditText')) {
        const previousText = sessionStorage.getItem('previousEditText') || '';
        setEditedTranscript(previousText + (previousText ? '\n\n' : '') + textToSave);
        sessionStorage.removeItem('previousEditText');
      } else {
        // Initialize the edited transcript with the current text
        setEditedTranscript(textToSave);
      }
      
      setIsEditing(true);
      toast.info('Recording complete', {
        description: 'You can now edit your transcript before saving'
      });
    } else {
      toast.info('Recording stopped', {
        description: 'No speech detected'
      });
    }
  };

  // Update the manual save function to use editedTranscript
  const handleManualSave = async () => {
    if (editedTranscript.trim()) {
      await saveToServer(editedTranscript);
      setIsEditing(false);
      setEditedTranscript(''); // Clear edited transcript after saving
      resetTranscript();
      setCurrentTranscript(''); // Also clear current transcript after saving
    } else {
      toast.error('Cannot save empty transcript');
    }
  };

  // Add a function to cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTranscript('');
  };

  const handleSaveToFile = () => {
    if (transcript) {
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `speech-transcript-${new Date().toISOString().replace(/:/g, '-')}.txt`);
      
      toast.success('Transcript downloaded', {
        description: 'Your speech has been saved as a text file'
      });
    }
  };

  const handleViewTranscript = (transcript: SavedTranscript) => {
    setSelectedTranscript(transcript);
    setShowTranscriptDialog(true);
    // Temporarily disable keyboard shortcuts when dialog is open
    setKeyboardShortcutsEnabled(false);
  };

  const handleEditTranscript = (transcript: SavedTranscript) => {
    setTranscriptToEdit(transcript);
    setShowEditDialog(true);
    setKeyboardShortcutsEnabled(false);
  };

  const handleDeleteTranscript = (id: string) => {
    if (transcriptService.moveToTrash(id)) {
      toast.success('Transcript moved to trash');
      refreshTranscripts();
    } else {
      toast.error('Failed to delete transcript');
    }
  };

  const handleRestoreTranscript = (id: string, showNotification = false) => {
    // Only show notification if explicitly requested (for direct restores, not from the button)
    if (transcriptService.restoreFromTrash(id)) {
      if (showNotification) {
        toast.success('Transcript restored');
      }
      refreshTranscripts();
    } else {
      toast.error('Failed to restore transcript');
    }
  };

  const handlePermanentDeleteTranscript = (id: string) => {
    // Just perform the operation and refresh without showing a notification
    // The TrashManagement component will handle showing the notification
    if (transcriptService.permanentlyDelete(id)) {
      refreshTranscripts();
    } else {
      toast.error('Failed to delete transcript');
    }
  };

  const handleEmptyTrash = () => {
    // Just perform the operation and refresh without showing a notification
    // The TrashManagement component will handle showing the notification
    if (transcriptService.emptyTrash()) {
      refreshTranscripts();
    } else {
      toast.error('Failed to empty trash');
    }
  };

  // Re-enable keyboard shortcuts when dialog closes
  useEffect(() => {
    if (!showTranscriptDialog && !showEditDialog) {
      setKeyboardShortcutsEnabled(true);
    }
  }, [showTranscriptDialog, showEditDialog]);

  // Language options based on common browser speech recognition support
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish (Spain)' },
    { value: 'es-MX', label: 'Spanish (Mexico)' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'pt-PT', label: 'Portuguese (Portugal)' },
    { value: 'ru-RU', label: 'Russian' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'zh-TW', label: 'Chinese (Traditional)' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'ar-SA', label: 'Arabic' },
    { value: 'hi-IN', label: 'Hindi' },
    { value: 'nl-NL', label: 'Dutch' },
    { value: 'pl-PL', label: 'Polish' },
    { value: 'tr-TR', label: 'Turkish' },
    { value: 'sv-SE', label: 'Swedish' },
    { value: 'da-DK', label: 'Danish' },
    { value: 'fi-FI', label: 'Finnish' },
    { value: 'no-NO', label: 'Norwegian' },
    { value: 'cs-CZ', label: 'Czech' },
    { value: 'hu-HU', label: 'Hungarian' },
    { value: 'el-GR', label: 'Greek' },
    { value: 'he-IL', label: 'Hebrew' },
    { value: 'id-ID', label: 'Indonesian' },
    { value: 'ms-MY', label: 'Malay' },
    { value: 'th-TH', label: 'Thai' },
    { value: 'vi-VN', label: 'Vietnamese' },
    { value: 'ro-RO', label: 'Romanian' },
    { value: 'bg-BG', label: 'Bulgarian' },
    { value: 'uk-UA', label: 'Ukrainian' },
    { value: 'sk-SK', label: 'Slovak' },
    { value: 'sl-SI', label: 'Slovenian' },
    { value: 'sr-RS', label: 'Serbian' },
    { value: 'hr-HR', label: 'Croatian' },
    { value: 'lt-LT', label: 'Lithuanian' },
    { value: 'lv-LV', label: 'Latvian' },
    { value: 'et-EE', label: 'Estonian' },
    { value: 'fa-IR', label: 'Persian' }
  ];

  // Filter languages based on search query
  const filteredLanguageOptions = languageOptions.filter(
    (language) =>
      language.label.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
      language.value.toLowerCase().includes(languageSearchQuery.toLowerCase())
  );

  const handleLanguageSelection = (value: string) => {
    setSelectedLanguage(value);
    setShowLanguageDropdown(false);
    
    if (isListening) {
      // Restart listening with new language
      SpeechRecognition.stopListening();
      setTimeout(() => {
        SpeechRecognition.startListening({ continuous: true, language: value });
      }, 100);
      
      toast.info(`Language changed to ${languageOptions.find(lang => lang.value === value)?.label}`, {
        description: 'Speech recognition will now detect this language'
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownRef]);

  // Close dropdown when Escape key is pressed
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && showLanguageDropdown) {
        setShowLanguageDropdown(false);
      }
    }

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showLanguageDropdown]);

  /**
   * Store transcript in browser's localStorage with language info
   */
  const storeTranscriptLocally = (text: string) => {
    try {
      // Create new transcript object with language information
      const newTranscript: SavedTranscript = {
        id: Date.now().toString(),
        text,
        timestamp: new Date().toISOString(),
        language: selectedLanguage,
        userId: userDetails?.id // Include user ID
      };
      
      transcriptService.storeTranscriptWithMetadata(newTranscript);
      refreshTranscripts();
    } catch (error) {
      console.error('Error storing transcript locally:', error);
    }
  };

  const saveToServer = async (textToSave = '') => {
    // Use passed text or fall back to transcript
    const finalText = textToSave || currentTranscript || transcript;
    
    if (!finalText.trim()) return;
    
    setServerSaving(true);
    
    try {
      // Generate a title from the first few words of the transcript
      const words = finalText.trim().split(/\s+/);
      const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
      
      // Check if user is logged in
      if (!userDetails?.id) {
        // No user ID, save locally only
        storeLocally(finalText);
        toast.info('Saved locally', {
          description: 'Log in to save transcripts to your account'
        });
        return;
      }
      
      // Try saving to server
      let retries = 0;
      const maxRetries = 2;
      let savedSuccessfully = false;
      let lastError = null;
      
      while (retries <= maxRetries && !savedSuccessfully) {
        try {
          const result = await transcriptService.saveTranscriptToServer(
            finalText,
            selectedLanguage,
            userDetails.id,
            title
          );
          
          if (result && result.success) {
            resetTranscript();
            setCurrentTranscript('');
            toast.success('Saved to server', {
              description: 'Your transcript has been saved successfully'
            });
            refreshTranscripts();
            if (onTranscriptCreated && result.transcriptId) {
              onTranscriptCreated(result.transcriptId);
            }
            savedSuccessfully = true;
          } else {
            // Handle known errors
            const errorMessage = result?.message || 'Unknown error';
            if (errorMessage.includes('Authentication failed') || 
                errorMessage.includes('Invalid authentication token') ||
                errorMessage.includes('Auth session missing') ||
                errorMessage.includes('You must be logged in')) {
              setAuthError(true); // Show the session refresh component
              lastError = errorMessage;
              break; // Don't retry auth issues
            } else {
              lastError = errorMessage;
              retries++;
              if (retries <= maxRetries) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        } catch (error: any) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          if (lastError.includes('Authentication failed') || 
              lastError.includes('Unauthorized') ||
              lastError.includes('Auth session missing') ||
              lastError.includes('You must be logged in')) {
            setAuthError(true);
            break;
          }
          retries++;
          if (retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we couldn't save to server after retries, save locally and show error
      if (!savedSuccessfully && !authError) {
        storeLocally(finalText);
        toast.error('Failed to save to server', {
          description: `Saved locally instead. Error: ${lastError || 'Unknown error'}`
        });
      }
    } catch (error) {
      toast.error('Error saving transcript', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      // Fallback to local save
      storeLocally(finalText);
    } finally {
      setServerSaving(false);
    }
  };

  // Helper for storing locally
  const storeLocally = (text: string) => {
    if (!text.trim()) return;
    
    try {
      transcriptService.storeTranscriptLocally(text, selectedLanguage, userDetails?.id);
      resetTranscript();
      setCurrentTranscript('');
      refreshTranscripts();
    } catch (error) {
      console.error('Error storing locally:', error);
      toast.error('Failed to save locally');
    }
  };

  // Add this function to count words properly
  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // Add a function to fix common transcription errors
  const fixCommonErrors = (text: string) => {
    if (!text) return '';
    
    // Common fixes for speech-to-text errors
    let fixed = text;
    
    // Fix capitalization at the beginning of sentences
    fixed = fixed.replace(/(?:\.\s+|^\s*)([a-z])/g, (match, letter) => {
      return match.replace(letter, letter.toUpperCase());
    });
    
    // Fix common phrases that are often misheard
    const commonMishearings: [RegExp, string][] = [
      [/(?:\b|^)for all intensive purposes(?:\b|$)/gi, 'for all intents and purposes'],
      [/(?:\b|^)i could care less(?:\b|$)/gi, 'I couldn\'t care less'],
      [/(?:\b|^)statue of limitations(?:\b|$)/gi, 'statute of limitations'],
      [/(?:\b|^)per say(?:\b|$)/gi, 'per se'],
      [/(?:\b|^)ex cetera(?:\b|$)/gi, 'et cetera'],
      [/(?:\b|^)ex-specially(?:\b|$)/gi, 'especially'],
      [/(?:\b|^)expresso(?:\b|$)/gi, 'espresso'],
      [/(?:\b|^)irregardless(?:\b|$)/gi, 'regardless'],
      [/(?:\b|^)case and point(?:\b|$)/gi, 'case in point'],
      [/(?:\b|^)one in the same(?:\b|$)/gi, 'one and the same'],
      // Double words that are common in speech
      [/\b(\w+)\s+\1\b/gi, '$1']
    ];
    
    commonMishearings.forEach(([pattern, replacement]) => {
      fixed = fixed.replace(pattern, replacement);
    });
    
    // Fix extra spaces
    fixed = fixed.replace(/\s+/g, ' ').trim();
    
    // Add period at the end if missing
    if (!/[.!?]$/.test(fixed)) {
      fixed += '.';
    }
    
    return fixed;
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Browser Not Supported</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your browser doesn't support speech recognition.</p>
          <p>Please try using Chrome, Edge, or another modern browser.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isMicrophoneAvailable) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-yellow-600">Microphone Access Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please allow microphone access to use this feature.</p>
        </CardContent>
      </Card>
    );
  }

  // If there's an authentication error, show the session refresh component
  if (authError) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between w-full items-center">
          <h2 className="text-xl font-semibold">Speech to Text Converter</h2>
        </div>
        <SessionRefresh message="Your authentication session has expired. Please sign out and log in again to continue saving transcripts." />
        <div className="text-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => setAuthError(false)}
            className="mx-auto"
          >
            Continue in Local Mode
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            You can continue using the app, but transcripts will only be saved locally.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
      {/* Login status banner */}
      {!userDetails?.id && (
        <div className="w-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg mb-2 text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>
            You're not logged in. Transcripts will be saved locally in your browser only.{" "}
            <a href="/login" className="underline font-medium">Log in</a> to save your transcripts to your account.
          </span>
        </div>
      )}
      
      <div className="flex justify-between w-full items-center">
        <div className="text-sm text-muted-foreground">
          Press <kbd className="px-2 py-1 bg-muted rounded border">Alt</kbd>+<kbd className="px-2 py-1 bg-muted rounded border">SPACE</kbd> to start/stop recording
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Speech to Text Converter</CardTitle>
          <CardDescription>
            Speak into your microphone and see the text appear in real-time
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Language Selector */}
          <div className="flex flex-col space-y-1.5 relative">
            <label htmlFor="language-search" className="text-sm font-medium">
              Speech Recognition Language
            </label>
            <div className="relative" ref={languageDropdownRef}>
              <div 
                className="flex items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                <span>{languageOptions.find(lang => lang.value === selectedLanguage)?.label || 'Select language'}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
              
              {showLanguageDropdown && (
                <div className="absolute z-10 w-full rounded-md border border-input bg-background shadow-lg mt-1">
                  <div className="p-2 border-b">
                    <input
                      id="language-search"
                      type="text"
                      placeholder="Search languages..."
                      value={languageSearchQuery}
                      onChange={(e) => setLanguageSearchQuery(e.target.value)}
                      className="w-full p-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                    {filteredLanguageOptions.length > 0 ? (
                      filteredLanguageOptions.map((language) => (
                        <div
                          key={language.value}
                          className={`px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors ${
                            selectedLanguage === language.value ? 'bg-primary/10 text-primary font-medium' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLanguageSelection(language.value);
                          }}
                        >
                          {language.label}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                        No languages found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select the language you want to speak in. Accuracy may vary by language.
            </p>
          </div>
          
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
          
          {/* Transcript display - with enhanced scrollbars */}
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
            {isEditing ? (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={editedTranscript}
                    onChange={(e) => {
                      // Only update if we're under the character limit or if text is being deleted
                      if (e.target.value.length <= MAX_CHARACTERS || e.target.value.length < editedTranscript.length) {
                        setEditedTranscript(e.target.value);
                      }
                    }}
                    className="min-h-[200px] max-h-[300px] w-full rounded-lg border border-border bg-card p-4 custom-scrollbar resize-none"
                    placeholder="Edit your transcript here..."
                    autoFocus
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                    {countWords(editedTranscript)} words | {editedTranscript.length}/{MAX_CHARACTERS} characters
                  </div>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[150px] bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            editedTranscript.length > MAX_CHARACTERS * 0.9 
                              ? 'bg-red-500' 
                              : editedTranscript.length > MAX_CHARACTERS * 0.7 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (editedTranscript.length / MAX_CHARACTERS) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">
                        {editedTranscript.length > MAX_CHARACTERS * 0.9 
                          ? 'Almost at limit' 
                          : editedTranscript.length > MAX_CHARACTERS * 0.7 
                          ? 'Approaching limit' 
                          : 'Character limit'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const fixed = fixCommonErrors(editedTranscript);
                          setEditedTranscript(fixed);
                          toast.success('Auto-fixed common transcription errors');
                        }}
                        className="h-8"
                        disabled={!editedTranscript.trim()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m16 6 4 14"></path>
                          <path d="M12 6v14"></path>
                          <path d="M8 8v12"></path>
                          <path d="M4 4v16"></path>
                        </svg>
                        Auto-Fix
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Store the current text to append later
                          sessionStorage.setItem('previousEditText', editedTranscript);
                          setIsEditing(false);
                          resetTranscript();
                          setCurrentTranscript('');
                          handleStartListening();
                        }}
                        className="h-8"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" x2="12" y1="19" y2="22"/>
                        </svg>
                        Continue Recording
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-3"><kbd className="px-1.5 py-0.5 bg-muted rounded border">Ctrl+Enter</kbd> to save</span>
                    <span><kbd className="px-1.5 py-0.5 bg-muted rounded border">Esc</kbd> to cancel</span>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleManualSave}
                      disabled={!editedTranscript.trim()}
                    >
                      Save Transcript
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                ref={textAreaRef}
                className="min-h-[200px] max-h-[300px] w-full rounded-lg border border-border bg-card p-4 overflow-y-auto custom-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--secondary) transparent'
                }}
              >
                {transcript || currentTranscript ? (
                  <p className="whitespace-pre-wrap">{currentTranscript || transcript}</p>
                ) : (
                  <p className="text-muted-foreground">
                    {isListening 
                      ? 'Listening... Speak now' 
                      : 'Click "Start Recording" or press Alt+SPACE to begin transcription'}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex-wrap justify-center gap-3">
          <Button
            onClick={handleStartListening}
            disabled={isListening}
            variant="default"
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
            Start Recording
          </Button>
          
          <Button
            onClick={handleStopListening}
            disabled={!isListening}
            variant="destructive"
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <rect x="9" y="9" width="6" height="6"/>
            </svg>
            Stop Recording
          </Button>
          
          <Button
            onClick={handleSaveToFile}
            disabled={!transcript}
            variant="outline"
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Download as File
          </Button>
        </CardFooter>
      </Card>
      
      {/* Transcript Management Tabs */}
      {(savedTranscripts.length > 0 || trashedTranscripts.length > 0) && (
        <Tabs defaultValue="transcripts" className="w-full" onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="transcripts">
              Transcripts
              {savedTranscripts.length > 0 && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {savedTranscripts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="trash">
              Trash Bin
              {trashedTranscripts.length > 0 && (
                <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  {trashedTranscripts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcripts" className="mt-4">
            <Card className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Saved Transcripts</CardTitle>
                <Dialog open={showTranscriptDialog} onOpenChange={(open) => {
                  setShowTranscriptDialog(open);
                  setKeyboardShortcutsEnabled(!open);
                }}>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Transcript Details</DialogTitle>
                      <DialogDescription className="flex flex-col gap-1">
                        <span>{selectedTranscript?.timestamp && new Date(selectedTranscript.timestamp).toLocaleString()}</span>
                        {selectedTranscript?.language && (
                          <span className="flex items-center gap-2">
                            Language: 
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                              {languageOptions.find(lang => lang.value === selectedTranscript.language)?.label || selectedTranscript.language}
                            </span>
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    {/* Enhanced scrollable area for transcript content */}
                    <div className="mt-4 border rounded-md overflow-hidden">
                      <div 
                        ref={dialogContentRef}
                        className="p-4 bg-muted/50 max-h-[50vh] overflow-y-auto custom-scrollbar"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'var(--primary) transparent'
                        }}
                      >
                        <p className="whitespace-pre-wrap">
                          {selectedTranscript?.text}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-4">
                      <div className="flex gap-2">
                        {selectedTranscript && (
                          <>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowTranscriptDialog(false);
                                handleEditTranscript(selectedTranscript);
                              }}
                              className="text-blue-500"
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                if (selectedTranscript) {
                                  const blob = new Blob([selectedTranscript.text], { type: 'text/plain;charset=utf-8' });
                                  saveAs(blob, `transcript-${new Date(selectedTranscript.timestamp).toISOString().replace(/:/g, '-')}.txt`);
                                  toast.success('Transcript downloaded');
                                }
                              }}
                              className="text-green-500"
                            >
                              Download
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                if (selectedTranscript) {
                                  handleDeleteTranscript(selectedTranscript.id);
                                  setShowTranscriptDialog(false);
                                }
                              }}
                              className="text-red-500"
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowTranscriptDialog(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {savedTranscripts.length > 0 ? (
                  <ul className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--secondary) transparent'
                      }}>
                    {savedTranscripts.map((item, index) => (
                      <li 
                        key={item.id}
                        className="flex items-center p-2 hover:bg-muted rounded-md transition-colors"
                      >
                        <div 
                          className="flex-1 overflow-hidden cursor-pointer"
                          onClick={() => handleViewTranscript(item)}
                        >
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate">
                                {item.text}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                                {item.language && (
                                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px]">
                                    {languageOptions.find(lang => lang.value === item.language)?.label || item.language}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <EditTranscriptButton 
                            onEdit={() => handleEditTranscript(item)} 
                          />
                          <DownloadTranscriptButton 
                            text={item.text} 
                            timestamp={item.timestamp} 
                          />
                          <DeleteTranscriptButton 
                            transcriptId={item.id} 
                            onDelete={handleDeleteTranscript} 
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No saved transcripts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trash" className="mt-4">
            <TrashManagement 
              trashedTranscripts={trashedTranscripts}
              onRestore={handleRestoreTranscript}
              onPermanentDelete={handlePermanentDeleteTranscript}
              onEmptyTrash={handleEmptyTrash}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <EditTranscriptDialog 
        transcript={transcriptToEdit}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onTranscriptUpdated={refreshTranscripts}
      />
    </div>
  );
};

export default SpeechToText; 