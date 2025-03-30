import { supabase } from '@/lib/supabase';

/**
 * Transcript interface representing a transcript record
 */
export interface Transcript {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * TranscriptContent interface representing transcript content
 */
export interface TranscriptContent {
  id: string;
  transcript_id: string;
  content: string;
  created_at: string;
}

/**
 * TranscriptWithContent interface representing a transcript with its content
 */
export interface TranscriptWithContent extends Transcript {
  content?: string;
}

/**
 * Service to manage transcript operations with Supabase
 */
export const transcriptService = {
  /**
   * Create a new transcript
   * @param title - The title of the transcript
   * @returns The ID of the created transcript or null if creation failed
   */
  async createTranscript(title = 'New Transcript'): Promise<string | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data, error } = await supabase
      .from('transcripts')
      .insert({ title, user_id: user.user.id })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating transcript:', error);
      return null;
    }

    return data.id;
  },

  /**
   * Get all transcripts for the current user
   * @param includeDeleted - Whether to include soft-deleted transcripts
   * @returns Array of transcript objects
   */
  async getUserTranscripts(includeDeleted = false): Promise<Transcript[]> {
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

    return data;
  },

  /**
   * Get a transcript by ID
   * @param transcriptId - The ID of the transcript to get
   * @returns Transcript object or null if not found
   */
  async getTranscript(transcriptId: string): Promise<Transcript | null> {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (error) {
      console.error('Error fetching transcript:', error);
      return null;
    }

    return data;
  },

  /**
   * Get transcript with its content
   * @param transcriptId - The ID of the transcript to get
   * @returns Transcript with content or null if not found
   */
  async getTranscriptWithContent(transcriptId: string): Promise<TranscriptWithContent | null> {
    // First get the transcript
    const transcript = await this.getTranscript(transcriptId);
    if (!transcript) return null;

    // Then get the latest content
    const { data, error } = await supabase
      .from('transcript_contents')
      .select('content')
      .eq('transcript_id', transcriptId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is okay
      console.error('Error fetching transcript content:', error);
    }

    return {
      ...transcript,
      content: data?.content || '',
    };
  },

  /**
   * Save transcript content
   * @param transcriptId - The ID of the transcript
   * @param content - The content to save
   * @returns boolean indicating success
   */
  async saveTranscriptContent(transcriptId: string, content: string): Promise<boolean> {
    // Update the transcript's updated_at timestamp
    await supabase
      .from('transcripts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', transcriptId);

    // Insert new content
    const { error } = await supabase
      .from('transcript_contents')
      .insert({
        transcript_id: transcriptId,
        content
      });

    if (error) {
      console.error('Error saving transcript content:', error);
      return false;
    }

    return true;
  },

  /**
   * Update a transcript's title
   * @param transcriptId - The ID of the transcript to update
   * @param title - The new title
   * @returns boolean indicating success
   */
  async updateTranscriptTitle(transcriptId: string, title: string): Promise<boolean> {
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
  },

  /**
   * Soft delete a transcript
   * @param transcriptId - The ID of the transcript to delete
   * @returns boolean indicating success
   */
  async softDeleteTranscript(transcriptId: string): Promise<boolean> {
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
  },

  /**
   * Permanently delete a transcript and its contents
   * @param transcriptId - The ID of the transcript to delete
   * @returns boolean indicating success
   */
  async permanentlyDeleteTranscript(transcriptId: string): Promise<boolean> {
    // Delete the transcript (cascade will delete contents)
    const { error } = await supabase
      .from('transcripts')
      .delete()
      .eq('id', transcriptId);

    if (error) {
      console.error('Error permanently deleting transcript:', error);
      return false;
    }

    return true;
  },

  /**
   * Restore a soft-deleted transcript
   * @param transcriptId - The ID of the transcript to restore
   * @returns boolean indicating success
   */
  async restoreTranscript(transcriptId: string): Promise<boolean> {
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
  }
}; 