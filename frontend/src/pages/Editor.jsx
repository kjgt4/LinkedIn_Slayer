import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Loader2, Save, Copy, Wand2, ArrowLeft, Check, Smartphone, Monitor,
  Calendar, Clock, Send, Linkedin, Eye, EyeOff, Home
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import { FRAMEWORKS, formatDate, getErrorMessage } from '@/lib/utils';
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
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
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

  const loadPost = useCallback(async () => {
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
      toast.error(getErrorMessage(error, 'Failed to load post'));
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [postId, navigate]);

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
  }, [postId, loadPost, searchParams]);

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
      toast.error(getErrorMessage(error, 'Failed to save post'));
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
      toast.error(getErrorMessage(error, 'Failed to publish to LinkedIn'));
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
      toast.error(getErrorMessage(error, 'Failed to publish post'));
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
      toast.error(getErrorMessage(error, 'Failed to generate content'));
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
      toast.error(getErrorMessage(error, 'Failed to copy to clipboard'));
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
  }, [post.framework_sections, combineFrameworkContent, post.content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            data-testid="editor-back-btn"
            className="md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            {/* Breadcrumb - hidden on mobile */}
            <Breadcrumb className="hidden md:block mb-1">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Home className="w-3 h-3" />
                      Dashboard
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {postId && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <button onClick={() => navigate('/library')} className="text-muted-foreground hover:text-foreground">
                          Library
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground">
                    {postId ? 'Edit Post' : 'Create Post'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-xl font-bold text-foreground">
              {postId ? 'Edit Post' : 'Create Post'}
            </h1>
            <p className={cn(
              "text-xs",
              post.status === 'published' ? 'text-emerald-600 dark:text-emerald-400' :
              post.status === 'scheduled' ? 'text-primary' : 'text-muted-foreground'
            )}>
              {post.status === 'published' ? 'Published' :
               post.status === 'scheduled' ? `Scheduled: ${formatDate(post.scheduled_date)}` : 'Draft'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={post.status === 'published'}
                data-testid="schedule-post-btn"
                size="sm"
                className="hidden sm:flex"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Post</DialogTitle>
                <DialogDescription>
                  Choose a date and time slot for your post
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="schedule-date-picker"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduleDate ? formatDate(scheduleDate.toISOString()) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Slot (1-4)</label>
                    <Select value={scheduleSlot} onValueChange={setScheduleSlot}>
                      <SelectTrigger data-testid="schedule-slot-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Slot 1 (Morning)</SelectItem>
                        <SelectItem value="1">Slot 2 (Midday)</SelectItem>
                        <SelectItem value="2">Slot 3 (Afternoon)</SelectItem>
                        <SelectItem value="3">Slot 4 (Evening)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      data-testid="schedule-time-input"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSchedule} data-testid="confirm-schedule-btn">
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
              size="sm"
              className="hidden md:flex bg-[#0077B5] hover:bg-[#006097] text-white"
            >
              {publishingToLinkedIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Linkedin className="w-4 h-4 mr-2" />
              )}
              LinkedIn
            </Button>
          )}

          {/* Regular Publish Button */}
          {post.status !== 'published' && postId && (
            <Button
              onClick={handlePublish}
              disabled={publishing}
              data-testid="publish-post-btn"
              size="sm"
              className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            disabled={!post.hook && !post.content}
            data-testid="copy-to-clipboard-btn"
            size="sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">{copied ? 'Copied!' : 'Copy'}</span>
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-post-btn"
            size="sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">Save</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Editor Pane */}
        <div className="col-span-12 lg:col-span-8 border-r border-border p-4 md:p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            {/* Topic/Title */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Topic</label>
              <Input
                value={post.title}
                onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What's this post about?"
                data-testid="post-topic-input"
                className="text-lg"
              />
            </div>

            {/* Framework & Pillar Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Framework</label>
                <FrameworkSelector value={post.framework} onChange={handleFrameworkChange} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Content Pillar</label>
                <PillarSelector value={post.pillar} onChange={(pillar) => setPost(prev => ({ ...prev, pillar }))} />
              </div>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={generating || !post.title}
                data-testid="generate-content-btn"
                size="lg"
                className="px-8"
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider block">Hook (8 words max)</label>
              <Input
                value={post.hook}
                onChange={(e) => setPost(prev => ({ ...prev, hook: e.target.value }))}
                placeholder="Your attention-grabbing first line..."
                data-testid="post-hook-input"
                className="text-xl font-semibold"
              />
              <HookValidator hook={post.hook} />
            </div>

            {/* Re-hook */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Re-hook</label>
              <Input
                value={post.rehook}
                onChange={(e) => setPost(prev => ({ ...prev, rehook: e.target.value }))}
                placeholder="Your compelling second line with proof..."
                data-testid="post-rehook-input"
              />
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="freeform" className="w-full">
              <TabsList>
                <TabsTrigger value="freeform" data-testid="tab-freeform">Freeform</TabsTrigger>
                <TabsTrigger value="framework" data-testid="tab-framework">Framework</TabsTrigger>
              </TabsList>

              <TabsContent value="freeform" className="mt-4">
                <Textarea
                  value={post.content}
                  onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content..."
                  data-testid="post-content-textarea"
                  className="min-h-[300px] md:min-h-[400px] resize-none font-mono text-sm leading-relaxed"
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

        {/* Mobile Preview Toggle Button */}
        <Button
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg"
          aria-label={mobilePreviewOpen ? 'Hide preview' : 'Show preview'}
        >
          {mobilePreviewOpen ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        </Button>

        {/* Preview Pane - visible on desktop, or on mobile when toggled */}
        <div className={cn(
          "lg:col-span-4 bg-muted/50 p-4 md:p-6 overflow-y-auto",
          mobilePreviewOpen
            ? "fixed inset-0 z-40 lg:relative lg:inset-auto pt-20 lg:pt-6 bg-background"
            : "hidden lg:block"
        )}>
          <div className="sticky top-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {/* Close button - only on mobile */}
                {mobilePreviewOpen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobilePreviewOpen(false)}
                    className="lg:hidden"
                    aria-label="Close preview"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setPreviewMode('mobile')}
                  data-testid="preview-mobile-btn"
                  aria-label="Mobile preview"
                  aria-pressed={previewMode === 'mobile'}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setPreviewMode('desktop')}
                  data-testid="preview-desktop-btn"
                  aria-label="Desktop preview"
                  aria-pressed={previewMode === 'desktop'}
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
                <span className="text-muted-foreground">Word Count</span>
                <span className="text-foreground font-mono">
                  {post.content ? post.content.split(/\s+/).filter(Boolean).length : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Hook Words</span>
                <span className={cn(
                  "font-mono",
                  post.hook && post.hook.split(/\s+/).length > 8 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                )}>
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
