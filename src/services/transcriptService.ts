'use client';

/**
 * Interface for saved transcript data
 */
export interface SavedTranscript {
  id: string;
  text: string;
  timestamp: string;
  deletedAt?: string; // Timestamp for when transcript was moved to trash
  language?: string; // Language code used for recognition (e.g., 'en-US')
  userId?: string; // User ID for filtering transcripts by user
}

/**
 * Service for handling transcript-related operations
 */
export const transcriptService = {
  /**
   * Save transcript to the server
   * @param transcript - The text to save
   * @param language - The language used for recognition
   * @param userId - The ID of the user saving the transcript
   * @param title - Optional title for the transcript
   * @returns Promise resolving to response data
   */
  async saveTranscriptToServer(
    transcript: string, 
    language: string = 'en-US', 
    userId?: string,
    title?: string
  ): Promise<{ success: boolean; message: string; filename?: string; transcriptId?: string }> {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      // Create a new direct request instead of trying to extract the token
      // This will use the current session cookies automatically
      try {
        const response = await fetch('/api/save-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Cookies will be sent automatically
          },
          // Important: include credentials to send cookies with the request
          credentials: 'include',
          body: JSON.stringify({ 
            transcript, 
            language,
            userId,
            title 
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save transcript');
        }

        // Store locally for immediate access with user ID
        this.storeTranscriptLocally(transcript, language, userId);

        return data;
      } catch (error) {
        console.error('Error saving transcript:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    } catch (error) {
      console.error('Error in saveTranscriptToServer:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Store transcript in browser's localStorage
   * @param transcript - The text to store
   * @param language - The language used for recognition
   * @param userId - The ID of the user
   */
  storeTranscriptLocally(transcript: string, language: string = 'en-US', userId?: string): void {
    try {
      // Get existing transcripts or initialize empty array
      const existingJSON = localStorage.getItem('savedTranscripts');
      const existing: SavedTranscript[] = existingJSON ? JSON.parse(existingJSON) : [];

      // Create new transcript object
      const newTranscript: SavedTranscript = {
        id: Date.now().toString(),
        text: transcript,
        timestamp: new Date().toISOString(),
        language,
        userId
      };

      // Add new transcript and save back to localStorage
      const updated = [...existing, newTranscript];
      localStorage.setItem('savedTranscripts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing transcript locally:', error);
    }
  },

  /**
   * Store a complete transcript object with metadata
   * @param transcript - The transcript object to store
   */
  storeTranscriptWithMetadata(transcript: SavedTranscript): void {
    try {
      // Get existing transcripts or initialize empty array
      const existingJSON = localStorage.getItem('savedTranscripts');
      const existing: SavedTranscript[] = existingJSON ? JSON.parse(existingJSON) : [];

      // Add new transcript and save back to localStorage
      const updated = [...existing, transcript];
      localStorage.setItem('savedTranscripts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing transcript with metadata:', error);
    }
  },

  /**
   * Get all saved transcripts from localStorage
   * @param userId - Optional user ID to filter transcripts
   * @returns Array of saved transcripts
   */
  getSavedTranscripts(userId?: string): SavedTranscript[] {
    try {
      const json = localStorage.getItem('savedTranscripts');
      const transcripts = json ? JSON.parse(json) : [];
      
      // Filter out deleted items and by user ID if provided
      return transcripts.filter((t: SavedTranscript) => {
        if (t.deletedAt) return false;
        if (userId) return t.userId === userId;
        return true;
      });
    } catch (error) {
      console.error('Error getting saved transcripts:', error);
      return [];
    }
  },

  /**
   * Get a specific transcript by ID
   * @param id - The transcript ID
   * @param userId - Optional user ID to filter transcripts
   * @returns The transcript object or null if not found
   */
  getTranscriptById(id: string, userId?: string): SavedTranscript | null {
    try {
      const transcripts = this.getAllTranscripts(userId);
      return transcripts.find(t => t.id === id) || null;
    } catch (error) {
      console.error('Error getting transcript by ID:', error);
      return null;
    }
  },

  /**
   * Get all transcripts including those in trash
   * @param userId - Optional user ID to filter transcripts
   * @returns Array of all saved transcripts
   */
  getAllTranscripts(userId?: string): SavedTranscript[] {
    try {
      const json = localStorage.getItem('savedTranscripts');
      const transcripts = json ? JSON.parse(json) : [];
      
      // Filter by user ID if provided
      if (userId) {
        return transcripts.filter((t: SavedTranscript) => t.userId === userId);
      }
      
      return transcripts;
    } catch (error) {
      console.error('Error getting all transcripts:', error);
      return [];
    }
  },

  /**
   * Get all transcripts in trash
   * @param userId - Optional user ID to filter transcripts
   * @returns Array of transcripts in trash
   */
  getTrashTranscripts(userId?: string): SavedTranscript[] {
    try {
      const json = localStorage.getItem('savedTranscripts');
      const transcripts = json ? JSON.parse(json) : [];
      
      // Filter only deleted items and by user ID if provided
      return transcripts.filter((t: SavedTranscript) => {
        if (!t.deletedAt) return false;
        if (userId) return t.userId === userId;
        return true;
      });
    } catch (error) {
      console.error('Error getting trash transcripts:', error);
      return [];
    }
  },

  /**
   * Update an existing transcript
   * @param id - The transcript ID to update
   * @param newText - The new text content
   * @returns Whether the update was successful
   */
  updateTranscript(id: string, newText: string): boolean {
    try {
      const transcripts = this.getAllTranscripts();
      const index = transcripts.findIndex(t => t.id === id);
      
      if (index === -1) return false;
      
      // Update the text but keep other properties
      transcripts[index] = {
        ...transcripts[index],
        text: newText,
      };
      
      localStorage.setItem('savedTranscripts', JSON.stringify(transcripts));
      return true;
    } catch (error) {
      console.error('Error updating transcript:', error);
      return false;
    }
  },

  /**
   * Move a transcript to trash
   * @param id - The transcript ID
   * @returns Whether the operation was successful
   */
  moveToTrash(id: string): boolean {
    try {
      const transcripts = this.getAllTranscripts();
      const index = transcripts.findIndex(t => t.id === id);
      
      if (index === -1) return false;
      
      // Mark as deleted with current timestamp
      transcripts[index] = {
        ...transcripts[index],
        deletedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('savedTranscripts', JSON.stringify(transcripts));
      return true;
    } catch (error) {
      console.error('Error moving transcript to trash:', error);
      return false;
    }
  },

  /**
   * Restore a transcript from trash
   * @param id - The transcript ID
   * @returns Whether the restore was successful
   */
  restoreFromTrash(id: string): boolean {
    try {
      const transcripts = this.getAllTranscripts();
      const index = transcripts.findIndex(t => t.id === id);
      
      if (index === -1) return false;
      
      // Remove the deletedAt property
      const { deletedAt, ...restoredTranscript } = transcripts[index];
      transcripts[index] = restoredTranscript;
      
      localStorage.setItem('savedTranscripts', JSON.stringify(transcripts));
      return true;
    } catch (error) {
      console.error('Error restoring transcript from trash:', error);
      return false;
    }
  },

  /**
   * Permanently delete a transcript
   * @param id - The transcript ID
   * @returns Whether the delete was successful
   */
  permanentlyDelete(id: string): boolean {
    try {
      const transcripts = this.getAllTranscripts();
      const filteredTranscripts = transcripts.filter(t => t.id !== id);
      
      if (filteredTranscripts.length === transcripts.length) return false;
      
      localStorage.setItem('savedTranscripts', JSON.stringify(filteredTranscripts));
      return true;
    } catch (error) {
      console.error('Error permanently deleting transcript:', error);
      return false;
    }
  },

  /**
   * Empty trash by permanently deleting all trashed items
   * @returns Whether the operation was successful
   */
  emptyTrash(): boolean {
    try {
      const transcripts = this.getAllTranscripts();
      const remainingTranscripts = transcripts.filter(t => !t.deletedAt);
      
      localStorage.setItem('savedTranscripts', JSON.stringify(remainingTranscripts));
      return true;
    } catch (error) {
      console.error('Error emptying trash:', error);
      return false;
    }
  }
}; 