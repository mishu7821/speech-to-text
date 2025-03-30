'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  PlusCircle, 
  FileText, 
  Calendar, 
  Globe, 
  Download, 
  Pencil, 
  Trash, 
  Clock,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye
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

export default function TranscriptsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Language options based on common browser speech recognition support
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish (Spain)' },
    { value: 'es-MX', label: 'Spanish (Mexico)' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'ar-SA', label: 'Arabic' },
    { value: 'ru-RU', label: 'Russian' },
  ];

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

  // Function to count words in text
  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // Function to get reading time estimate
  const getReadingTime = (wordCount: number) => {
    const minutes = Math.ceil(wordCount / 200); // Average reading speed ~200 words per minute
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  // Function to extract keywords from text
  const getKeywords = (text: string, limit = 5) => {
    if (!text) return [];
    
    // Remove common stop words
    const stopWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of', 'is', 'was', 'were', 'are', 'am', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];
    
    // Split text into words, convert to lowercase, filter out short words and stop words
    const words = text.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .map(word => word.replace(/[^\w]/g, '')); // Remove punctuation
    
    // Count word frequency
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
      if (word) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    // Convert to array and sort by frequency
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, count }))
      .slice(0, limit);
    
    return sortedWords;
  };

  useEffect(() => {
    const getTranscripts = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        
        // Fetch transcripts
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
        
      } catch (error) {
        console.error('Error fetching transcript data:', error);
        toast.error('An error occurred while loading your transcripts');
      } finally {
        setLoading(false);
      }
    };

    getTranscripts();
  }, [supabase, router]);

  // Handle transcript viewing
  const handleViewTranscript = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setShowTranscriptDialog(true);
  };

  // Handle transcript editing
  const handleEditTranscript = (transcript: Transcript) => {
    router.push(`/transcripts/${transcript.id}/edit`);
  };

  // Handle transcript download
  const handleDownloadTranscript = (transcript: Transcript) => {
    if (!transcript.content) {
      toast.error('No content to download');
      return;
    }
    
    const element = document.createElement('a');
    const file = new Blob([transcript.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${transcript.title.replace(/\s+/g, '_')}_${new Date(transcript.created_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success('Transcript downloaded successfully');
  };

  // Handle transcript deletion
  const handleDeleteTranscript = async (transcript: Transcript) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', transcript.id);
      
      if (error) throw error;
      
      toast.success('Transcript moved to trash');
      setTranscripts(prev => prev.filter(t => t.id !== transcript.id));
      
      if (showTranscriptDialog) {
        setShowTranscriptDialog(false);
      }
      
    } catch (error) {
      console.error('Error moving transcript to trash:', error);
      toast.error('Failed to move transcript to trash');
    }
  };

  // Filter and sort transcripts
  const filteredAndSortedTranscripts = transcripts
    .filter(transcript => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          transcript.title.toLowerCase().includes(query) ||
          transcript.content?.toLowerCase().includes(query) ||
          false
        );
      }
      return true;
    })
    .filter(transcript => {
      // Filter by language
      if (filterLanguage && filterLanguage !== 'all') {
        return transcript.language === filterLanguage;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by selected order
      switch (sortOrder) {
        case 'newest':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'oldest':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        case 'largest':
          return (b.word_count || 0) - (a.word_count || 0);
        case 'smallest':
          return (a.word_count || 0) - (b.word_count || 0);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your transcripts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Transcripts</h1>
          <p className="text-muted-foreground mt-1">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <Button asChild>
          <Link href="/recorder">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Recording
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languageOptions.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center">
                <ArrowDown className="h-3.5 w-3.5 mr-2" />
                Newest First
              </div>
            </SelectItem>
            <SelectItem value="oldest">
              <div className="flex items-center">
                <ArrowUp className="h-3.5 w-3.5 mr-2" />
                Oldest First
              </div>
            </SelectItem>
            <SelectItem value="a-z">
              <div className="flex items-center">
                <ArrowDown className="h-3.5 w-3.5 mr-2" />
                A to Z
              </div>
            </SelectItem>
            <SelectItem value="z-a">
              <div className="flex items-center">
                <ArrowUp className="h-3.5 w-3.5 mr-2" />
                Z to A
              </div>
            </SelectItem>
            <SelectItem value="largest">
              <div className="flex items-center">
                <ArrowDown className="h-3.5 w-3.5 mr-2" />
                Largest First
              </div>
            </SelectItem>
            <SelectItem value="smallest">
              <div className="flex items-center">
                <ArrowUp className="h-3.5 w-3.5 mr-2" />
                Smallest First
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAndSortedTranscripts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            
            {transcripts.length === 0 ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No Transcripts Found</h2>
                <p className="text-muted-foreground mb-6">
                  You haven't created any transcripts yet. Start by recording your voice.
                </p>
                <Button asChild>
                  <Link href="/recorder">
                    Create Your First Transcript
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No Matches Found</h2>
                <p className="text-muted-foreground mb-6">
                  No transcripts match your current search filters.
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setFilterLanguage('all');
                  setSortOrder('newest');
                }}>
                  Clear Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTranscripts.map((transcript) => (
            <Card key={transcript.id} className="overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-0">
                <div className="flex items-center border-b p-4">
                  <div className="flex-1 truncate">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-medium truncate">{transcript.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {timeAgo(transcript.updated_at)}
                      {transcript.language && (
                        <>
                          <span>•</span>
                          <Globe className="h-3 w-3" />
                          <span>{languageOptions.find(lang => lang.value === transcript.language)?.label || transcript.language}</span>
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleViewTranscript(transcript)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-4">
                  <p className="text-sm line-clamp-2 text-muted-foreground">{transcript.content}</p>
                </div>
                
                <div className="bg-muted/50 p-3 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    {transcript.word_count} words • {getReadingTime(transcript.word_count || 0)} read
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditTranscript(transcript)}
                      className="h-7 px-2"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownloadTranscript(transcript)}
                      className="h-7 px-2"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteTranscript(transcript)}
                      className="h-7 px-2 text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Transcript Detail Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedTranscript?.title || 'Transcript Details'}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{selectedTranscript?.updated_at && new Date(selectedTranscript.updated_at).toLocaleString()}</span>
              </div>
              
              {selectedTranscript?.language && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {languageOptions.find(lang => lang.value === selectedTranscript.language)?.label || selectedTranscript.language}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{selectedTranscript?.word_count || 0} words</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{getReadingTime(selectedTranscript?.word_count || 0)} read</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="read" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="read">Read</TabsTrigger>
              <TabsTrigger value="analyze">Analyze</TabsTrigger>
            </TabsList>
            
            <TabsContent value="read" className="mt-4 space-y-4">
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/30 p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Transcript Content</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 h-7"
                      onClick={() => {
                        if (selectedTranscript?.content) {
                          navigator.clipboard.writeText(selectedTranscript.content);
                          toast.success('Copied to clipboard');
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-card max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <p className="whitespace-pre-wrap">{selectedTranscript?.content}</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analyze" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transcript Analysis</CardTitle>
                  <CardDescription>Key insights from your transcript</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Word Count</h4>
                      <div className="text-2xl font-bold">{selectedTranscript?.word_count || 0}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Estimated Reading Time</h4>
                      <div className="text-2xl font-bold">{getReadingTime(selectedTranscript?.word_count || 0)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Keyword Frequency</h4>
                    {selectedTranscript?.content ? (
                      <div className="flex flex-wrap gap-2">
                        {getKeywords(selectedTranscript.content).map(keyword => (
                          <div key={keyword.word} className="px-2 py-1 bg-muted rounded-full text-xs">
                            {keyword.word} ({keyword.count})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No content available for analysis</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTranscriptDialog(false);
                  if (selectedTranscript) {
                    handleEditTranscript(selectedTranscript);
                  }
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => selectedTranscript && handleDownloadTranscript(selectedTranscript)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              <Button 
                variant="outline" 
                className="text-destructive hover:bg-destructive/10"
                onClick={() => selectedTranscript && handleDeleteTranscript(selectedTranscript)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setShowTranscriptDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 