import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Cache for storing transcripts
const transcriptCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Helper function to check if a cached value is expired
 */
function isCacheExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_TTL;
}

/**
 * Helper function to clear expired cache entries
 */
function clearExpiredCache() {
  for (const [key, value] of transcriptCache.entries()) {
    if (isCacheExpired(value.timestamp)) {
      transcriptCache.delete(key);
    }
  }
}

/**
 * Service for handling transcript operations
 */
export const transcriptService = {
  /**
   * Save a transcript to the server
   */
  async saveTranscriptToServer(transcript: string, title?: string) {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error('Authentication failed: ' + userError.message);
      }

      if (!user) {
        throw new Error('You must be logged in to save transcripts');
      }

      const response = await fetch('/api/save-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
        body: JSON.stringify({
          transcript,
          title,
          userId: user.id,
          language: 'en-US'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save transcript');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error saving transcript:', error);
      toast.error(error.message || 'Failed to save transcript');
      throw error;
    }
  },

  /**
   * Get a transcript by ID
   */
  async getTranscript(id: string) {
    try {
      // Check cache first
      const cached = transcriptCache.get(id);
      if (cached && !isCacheExpired(cached.timestamp)) {
        return cached.data;
      }

      const supabase = createClient();
      const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();

      if (transcriptError) {
        throw new Error('Failed to fetch transcript: ' + transcriptError.message);
      }

      const { data: content, error: contentError } = await supabase
        .from('transcript_contents')
        .select('content')
        .eq('transcript_id', id)
        .single();

      if (contentError) {
        throw new Error('Failed to fetch transcript content: ' + contentError.message);
      }

      const result = {
        ...transcript,
        content: content.content
      };

      // Cache the result
      transcriptCache.set(id, {
        data: result,
        timestamp: Date.now()
      });

      // Clear expired cache entries
      clearExpiredCache();

      return result;
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast.error(error.message || 'Failed to fetch transcript');
      throw error;
    }
  },

  /**
   * Get all transcripts for the current user
   */
  async getUserTranscripts() {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error('Authentication failed: ' + userError.message);
      }

      if (!user) {
        throw new Error('You must be logged in to fetch transcripts');
      }

      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transcriptsError) {
        throw new Error('Failed to fetch transcripts: ' + transcriptsError.message);
      }

      return transcripts;
    } catch (error: any) {
      console.error('Error fetching user transcripts:', error);
      toast.error(error.message || 'Failed to fetch transcripts');
      throw error;
    }
  },

  /**
   * Delete a transcript
   */
  async deleteTranscript(id: string) {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error('Authentication failed: ' + userError.message);
      }

      if (!user) {
        throw new Error('You must be logged in to delete transcripts');
      }

      // Delete transcript content first
      const { error: contentError } = await supabase
        .from('transcript_contents')
        .delete()
        .eq('transcript_id', id);

      if (contentError) {
        throw new Error('Failed to delete transcript content: ' + contentError.message);
      }

      // Delete transcript record
      const { error: transcriptError } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (transcriptError) {
        throw new Error('Failed to delete transcript: ' + transcriptError.message);
      }

      // Remove from cache
      transcriptCache.delete(id);

      return true;
    } catch (error: any) {
      console.error('Error deleting transcript:', error);
      toast.error(error.message || 'Failed to delete transcript');
      throw error;
    }
  }
}; 