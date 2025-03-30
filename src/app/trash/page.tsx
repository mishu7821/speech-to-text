'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
  File
} from 'lucide-react';

interface Transcript {
  id: string;
  title: string;
  content?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_deleted: boolean;
  language?: string;
  word_count?: number;
}

export default function TrashPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trashedTranscripts, setTrashedTranscripts] = useState<Transcript[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Calculate how long the item has been in the trash
  const timeInTrash = (date: string) => {
    const deletedDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Calculate when the item will be permanently deleted (30 days after trashing)
  const deletionDate = (date: string) => {
    const deletedDate = new Date(date);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    return expiryDate.toLocaleDateString();
  };

  useEffect(() => {
    const getTrashItems = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        
        // Fetch trashed transcripts
        const { data: trashedItems, error } = await supabase
          .from('transcripts')
          .select('*, transcript_contents(content)')
          .eq('user_id', user.id)
          .eq('is_deleted', true)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching trashed items:', error);
          toast.error('Failed to load trash items');
          return;
        }
        
        // Process transcripts to include content
        const processedTranscripts = trashedItems?.map((t) => {
          // Handle nested content from the join
          const content = t.transcript_contents?.[0]?.content || '';
          
          return {
            ...t,
            content
          };
        }) || [];
        
        setTrashedTranscripts(processedTranscripts);
        
      } catch (error) {
        console.error('Error fetching trash data:', error);
        toast.error('An error occurred while loading your trash');
      } finally {
        setLoading(false);
      }
    };

    getTrashItems();
  }, [supabase, router]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === trashedTranscripts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trashedTranscripts.map(t => t.id));
    }
  };

  const handleRestoreItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Transcript restored successfully');
      setTrashedTranscripts(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
      
    } catch (error) {
      console.error('Error restoring transcript:', error);
      toast.error('Failed to restore transcript');
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ is_deleted: false, deleted_at: null })
        .in('id', selectedIds);
      
      if (error) throw error;
      
      toast.success(`${selectedIds.length} transcript${selectedIds.length !== 1 ? 's' : ''} restored`);
      setTrashedTranscripts(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      
    } catch (error) {
      console.error('Error restoring transcripts:', error);
      toast.error('Failed to restore transcripts');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this transcript? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Transcript permanently deleted');
      setTrashedTranscripts(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
      
    } catch (error) {
      console.error('Error deleting transcript:', error);
      toast.error('Failed to delete transcript');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.')) {
      return;
    }

    setIsEmptyingTrash(true);
    
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .in('id', trashedTranscripts.map(t => t.id));
      
      if (error) throw error;
      
      toast.success('Trash emptied successfully');
      setTrashedTranscripts([]);
      setSelectedIds([]);
      
    } catch (error) {
      console.error('Error emptying trash:', error);
      toast.error('Failed to empty trash');
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading trash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trash</h1>
          <p className="text-muted-foreground mt-1">
            Items in trash will be permanently deleted after 30 days
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleRestoreSelected}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore {selectedIds.length} Selected
            </Button>
          )}
          
          <Button 
            variant="destructive" 
            onClick={handleEmptyTrash}
            disabled={trashedTranscripts.length === 0 || isEmptyingTrash}
            className="flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        </div>
      </div>

      {trashedTranscripts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Trash2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trash is Empty</h2>
            <p className="text-muted-foreground mb-6">
              Items you delete will appear here for 30 days before being permanently removed
            </p>
            <Button onClick={() => router.push('/transcripts')}>
              Back to Transcripts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Deleted Transcripts</CardTitle>
              <div className="flex items-center">
                <Checkbox 
                  id="select-all" 
                  checked={selectedIds.length > 0 && selectedIds.length === trashedTranscripts.length}
                  onCheckedChange={handleSelectAll}
                  className="mr-2"
                />
                <label htmlFor="select-all" className="text-sm">
                  Select All
                </label>
              </div>
            </div>
            <CardDescription>
              {trashedTranscripts.length} item{trashedTranscripts.length !== 1 ? 's' : ''} in trash
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {trashedTranscripts.map((transcript) => (
                <div 
                  key={transcript.id}
                  className="flex items-center border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox 
                    id={`select-${transcript.id}`}
                    checked={selectedIds.includes(transcript.id)}
                    onCheckedChange={() => handleToggleSelect(transcript.id)}
                    className="mr-4"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="font-medium truncate">{transcript.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Deleted {timeInTrash(transcript.deleted_at || transcript.updated_at)}
                          </div>
                          
                          {transcript.language && (
                            <div className="flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              {transcript.language}
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <File className="h-3 w-3 mr-1" />
                            {transcript.word_count || '0'} words
                          </div>
                          
                          <div className="flex items-center text-amber-500">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expires {deletionDate(transcript.deleted_at || transcript.updated_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs line-clamp-1 max-w-[400px] text-muted-foreground">
                          {transcript.content || 'No content available'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex ml-4 space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRestoreItem(transcript.id)}
                      className="text-primary h-8"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteItem(transcript.id)}
                      className="text-destructive h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-5">
            <p className="text-sm text-muted-foreground">
              Selected: {selectedIds.length} of {trashedTranscripts.length}
            </p>
            
            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRestoreSelected}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Selected
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 