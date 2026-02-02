import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Link, FileText, Trash2, Sparkles, Loader2, Plus,
  File, Globe, Mic, BookOpen, FolderOpen, Search, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  getKnowledgeItems, createKnowledgeItem, deleteKnowledgeItem, 
  uploadKnowledgeFile, addKnowledgeFromUrl, extractGems 
} from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';

const SOURCE_TYPES = [
  { value: 'text', label: 'Text Note', icon: FileText },
  { value: 'url', label: 'URL', icon: Globe },
  { value: 'pdf', label: 'PDF', icon: File },
  { value: 'transcript', label: 'Transcript', icon: BookOpen },
  { value: 'voice_note', label: 'Voice Note', icon: Mic },
  { value: 'sop', label: 'SOP', icon: FolderOpen },
];

export default function KnowledgeVault() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [extracting, setExtracting] = useState(null);

  // New item form state
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    source_type: 'text',
    tags: ''
  });
  const [newUrl, setNewUrl] = useState({ url: '', title: '', tags: '' });
  const [uploading, setUploading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const sourceType = filter === 'all' ? null : filter;
      const response = await getKnowledgeItems(sourceType);
      setItems(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load knowledge items'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async () => {
    if (!newItem.title) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);
    try {
      const tags = newItem.tags.split(',').map(t => t.trim()).filter(Boolean);
      await createKnowledgeItem({
        ...newItem,
        tags
      });
      toast.success('Knowledge item created');
      setDialogOpen(false);
      setNewItem({ title: '', content: '', source_type: 'text', tags: '' });
      fetchItems();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create item'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('source_type', file.name.endsWith('.pdf') ? 'pdf' : 'text');
    formData.append('tags', '');

    setUploading(true);
    try {
      await uploadKnowledgeFile(formData);
      toast.success('File uploaded successfully');
      fetchItems();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.url || !newUrl.title) {
      toast.error('Please enter URL and title');
      return;
    }

    setUploading(true);
    try {
      const tags = newUrl.tags.split(',').map(t => t.trim()).filter(Boolean);
      await addKnowledgeFromUrl(newUrl.url, newUrl.title, tags);
      toast.success('URL content added');
      setUrlDialogOpen(false);
      setNewUrl({ url: '', title: '', tags: '' });
      fetchItems();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to fetch URL content'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteKnowledgeItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Item deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete item'));
    }
  };

  const handleExtractGems = async (id) => {
    setExtracting(id);
    try {
      const response = await extractGems(id);
      toast.success(`Extracted ${response.data.gems.length} gems!`);
      fetchItems();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to extract gems'));
    } finally {
      setExtracting(null);
    }
  };

  const filteredItems = items.filter(item => 
    search === '' || 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const getSourceIcon = (type) => {
    const sourceType = SOURCE_TYPES.find(s => s.value === type);
    return sourceType?.icon || FileText;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground">
            Knowledge Vault
          </h1>
          <p className="text-muted-foreground mt-2">Store your expertise for AI-powered content generation</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* URL Dialog */}
          <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-url-btn">
                <Link className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add from URL</DialogTitle>
                <DialogDescription>
                  Import content from a webpage
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">URL</Label>
                  <Input
                    value={newUrl.url}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    data-testid="url-input"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <Input
                    value={newUrl.title}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Content title"
                    data-testid="url-title-input"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Tags (comma-separated)</Label>
                  <Input
                    value={newUrl.tags}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="marketing, strategy, AI"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddUrl} disabled={uploading} className="btn-primary">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Content
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* File Upload */}
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".txt,.md,.pdf"
              onChange={handleFileUpload}
              data-testid="file-upload-input"
            />
            <Button variant="outline" className="pointer-events-none">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </label>

          {/* New Item Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-knowledge-btn" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Knowledge Item</DialogTitle>
                <DialogDescription>
                  Add expertise, SOPs, transcripts, or notes to your vault
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Sales Call Framework"
                    data-testid="knowledge-title-input"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Select
                    value={newItem.source_type}
                    onValueChange={(v) => setNewItem(prev => ({ ...prev, source_type: v }))}
                  >
                    <SelectTrigger data-testid="source-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Content</Label>
                  <Textarea
                    value={newItem.content}
                    onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Paste your content, transcript, or notes..."
                    data-testid="knowledge-content-textarea"
                    className="min-h-[200px]"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Tags (comma-separated)</Label>
                  <Input
                    value={newItem.tags}
                    onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="sales, methodology, consulting"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateItem} disabled={uploading} className="btn-primary">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add to Vault
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tag..."
            data-testid="knowledge-search-input"
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-muted">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="text">Notes</TabsTrigger>
            <TabsTrigger value="url">URLs</TabsTrigger>
            <TabsTrigger value="pdf">PDFs</TabsTrigger>
            <TabsTrigger value="transcript">Transcripts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No knowledge items found"
          description="Add expertise, SOPs, transcripts, or notes to power your AI content"
          action={
            <Button onClick={() => setDialogOpen(true)} className="btn-primary">
              Add your first item
            </Button>
          }
          className="py-20"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const Icon = getSourceIcon(item.source_type);
            return (
              <div
                key={item.id}
                className="card-surface p-5 hover:border-primary/30 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {SOURCE_TYPES.find(s => s.value === item.source_type)?.label}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-foreground mb-2 line-clamp-1">
                  {item.title}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {item.content?.slice(0, 150) || 'No content preview...'}
                </p>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Extracted Gems */}
                {item.extracted_gems?.length > 0 && (
                  <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {item.extracted_gems.length} gems extracted
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtractGems(item.id)}
                    disabled={extracting === item.id}
                    data-testid={`extract-gems-${item.id}-btn`}
                    className="flex-1 text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    {extracting === item.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Extract Gems
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`delete-knowledge-${item.id}-btn`}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this knowledge item.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item.id)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
