import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, Save, Copy, Wand2, ArrowLeft, Check, Smartphone, Monitor,
  Calendar, Clock, Send, Linkedin
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobilePreview from '@/components/MobilePreview';
import HookValidator from '@/components/HookValidator';
import FrameworkEditor from '@/components/FrameworkEditor';
import FrameworkSelector from '@/components/FrameworkSelector';
import PillarSelector from '@/components/PillarSelector';
import { getPost, createPost, updatePost, generateContent, schedulePost, publishPost, publishToLinkedIn, getSettings } from '@/lib/api';
import { FRAMEWORKS, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function Editor() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [publishingToLinkedIn, setPublishingToLinkedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState('mobile');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleSlot, setScheduleSlot] = useState('0');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  const [post, setPost] = useState({
    title: '',
    hook: '',
    rehook: '',
    content: '',
    framework: searchParams.get('framework') || 'slay',
    framework_sections: {},
    pillar: searchParams.get('pillar') || 'growth',
    status: 'draft',
    scheduled_date: searchParams.get('date') || null,
    scheduled_slot: searchParams.get('slot') ? parseInt(searchParams.get('slot')) : null,
  });

  // Check LinkedIn connection status
  useEffect(() => {
    const checkLinkedIn = async () => {
      try {
        const response = await getSettings();
        setLinkedInConnected(response.data.linkedin_connected || false);
      } catch (error) {
        console.error('Failed to check LinkedIn status');
      }
    };
    checkLinkedIn();
  }, []);

  // Load existing post
  useEffect(() => {
    if (postId) {
      loadPost();
    } else {
      const topic = searchParams.get('topic');
      if (topic) {
        setPost(prev => ({ ...prev, title: topic }));
      }
    }
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const response = await getPost(postId);
      setPost(response.data);
      if (response.data.scheduled_date) {
        setScheduleDate(new Date(response.data.scheduled_date));
        setScheduleSlot(String(response.data.scheduled_slot || 0));
        setScheduleTime(response.data.scheduled_time || '09:00');
      }
    } catch (error) {
      toast.error('Failed to load post');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (postId) {
        await updatePost(postId, post);
        toast.success('Post updated');
      } else {
        const response = await createPost(post);
        toast.success('Post created');
        navigate(`/editor/${response.data.id}`);
      }
    } catch (error) {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToLinkedIn = async () => {
    if (!postId) {
      toast.error('Please save the post first');
      return;
    }
    
    setPublishingToLinkedIn(true);
    try {
      const response = await publishToLinkedIn(postId);
      setPost(prev => ({ 
        ...prev, 
        status: 'published',
        linkedin_post_id: response.data.linkedin_post_id 
      }));
      toast.success('Published to LinkedIn! 30-minute engagement timer started.');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to publish to LinkedIn';
      toast.error(message);
    } finally {
      setPublishingToLinkedIn(false);
    }
  };

  const handleSchedule = async () => {
    if (!postId) {
      // Save first
      const response = await createPost(post);
      const newPostId = response.data.id;
      navigate(`/editor/${newPostId}`);
      
      // Then schedule
      const dateStr = scheduleDate ? scheduleDate.toISOString().split('T')[0] : null;
      if (dateStr) {
        await schedulePost(newPostId, dateStr, parseInt(scheduleSlot), scheduleTime);
        toast.success('Post scheduled!');
        setScheduleDialogOpen(false);
        loadPost();
      }
    } else {
      const dateStr = scheduleDate ? scheduleDate.toISOString().split('T')[0] : null;
      if (dateStr) {
        await schedulePost(postId, dateStr, parseInt(scheduleSlot), scheduleTime);
        setPost(prev => ({ 
          ...prev, 
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_slot: parseInt(scheduleSlot),
          scheduled_time: scheduleTime
        }));
        toast.success('Post scheduled!');
        setScheduleDialogOpen(false);
      }
    }
  };

  const handlePublish = async () => {
    if (!postId) {
      toast.error('Please save the post first');
      return;
    }
    
    setPublishing(true);
    try {
      await publishPost(postId);
      setPost(prev => ({ ...prev, status: 'published' }));
      toast.success('Post published! 30-minute engagement timer started.');
    } catch (error) {
      toast.error('Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerate = async () => {
    if (!post.title) {
      toast.error('Please enter a topic first');
      return;
    }

    setGenerating(true);
    try {
      const response = await generateContent({
        topic: post.title,
        framework: post.framework,
        pillar: post.pillar,
        context: post.content || null,
      });

      const generated = response.data.content;
      const hookMatch = generated.match(/HOOK:\s*(.+?)(?:\n|REHOOK)/s);
      const rehookMatch = generated.match(/REHOOK:\s*(.+?)(?:\n\n|\[)/s);
      
      setPost(prev => ({
        ...prev,
        hook: hookMatch ? hookMatch[1].trim() : prev.hook,
        rehook: rehookMatch ? rehookMatch[1].trim() : prev.rehook,
        content: generated,
      }));

      toast.success('Content generated!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const fullPost = `${post.hook}\n\n${post.rehook}\n\n${post.content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleFrameworkChange = (framework) => {
    setPost(prev => ({
      ...prev,
      framework,
      framework_sections: {},
    }));
  };

  const combineFrameworkContent = useCallback(() => {
    const sections = FRAMEWORKS[post.framework].sections;
    return sections
      .map(s => post.framework_sections[s.key] || '')
      .filter(Boolean)
      .join('\n\n');
  }, [post.framework, post.framework_sections]);

  useEffect(() => {
    const combined = combineFrameworkContent();
    if (combined && combined !== post.content) {
      // Only update if using framework editor
    }
  }, [post.framework_sections, combineFrameworkContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="editor-back-btn"
            className="text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-white">
              {postId ? 'Edit Post' : 'Create Post'}
            </h1>
            <p className={cn(
              "text-xs",
              post.status === 'published' ? 'text-emerald-400' :
              post.status === 'scheduled' ? 'text-electric-blue' : 'text-neutral-500'
            )}>
              {post.status === 'published' ? 'Published' :
               post.status === 'scheduled' ? `Scheduled: ${formatDate(post.scheduled_date)}` : 'Draft'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={post.status === 'published'}
                data-testid="schedule-post-btn"
                className="border-white/10 hover:bg-white/5"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Schedule Post</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Choose a date and time slot for your post
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal border-white/10 bg-black/30"
                        data-testid="schedule-date-picker"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduleDate ? formatDate(scheduleDate.toISOString()) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-charcoal border-white/10" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                        className="bg-charcoal"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Slot (1-4)</label>
                    <Select value={scheduleSlot} onValueChange={setScheduleSlot}>
                      <SelectTrigger className="bg-black/30 border-white/10" data-testid="schedule-slot-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-charcoal border-white/10">
                        <SelectItem value="0">Slot 1 (Morning)</SelectItem>
                        <SelectItem value="1">Slot 2 (Midday)</SelectItem>
                        <SelectItem value="2">Slot 3 (Afternoon)</SelectItem>
                        <SelectItem value="3">Slot 4 (Evening)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-black/30 border-white/10"
                      data-testid="schedule-time-input"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSchedule} className="btn-primary" data-testid="confirm-schedule-btn">
                  <Calendar className="w-4 h-4 mr-2" />
                  Confirm Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* LinkedIn Publish Button */}
          {linkedInConnected && post.status !== 'published' && postId && (
            <Button
              onClick={handlePublishToLinkedIn}
              disabled={publishingToLinkedIn}
              data-testid="publish-to-linkedin-btn"
              className="bg-[#0077B5] hover:bg-[#006097] text-white"
            >
              {publishingToLinkedIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Linkedin className="w-4 h-4 mr-2" />
              )}
              Publish to LinkedIn
            </Button>
          )}

          {/* Regular Publish Button */}
          {post.status !== 'published' && postId && (
            <Button
              onClick={handlePublish}
              disabled={publishing}
              data-testid="publish-post-btn"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish Now
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            disabled={!post.hook && !post.content}
            data-testid="copy-to-clipboard-btn"
            className="border-white/10 hover:bg-white/5"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-post-btn"
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Editor Pane */}
        <div className="col-span-12 lg:col-span-8 border-r border-white/10 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Topic/Title */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Topic</label>
              <Input
                value={post.title}
                onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What's this post about?"
                data-testid="post-topic-input"
                className="text-lg bg-black/30 border-white/10 focus:border-electric-blue"
              />
            </div>

            {/* Framework & Pillar Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-3 block">Framework</label>
                <FrameworkSelector value={post.framework} onChange={handleFrameworkChange} />
              </div>
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-3 block">Content Pillar</label>
                <PillarSelector value={post.pillar} onChange={(pillar) => setPost(prev => ({ ...prev, pillar }))} />
              </div>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={generating || !post.title}
                data-testid="generate-content-btn"
                className="btn-primary px-8 py-3 text-lg animate-pulse-glow"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5 mr-2" />
                )}
                Generate with AI
              </Button>
            </div>

            {/* Hook Section */}
            <div className="space-y-4">
              <label className="text-xs text-neutral-500 uppercase tracking-wider block">Hook (8 words max)</label>
              <Input
                value={post.hook}
                onChange={(e) => setPost(prev => ({ ...prev, hook: e.target.value }))}
                placeholder="Your attention-grabbing first line..."
                data-testid="post-hook-input"
                className="text-xl font-semibold bg-black/30 border-white/10 focus:border-electric-blue"
              />
              <HookValidator hook={post.hook} />
            </div>

            {/* Re-hook */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Re-hook</label>
              <Input
                value={post.rehook}
                onChange={(e) => setPost(prev => ({ ...prev, rehook: e.target.value }))}
                placeholder="Your compelling second line with proof..."
                data-testid="post-rehook-input"
                className="bg-black/30 border-white/10 focus:border-electric-blue"
              />
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="freeform" className="w-full">
              <TabsList className="bg-black/30 border border-white/10">
                <TabsTrigger value="freeform" data-testid="tab-freeform">Freeform</TabsTrigger>
                <TabsTrigger value="framework" data-testid="tab-framework">Framework</TabsTrigger>
              </TabsList>
              
              <TabsContent value="freeform" className="mt-4">
                <Textarea
                  value={post.content}
                  onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content..."
                  data-testid="post-content-textarea"
                  className="min-h-[400px] bg-black/30 border-white/10 focus:border-electric-blue resize-none font-mono text-sm leading-relaxed"
                />
              </TabsContent>
              
              <TabsContent value="framework" className="mt-4">
                <FrameworkEditor
                  framework={post.framework}
                  sections={post.framework_sections}
                  onChange={(sections) => setPost(prev => ({ ...prev, framework_sections: sections }))}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Preview Pane */}
        <div className="hidden lg:block lg:col-span-4 bg-neutral-900/50 p-6 overflow-y-auto">
          <div className="sticky top-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-neutral-400">Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setPreviewMode('mobile')}
                  data-testid="preview-mobile-btn"
                  className={previewMode === 'mobile' ? 'bg-electric-blue' : 'text-neutral-400'}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setPreviewMode('desktop')}
                  data-testid="preview-desktop-btn"
                  className={previewMode === 'desktop' ? 'bg-electric-blue' : 'text-neutral-400'}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <MobilePreview
                hook={post.hook}
                rehook={post.rehook}
                content={post.content}
              />
            </div>

            {/* Word Count */}
            <div className="mt-6 p-4 card-surface">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Word Count</span>
                <span className="text-white font-mono">
                  {post.content ? post.content.split(/\s+/).filter(Boolean).length : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-neutral-500">Hook Words</span>
                <span className={`font-mono ${post.hook && post.hook.split(/\s+/).length > 8 ? 'text-amber-400' : 'text-white'}`}>
                  {post.hook ? post.hook.split(/\s+/).filter(Boolean).length : 0} / 8
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
