'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RestoreTranscriptButtonProps {
  transcriptId: string;
  onRestore: (id: string) => void;
}

export default function RestoreTranscriptButton({ transcriptId, onRestore }: RestoreTranscriptButtonProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    
    try {
      // Call the parent's onRestore function
      setTimeout(() => {
        onRestore(transcriptId);
        // Remove the toast notification to avoid duplicates
        setIsRestoring(false);
      }, 500);
    } catch (error) {
      console.error('Failed to restore transcript:', error);
      setIsRestoring(false);
    }
  };

  return (
    <Button 
      onClick={handleRestore}
      variant="ghost" 
      size="icon"
      disabled={isRestoring}
      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-950/30"
      aria-label="Restore transcript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 0 1 17.8-2" />
        <path d="M21 3v6h-6" />
        <path d="M21 12a9 9 0 0 1-17.8 2" />
        <path d="M3 21v-6h6" />
      </svg>
    </Button>
  );
} 