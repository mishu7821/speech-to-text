'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PermanentDeleteButtonProps {
  transcriptId: string;
  onDelete: (id: string) => void;
}

export default function PermanentDeleteButton({ transcriptId, onDelete }: PermanentDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this transcript? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Call the onDelete function passed from parent
      setTimeout(() => {
        onDelete(transcriptId);
        // Removed the duplicate toast notification
        setIsDeleting(false);
      }, 500);
    } catch (error) {
      // Keep error log but remove toast since parent will handle it
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
      className="text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-950/30"
      aria-label="Permanently delete transcript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </Button>
  );
} 