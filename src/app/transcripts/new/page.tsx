'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Separator } from '@/components/ui/separator';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Dynamically import SpeechToText component with no SSR
const SpeechToText = dynamic(() => import('@/components/SpeechToText'), {
  ssr: false,
});

export default function NewTranscriptPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [supabase, router]);

  // Handle successful transcript creation
  const handleTranscriptCreated = (transcriptId: string) => {
    toast.success('Transcript created successfully');
    // Redirect back to dashboard to see the new transcript
    router.push('/dashboard');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-foreground">Create New Transcript</h1>
            <p className="text-muted-foreground">
              Speak into your microphone to convert speech to text
            </p>
          </div>
          <Separator className="mt-4" />
        </header>

        <main>
          <SpeechToText 
            userDetails={{ id: user?.id, email: user?.email }} 
            onTranscriptCreated={handleTranscriptCreated}
          />
        </main>
      </div>
    </div>
  );
} 