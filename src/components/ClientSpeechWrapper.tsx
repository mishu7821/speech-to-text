'use client';

import dynamic from 'next/dynamic';

// Dynamically import SpeechToText component with no SSR
const SpeechToText = dynamic(() => import('./SpeechToText'), {
  ssr: false,
});

export default function ClientSpeechWrapper() {
  return <SpeechToText />;
} 