'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DeleteTranscriptButtonProps {
  transcriptId: string;
  onDelete: (id: string) => void;
}

export default function DeleteTranscriptButton({ transcriptId, onDelete }: DeleteTranscriptButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      // Call the onDelete function passed from parent
      setTimeout(() => {
        onDelete(transcriptId);
        // Removed the duplicate toast notification
        setIsDeleting(false);
      }, 500);
    } catch (error) {
      // Keep error toast as it's a different notification
      console.error('Failed to delete transcript:', error);
      setIsDeleting(false);
    }
  };

  return (
    <Button 
      onClick={handleDelete}
      variant="ghost" 
      size="icon"
      disabled={isDeleting}
      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/30"
      aria-label="Delete transcript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </Button>
  );
} 