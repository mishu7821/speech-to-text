'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ProfilePage() {
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
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('An error occurred during sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Profile</h1>
            <div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 mr-2"
              >
                Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-destructive text-white hover:bg-destructive/90"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main>
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-6">User Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                <div className="text-lg">{user?.email}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">User ID</label>
                <div className="text-lg font-mono text-xs bg-muted p-2 rounded overflow-auto">
                  {user?.id}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Last Sign In</label>
                <div className="text-lg">
                  {user?.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleString() 
                    : 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account Created</label>
                <div className="text-lg">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleString() 
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 