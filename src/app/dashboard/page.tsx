'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  FileText, 
  Clock, 
  Calendar, 
  BarChart, 
  PlusCircle, 
  ArrowRight, 
  Trash2,
  Globe,
  User
} from 'lucide-react';

// Interface for transcript data
interface Transcript {
  id: string;
  title: string;
  content?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  language?: string;
  word_count?: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [trashedCount, setTrashedCount] = useState(0);
  const [stats, setStats] = useState({
    totalTranscripts: 0,
    totalWords: 0,
    recordingHours: 0,
    languageDistribution: [] as {language: string, count: number}[]
  });
  
  const router = useRouter();
  const supabase = createClient();

  // Calculate how long ago a date was
  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
  };

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
        
        // Fetch active transcripts
        const { data: activeTranscripts, error: activeError } = await supabase
          .from('transcripts')
          .select('*, transcript_contents(content)')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false });
        
        if (activeError) {
          console.error('Error fetching transcripts:', activeError);
          toast.error('Failed to load your transcripts');
          return;
        }

        // Count trashed transcripts
        const { count: trashCount, error: trashError } = await supabase
          .from('transcripts')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_deleted', true);
        
        if (trashError) {
          console.error('Error counting trash:', trashError);
        } else {
          setTrashedCount(trashCount || 0);
        }
        
        // Process transcripts to include content and calculate stats
        const processedTranscripts = activeTranscripts?.map((t) => {
          // Handle nested content from the join
          const content = t.transcript_contents?.[0]?.content || '';
          
          // Calculate word count if not already present
          const wordCount = t.word_count || content.split(/\s+/).filter(Boolean).length;
          
          return {
            ...t,
            content,
            word_count: wordCount
          };
        }) || [];
        
        setTranscripts(processedTranscripts);
        
        // Calculate statistics
        const totalWords = processedTranscripts.reduce((sum, t) => sum + (t.word_count || 0), 0);
        
        // Estimate recording hours (average speaking rate ~150 words per minute)
        const recordingHours = totalWords / 150 / 60;
        
        // Count languages
        const languages = processedTranscripts.reduce((acc, t) => {
          const lang = t.language || 'unknown';
          acc[lang] = (acc[lang] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const languageDistribution = Object.entries(languages).map(([language, count]) => ({
          language,
          count: count as number
        })).sort((a, b) => b.count - a.count);
        
        setStats({
          totalTranscripts: processedTranscripts.length,
          totalWords,
          recordingHours,
          languageDistribution
        });
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('An error occurred while loading your dashboard');
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
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.email?.split('@')[0] || 'User'}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Stats Card - Total Transcripts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary" />
              Transcripts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTranscripts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {trashedCount > 0 && `${trashedCount} in trash`}
            </p>
            <div className="mt-3">
              <Progress
                value={(stats.totalTranscripts / (stats.totalTranscripts + trashedCount || 1)) * 100}
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Stats Card - Words Transcribed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <BarChart className="h-4 w-4 mr-2 text-primary" />
              Words Transcribed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalWords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(stats.totalWords / stats.totalTranscripts)} words per transcript
            </p>
          </CardContent>
        </Card>
        
        {/* Stats Card - Recording Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              Recording Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recordingHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(stats.recordingHours * 60 / (stats.totalTranscripts || 1))} minutes per recording
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="recent">Recent Transcripts</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button asChild size="sm">
              <Link href="/recorder">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Recording
              </Link>
            </Button>
          </div>
          
          {transcripts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">You don't have any transcripts yet.</p>
                <p className="text-muted-foreground mt-2 mb-6">
                  Start by creating a new recording with our speech-to-text converter.
                </p>
                <Button asChild>
                  <Link href="/recorder">
                    <Mic className="h-4 w-4 mr-2" />
                    Create Your First Transcript
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transcripts.slice(0, 5).map((transcript) => (
                <Card key={transcript.id} className="overflow-hidden">
                  <div className="flex border-l-4 border-primary h-full">
                    <CardContent className="p-4 flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium truncate">{transcript.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" /> 
                            {timeAgo(transcript.updated_at)}
                            {transcript.language && (
                              <>
                                <span className="mx-1">•</span>
                                <Globe className="h-3 w-3 mr-1" />
                                {transcript.language}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-sm font-medium">
                          {transcript.word_count} words
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                        {transcript.content}
                      </p>
                    </CardContent>
                    <div className="flex items-center border-l px-4">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/transcripts/${transcript.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {transcripts.length > 5 && (
                <div className="text-center mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/transcripts">
                      View All Transcripts
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="languages">
          <Card>
            <CardHeader>
              <CardTitle>Language Distribution</CardTitle>
              <CardDescription>Languages used in your transcripts</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.languageDistribution.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No language data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.languageDistribution.map(({language, count}) => (
                    <div key={language} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{language === 'unknown' ? 'Unknown' : language}</span>
                        <span>{count} transcript{count !== 1 ? 's' : ''}</span>
                      </div>
                      <Progress 
                        value={(count / stats.totalTranscripts) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button className="h-auto py-4 justify-start" asChild>
              <Link href="/recorder">
                <Mic className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">New Recording</div>
                  <div className="text-xs text-muted-foreground mt-1">Create a new speech-to-text transcript</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/transcripts">
                <FileText className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">All Transcripts</div>
                  <div className="text-xs text-muted-foreground mt-1">Browse and manage your transcripts</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/profile">
                <User className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Profile</div>
                  <div className="text-xs text-muted-foreground mt-1">Manage account settings</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/trash">
                <Trash2 className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Trash</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {trashedCount > 0 
                      ? `${trashedCount} item${trashedCount !== 1 ? 's' : ''} in trash` 
                      : 'Empty'
                    }
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Usage Stats</CardTitle>
            <CardDescription>Your activity over time</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-48">
            {/* Placeholder for future chart */}
            <div className="text-center text-muted-foreground">
              <BarChart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Detailed analytics coming soon</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-5">
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 