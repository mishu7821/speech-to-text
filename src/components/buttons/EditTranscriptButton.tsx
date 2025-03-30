'use client';

import { Button } from '@/components/ui/button';

interface EditTranscriptButtonProps {
  onEdit: () => void;
}

export default function EditTranscriptButton({ onEdit }: EditTranscriptButtonProps) {
  return (
    <Button 
      onClick={onEdit}
      variant="ghost" 
      size="icon"
      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-950/30"
      aria-label="Edit transcript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </Button>
  );
} 