'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TranscriptPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<{
    id: string;
    title: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    language?: string;
    content?: string;
  } | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const transcriptId = params.id as string;
  const supabase = createClient();

  useEffect(() => {
    const getTranscriptData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
        
        // Get transcript details
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('id', transcriptId)
          .single();
        
        if (transcriptError || !transcriptData) {
          console.error('Error fetching transcript:', transcriptError);
          toast.error('Transcript not found');
          router.push('/dashboard');
          return;
        }
        
        // Verify the transcript belongs to the current user
        if (transcriptData.user_id !== user.id) {
          toast.error('You don\'t have permission to view this transcript');
          router.push('/dashboard');
          return;
        }
        
        // Get transcript content
        const { data: contentData, error: contentError } = await supabase
          .from('transcript_contents')
          .select('content')
          .eq('transcript_id', transcriptId)
          .single();
        
        if (contentError) {
          console.error('Error fetching transcript content:', contentError);
          toast.error('Failed to load transcript content');
        }
        
        // Combine data
        setTranscript({
          ...transcriptData,
          content: contentData?.content || ''
        });
      } catch (error) {
        console.error('Error loading transcript:', error);
        toast.error('An error occurred while loading the transcript');
      } finally {
        setLoading(false);
      }
    };

    if (transcriptId) {
      getTranscriptData();
    }
  }, [transcriptId, supabase, router]);

  const handleDelete = async () => {
    if (!transcript) return;
    
    try {
      // Soft delete only - mark as deleted
      const { error } = await supabase
        .from('transcripts')
        .update({ is_deleted: true })
        .eq('id', transcript.id);
      
      if (error) {
        throw error;
      }
      
      toast.success('Transcript moved to trash');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting transcript:', error);
      toast.error('Failed to delete transcript');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Transcript Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            The transcript you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-foreground">
                {transcript.title}
              </h1>
              <p className="text-muted-foreground">
                {new Date(transcript.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
          <Separator className="mt-4" />
        </header>

        <main>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Transcript Content</CardTitle>
              {transcript.language && (
                <CardDescription>
                  Language: {transcript.language}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-md max-h-[60vh] overflow-y-auto">
                {transcript.content}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4 mt-4">
              <Button 
                variant="destructive" 
                onClick={handleDelete}
              >
                Delete Transcript
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Create a Blob from the transcript content
                  const blob = new Blob([transcript.content || ''], { type: 'text/plain' });
                  // Create a download link
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${transcript.title.replace(/[^\w\s]/gi, '')}-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  // Clean up
                  URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }}
              >
                Download as Text
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
} 