'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SessionRefreshProps {
  message?: string;
}

export default function SessionRefresh({ message = 'Your session has expired. Please sign in again.' }: SessionRefreshProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' }); // Use global scope to invalidate all sessions
      
      // Clear any Supabase-related cookies and localStorage items
      if (typeof window !== 'undefined') {
        // Find and clear any Supabase auth items in localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear all session cookies by setting expiration in the past
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        });
      }
      
      toast.success('Signed out successfully', {
        description: 'Please sign in again to refresh your session'
      });
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Redirect anyway as a fallback
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-yellow-100 p-3">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-yellow-600"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Authentication Required</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button 
          onClick={handleSignOut} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing out...' : 'Sign out and log in again'}
        </Button>
      </div>
    </div>
  );
} 