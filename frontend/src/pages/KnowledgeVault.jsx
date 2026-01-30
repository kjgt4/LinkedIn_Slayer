import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, Link, FileText, Trash2, Sparkles, Loader2, Plus, 
  File, Globe, Mic, BookOpen, FolderOpen, Search, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

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
      toast.error('Failed to load knowledge items');
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
      toast.error('Failed to create item');
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
      toast.error('Failed to upload file');
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
      toast.error('Failed to fetch URL content');
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
      toast.error('Failed to delete item');
    }
  };

  const handleExtractGems = async (id) => {
    setExtracting(id);
    try {
      const response = await extractGems(id);
      toast.success(`Extracted ${response.data.gems.length} gems!`);
      fetchItems();
    } catch (error) {
      toast.error('Failed to extract gems');
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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
            Knowledge Vault
          </h1>
          <p className="text-neutral-400 mt-2">Store your expertise for AI-powered content generation</p>
        </div>
        <div className="flex gap-3">
          {/* URL Dialog */}
          <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-url-btn" className="border-white/10">
                <Link className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add from URL</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Import content from a webpage
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-neutral-400">URL</Label>
                  <Input
                    value={newUrl.url}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    data-testid="url-input"
                    className="bg-black/30 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400">Title</Label>
                  <Input
                    value={newUrl.title}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Content title"
                    data-testid="url-title-input"
                    className="bg-black/30 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400">Tags (comma-separated)</Label>
                  <Input
                    value={newUrl.tags}
                    onChange={(e) => setNewUrl(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="marketing, strategy, AI"
                    className="bg-black/30 border-white/10"
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
            <Button variant="outline" className="border-white/10 pointer-events-none">
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
            <DialogContent className="bg-charcoal border-white/10 w-[95vw] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add Knowledge Item</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Add expertise, SOPs, transcripts, or notes to your vault
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-neutral-400">Title</Label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Sales Call Framework"
                    data-testid="knowledge-title-input"
                    className="bg-black/30 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400">Type</Label>
                  <Select
                    value={newItem.source_type}
                    onValueChange={(v) => setNewItem(prev => ({ ...prev, source_type: v }))}
                  >
                    <SelectTrigger data-testid="source-type-select" className="bg-black/30 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
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
                  <Label className="text-neutral-400">Content</Label>
                  <Textarea
                    value={newItem.content}
                    onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Paste your content, transcript, or notes..."
                    data-testid="knowledge-content-textarea"
                    className="min-h-[200px] bg-black/30 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400">Tags (comma-separated)</Label>
                  <Input
                    value={newItem.tags}
                    onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="sales, methodology, consulting"
                    className="bg-black/30 border-white/10"
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
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tag..."
            data-testid="knowledge-search-input"
            className="pl-10 bg-black/30 border-white/10"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-black/30 border border-white/10">
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
          <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 card-surface">
          <FolderOpen className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No knowledge items found</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4 btn-primary">
            Add your first item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const Icon = getSourceIcon(item.source_type);
            return (
              <div
                key={item.id}
                className="card-surface p-5 hover:border-white/20 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-electric-blue/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-electric-blue" />
                    </div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                      {SOURCE_TYPES.find(s => s.value === item.source_type)?.label}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-white mb-2 line-clamp-1">
                  {item.title}
                </h3>
                
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                  {item.content?.slice(0, 150) || 'No content preview...'}
                </p>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/5 text-neutral-400 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Extracted Gems */}
                {item.extracted_gems?.length > 0 && (
                  <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                    <p className="text-xs text-purple-400 mb-1">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {item.extracted_gems.length} gems extracted
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExtractGems(item.id)}
                    disabled={extracting === item.id}
                    data-testid={`extract-gems-${item.id}-btn`}
                    className="flex-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
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
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-charcoal border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Item?</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                          This will permanently delete this knowledge item.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-500 hover:bg-red-600"
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
