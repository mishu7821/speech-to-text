'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SavedTranscript, transcriptService } from '@/services/transcriptService';

// Language options to display labels from codes
const languageMap: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ru-RU': 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ar-SA': 'Arabic',
  'hi-IN': 'Hindi',
  'nl-NL': 'Dutch'
};

// Helper to get language label from code
const getLanguageLabel = (code?: string): string => {
  if (!code) return '';
  return languageMap[code] || code;
};

interface EditTranscriptDialogProps {
  transcript: SavedTranscript | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscriptUpdated: () => void;
}

export default function EditTranscriptDialog({
  transcript,
  open,
  onOpenChange,
  onTranscriptUpdated
}: EditTranscriptDialogProps) {
  const [editedText, setEditedText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Update local state when transcript changes
  useEffect(() => {
    if (transcript) {
      setEditedText(transcript.text);
    }
  }, [transcript]);

  const handleSaveChanges = async () => {
    if (!transcript || !editedText.trim()) {
      toast.error('Cannot save empty transcript');
      return;
    }

    setIsSaving(true);
    
    try {
      const success = transcriptService.updateTranscript(transcript.id, editedText);
      
      if (success) {
        toast.success('Transcript updated successfully');
        onTranscriptUpdated();
        onOpenChange(false);
      } else {
        toast.error('Failed to update transcript');
      }
    } catch (error) {
      console.error('Error updating transcript:', error);
      toast.error('An error occurred while updating the transcript');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Discard changes and close dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Transcript</DialogTitle>
          <DialogDescription className="flex flex-col gap-1">
            <span>{transcript?.timestamp && new Date(transcript.timestamp).toLocaleString()}</span>
            {transcript?.language && (
              <span className="flex items-center gap-2">
                Language: 
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                  {getLanguageLabel(transcript.language)}
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Edit your transcript here..."
            className="min-h-[40vh] custom-scrollbar"
          />
        </div>
        
        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={isSaving || !editedText.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 