'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { SavedTranscript } from '@/services/transcriptService';
import RestoreTranscriptButton from './buttons/RestoreTranscriptButton';
import PermanentDeleteButton from './buttons/PermanentDeleteButton';
import { FileTextIcon } from './icons';

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

interface TrashManagementProps {
  trashedTranscripts: SavedTranscript[];
  onRestore: (id: string, showNotification?: boolean) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
}

export default function TrashManagement({ 
  trashedTranscripts, 
  onRestore, 
  onPermanentDelete,
  onEmptyTrash
}: TrashManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<SavedTranscript | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const handleViewTranscript = (transcript: SavedTranscript) => {
    setSelectedTranscript(transcript);
    setShowDialog(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(trashedTranscripts.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.')) {
      return;
    }

    setIsEmptyingTrash(true);
    
    try {
      // Call the parent handler directly without showing a toast here
      // The parent component will handle the notification
      setTimeout(() => {
        onEmptyTrash();
        setIsEmptyingTrash(false);
      }, 800);
    } catch (error) {
      toast.error('Failed to empty trash');
      setIsEmptyingTrash(false);
    }
  };

  const handleRestoreSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('No items selected');
      return;
    }

    // Process all selected IDs at once and show only one notification
    try {
      // Track success count
      let restoredCount = 0;
      
      // Process each ID
      selectedIds.forEach(id => {
        try {
          // Only pass showNotification=false to prevent duplicate notifications
          onRestore(id, false);
          restoredCount++;
        } catch (error) {
          console.error(`Failed to restore transcript ${id}:`, error);
        }
      });
      
      // Show a single notification for all restored items
      if (restoredCount > 0) {
        toast.success(`${restoredCount} transcript${restoredCount > 1 ? 's' : ''} restored`);
      }
      
      // Clear selection
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to restore transcripts');
      console.error('Batch restore error:', error);
    }
  };

  const handlePermanentDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('No items selected');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected transcript(s)? This action cannot be undone.`)) {
      return;
    }

    // Process each selected ID
    let deletedCount = 0;
    selectedIds.forEach(id => {
      try {
        onPermanentDelete(id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to permanently delete transcript ${id}:`, error);
      }
    });

    // Show only one notification for the batch operation
    if (deletedCount > 0) {
      toast.success(`${deletedCount} transcript${deletedCount > 1 ? 's' : ''} permanently deleted`);
    }
    
    setSelectedIds([]);
  };

  // Helper to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      formatted: date.toLocaleString(),
      daysAgo: diffDays,
      daysLeft: 30 - diffDays
    };
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Trash</CardTitle>
          <CardDescription>
            Items in trash will be permanently deleted after 30 days
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRestoreSelected}
            disabled={selectedIds.length === 0}
            className="text-blue-500"
          >
            Restore Selected
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePermanentDeleteSelected}
            disabled={selectedIds.length === 0}
            className="text-red-500"
          >
            Delete Selected
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleEmptyTrash}
            disabled={trashedTranscripts.length === 0 || isEmptyingTrash}
          >
            Empty Trash
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trashedTranscripts.length > 0 ? (
          <div>
            <div className="flex items-center py-2 px-2 bg-muted/50 rounded-t-md">
              <div className="w-6 mr-2">
                <Checkbox 
                  checked={selectedIds.length === trashedTranscripts.length && trashedTranscripts.length > 0}
                  onCheckedChange={handleSelectAll} 
                />
              </div>
              <div className="flex-1 font-medium">Content</div>
              <div className="w-40 text-center">Deletion Date</div>
              <div className="w-32 text-center">Actions</div>
            </div>
            
            <ul className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              {trashedTranscripts.map((item) => {
                const dateInfo = formatDate(item.timestamp);
                return (
                  <li 
                    key={item.id}
                    className={`flex items-center py-2 px-2 hover:bg-muted rounded-md transition-colors ${
                      selectedIds.includes(item.id) ? 'bg-muted/80' : ''
                    }`}
                  >
                    <div className="w-6 mr-2">
                      <Checkbox 
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) => handleSelect(item.id, !!checked)}
                      />
                    </div>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleViewTranscript(item)}
                    >
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium">
                            {item.text.substring(0, 60)}{item.text.length > 60 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Will be permanently deleted in {dateInfo.daysLeft} days</span>
                            {item.language && (
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px]">
                                {getLanguageLabel(item.language)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-40 text-center text-sm text-muted-foreground">
                      {dateInfo.formatted}
                    </div>
                    <div className="w-32 flex justify-center gap-1">
                      <RestoreTranscriptButton 
                        transcriptId={item.id} 
                        onRestore={onRestore} 
                      />
                      <PermanentDeleteButton 
                        transcriptId={item.id} 
                        onDelete={onPermanentDelete} 
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            <p>Trash is empty</p>
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Deleted Transcript</DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span>{selectedTranscript?.timestamp && new Date(selectedTranscript.timestamp).toLocaleString()}</span>
              {selectedTranscript?.language && (
                <span className="flex items-center gap-2">
                  Language: 
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {getLanguageLabel(selectedTranscript.language)}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedTranscript && (
            <>
              <div className="border rounded-md overflow-hidden">
                <div 
                  className="p-4 bg-muted/50 max-h-[50vh] overflow-y-auto custom-scrollbar"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--primary) transparent'
                  }}
                >
                  <p className="whitespace-pre-wrap">
                    {selectedTranscript.text}
                  </p>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onRestore(selectedTranscript.id, true);
                    setShowDialog(false);
                  }}
                  className="text-blue-500"
                >
                  Restore
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
} 