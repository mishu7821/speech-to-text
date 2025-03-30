'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SpeechToText from '@/components/SpeechToText';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

export default function RecorderPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [supabase]);

  const handleTranscriptCreated = (transcriptId: string, shouldRedirect = false) => {
    // We don't redirect automatically anymore, it's controlled by the shouldRedirect param
    if (shouldRedirect) {
      toast.success('Transcript created successfully');
      // This could redirect to the transcript detail page if needed
      // router.push(`/transcripts/${transcriptId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading recorder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Voice Recorder</h1>
          <p className="text-muted-foreground mt-1">
            Speak and convert your speech to text in real-time
          </p>
        </div>
        
        <div className="rounded-full bg-primary/10 p-3">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="bg-card rounded-lg border p-1">
        <SpeechToText 
          userDetails={user ? { id: user.id, email: user.email } : undefined}
          onTranscriptCreated={handleTranscriptCreated}
        />
      </div>
    </div>
  );
} 