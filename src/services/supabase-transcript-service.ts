import { createClient } from '@/lib/supabase/client';

/**
 * Interface for transcript data
 */
export interface TranscriptData {
  id?: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service for handling transcript operations with Supabase
 */
export const supabaseTranscriptService = {
  /**
   * Save a new transcript
   * @param content - The transcript content to save
   * @param title - Optional title for the transcript
   * @returns Promise resolving to the created transcript ID or null if failed
   */
  async saveTranscript(content: string, title: string = 'New Transcript'): Promise<string | null> {
    const supabase = createClient();
    
    try {
      // First create the transcript record
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .insert({ title })
        .select('id')
        .single();
      
      if (transcriptError) {
        console.error('Error creating transcript:', transcriptError);
        return null;
      }
      
      // Then save the content
      const transcriptId = transcriptData.id;
      const { error: contentError } = await supabase
        .from('transcript_contents')
        .insert({
          transcript_id: transcriptId,
          content
        });
      
      if (contentError) {
        console.error('Error saving transcript content:', contentError);
        // Try to clean up the transcript record if content saving failed
        await supabase.from('transcripts').delete().eq('id', transcriptId);
        return null;
      }
      
      return transcriptId;
    } catch (error) {
      console.error('Error in saveTranscript:', error);
      return null;
    }
  },
  
  /**
   * Get all transcripts for the current user
   * @param includeDeleted - Whether to include soft-deleted transcripts
   * @returns Promise resolving to an array of transcript data
   */
  async getUserTranscripts(includeDeleted = false): Promise<TranscriptData[]> {
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('transcripts')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching transcripts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUserTranscripts:', error);
      return [];
    }
  },
  
  /**
   * Get a transcript with its contents
   * @param transcriptId - The ID of the transcript to get
   * @returns Promise resolving to the transcript data or null if not found
   */
  async getTranscriptWithContent(transcriptId: string): Promise<TranscriptData | null> {
    const supabase = createClient();
    
    try {
      // Get the transcript record
      const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', transcriptId)
        .single();
      
      if (transcriptError) {
        console.error('Error fetching transcript:', transcriptError);
        return null;
      }
      
      // Get the latest content
      const { data: contentData, error: contentError } = await supabase
        .from('transcript_contents')
        .select('content')
        .eq('transcript_id', transcriptId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (contentError && contentError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        console.error('Error fetching transcript content:', contentError);
      }
      
      return {
        ...transcript,
        content: contentData?.content || ''
      };
    } catch (error) {
      console.error('Error in getTranscriptWithContent:', error);
      return null;
    }
  },
  
  /**
   * Update a transcript's title
   * @param transcriptId - The ID of the transcript to update
   * @param title - The new title
   * @returns Promise resolving to a boolean indicating success
   */
  async updateTranscriptTitle(transcriptId: string, title: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ 
          title, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', transcriptId);
      
      if (error) {
        console.error('Error updating transcript title:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateTranscriptTitle:', error);
      return false;
    }
  },
  
  /**
   * Update a transcript's content
   * @param transcriptId - The ID of the transcript
   * @param content - The new content
   * @returns Promise resolving to a boolean indicating success
   */
  async updateTranscriptContent(transcriptId: string, content: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      // Update the transcript's timestamp
      await supabase
        .from('transcripts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', transcriptId);
      
      // Add new content entry (preserves history)
      const { error } = await supabase
        .from('transcript_contents')
        .insert({
          transcript_id: transcriptId,
          content
        });
      
      if (error) {
        console.error('Error updating transcript content:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateTranscriptContent:', error);
      return false;
    }
  },
  
  /**
   * Move a transcript to trash (soft delete)
   * @param transcriptId - The ID of the transcript to trash
   * @returns Promise resolving to a boolean indicating success
   */
  async softDeleteTranscript(transcriptId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString() 
        })
        .eq('id', transcriptId);
      
      if (error) {
        console.error('Error soft deleting transcript:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in softDeleteTranscript:', error);
      return false;
    }
  },
  
  /**
   * Restore a transcript from trash
   * @param transcriptId - The ID of the transcript to restore
   * @returns Promise resolving to a boolean indicating success
   */
  async restoreTranscript(transcriptId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ 
          is_deleted: false,
          updated_at: new Date().toISOString() 
        })
        .eq('id', transcriptId);
      
      if (error) {
        console.error('Error restoring transcript:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in restoreTranscript:', error);
      return false;
    }
  },
  
  /**
   * Permanently delete a transcript
   * @param transcriptId - The ID of the transcript to delete
   * @returns Promise resolving to a boolean indicating success
   */
  async permanentlyDeleteTranscript(transcriptId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', transcriptId);
      
      if (error) {
        console.error('Error permanently deleting transcript:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in permanentlyDeleteTranscript:', error);
      return false;
    }
  }
}; 