'use client';

import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface DownloadTranscriptButtonProps {
  text: string;
  timestamp: string;
}

export default function DownloadTranscriptButton({ text, timestamp }: DownloadTranscriptButtonProps) {
  const handleDownload = () => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `speech-transcript-${new Date(timestamp).toISOString().replace(/:/g, '-')}.txt`);
      
      toast.success('Transcript downloaded', {
        description: 'Your transcript has been saved as a text file'
      });
    } catch (error) {
      toast.error('Failed to download transcript');
    }
  };

  return (
    <Button 
      onClick={handleDownload}
      variant="ghost" 
      size="icon"
      className="text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-950/30"
      aria-label="Download transcript"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </Button>
  );
} 