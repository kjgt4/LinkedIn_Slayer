import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Clock, ExternalLink, Check, X, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trackedPostsAPI, aiAPI } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';
import AddPostDialog from '@/components/engagement/AddPostDialog';

const priorityColors = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-slate-500',
};

const statusBadgeColors = {
  new: 'bg-blue-500/20 text-blue-400',
  draft_ready: 'bg-purple-500/20 text-purple-400',
  engaged: 'bg-green-500/20 text-green-400',
  skipped: 'bg-slate-500/20 text-slate-400',
};

export default function EngagementQueue() {
  const [queue, setQueue] = useState([]);
  const [engagedPosts, setEngagedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [queueRes, engagedRes] = await Promise.all([
        trackedPostsAPI.getQueue(),
        trackedPostsAPI.getAll({ status: 'engaged' }),
      ]);
      setQueue(queueRes.data);
      setEngagedPosts(engagedRes.data.slice(0, 10));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load engagement queue'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleMarkEngaged = async (postId, engagementType) => {
    try {
      await trackedPostsAPI.markEngaged(postId, engagementType);
      toast.success('Post marked as engaged');
      loadQueue();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to mark post'));
    }
  };

  const handleSkip = async (postId) => {
    try {
      await trackedPostsAPI.update(postId, { status: 'skipped' });
      toast.success('Post skipped');
      loadQueue();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to skip post'));
    }
  };

  const openDraftDialog = (post) => {
    setSelectedPost(post);
    setShowDraftDialog(true);
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const newPosts = queue.filter(p => p.status === 'new');
  const draftReadyPosts = queue.filter(p => p.status === 'draft_ready');

  return (
    <div className="p-8 space-y-8" data-testid="engagement-queue">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-green-400" />
            Engagement Queue
          </h1>
          <p className="text-slate-400 mt-1">Review and engage with influencer posts</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-electric-blue hover:bg-electric-blue/80"
          data-testid="add-post-btn"
        >
          Add Post to Track
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{newPosts.length}</div>
          <div className="text-sm text-slate-400">New Posts</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{draftReadyPosts.length}</div>
          <div className="text-sm text-slate-400">Drafts Ready</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{engagedPosts.length}</div>
          <div className="text-sm text-slate-400">Recently Engaged</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading queue...</div>
      ) : queue.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No posts in queue"
          description="Add posts from influencers to start engaging and build relationships"
          action={
            <Button onClick={() => setShowAddDialog(true)} className="bg-electric-blue">
              Add Post to Track
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* New Posts */}
          {newPosts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-400">New</Badge>
                Posts Awaiting Engagement
              </h2>
              <div className="space-y-3">
                {newPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDraft={() => openDraftDialog(post)}
                    onMarkEngaged={(type) => handleMarkEngaged(post.id, type)}
                    onSkip={() => handleSkip(post.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Drafts Ready */}
          {draftReadyPosts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-400">Draft Ready</Badge>
                Ready to Engage
              </h2>
              <div className="space-y-3">
                {draftReadyPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDraft={() => openDraftDialog(post)}
                    onMarkEngaged={(type) => handleMarkEngaged(post.id, type)}
                    onSkip={() => handleSkip(post.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recently Engaged */}
          {engagedPosts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400">Engaged</Badge>
                Recently Completed
              </h2>
              <div className="space-y-3 opacity-75">
                {engagedPosts.slice(0, 5).map((post) => (
                  <div
                    key={post.id}
                    className="bg-charcoal/50 border border-white/5 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white font-medium">{post.influencer_name || 'Unknown'}</span>
                      <p className="text-sm text-slate-500 line-clamp-1">{post.post_content?.substring(0, 80)}...</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">{post.engagement_type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Post Dialog */}
      <AddPostDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          loadQueue();
        }}
      />

      {/* Comment Drafting Dialog */}
      <CommentDraftingDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        post={selectedPost}
        onSuccess={() => {
          setShowDraftDialog(false);
          loadQueue();
        }}
      />
    </div>
  );
}

// Post Card Component
function PostCard({ post, onDraft, onMarkEngaged, onSkip, formatTimeAgo }) {
  const [showEngageOptions, setShowEngageOptions] = useState(false);

  return (
    <div
      className={cn(
        'bg-charcoal border border-white/10 rounded-lg p-5 border-l-4',
        priorityColors[post.priority || 'medium']
      )}
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
            {(post.influencer_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white">{post.influencer_name || 'Unknown Influencer'}</h3>
            <p className="text-xs text-slate-500">{post.influencer_headline || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusBadgeColors[post.status]}>{post.status.replace('_', ' ')}</Badge>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(post.discovered_at)}
          </span>
        </div>
      </div>

      <p className="text-slate-300 text-sm mb-4 line-clamp-3">{post.post_content}</p>

      {post.drafted_comment && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 mb-4">
          <p className="text-xs text-purple-400 mb-1">Drafted Comment:</p>
          <p className="text-sm text-slate-300">{post.drafted_comment}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={onDraft}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid={`draft-comment-btn-${post.id}`}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          {post.drafted_comment ? 'Edit Draft' : 'Draft Comment'}
        </Button>
        
        {showEngageOptions ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onMarkEngaged('like')} className="border-green-500/50 text-green-400">
              Like Only
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMarkEngaged('comment')} className="border-green-500/50 text-green-400">
              Commented
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMarkEngaged('both')} className="border-green-500/50 text-green-400">
              Both
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowEngageOptions(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEngageOptions(true)}
            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
          >
            <Check className="w-3 h-3 mr-1" />
            Mark Engaged
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(post.linkedin_post_url, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Open
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-500 hover:text-slate-300"
          onClick={onSkip}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

// Comment Drafting Dialog
function CommentDraftingDialog({ open, onOpenChange, post, onSuccess }) {
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('experience');
  const [editedComments, setEditedComments] = useState({});
  const [engagementGoal, setEngagementGoal] = useState('relationship');
  const [openOnLinkedIn, setOpenOnLinkedIn] = useState(true);

  const generateComments = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const response = await aiAPI.draftEngagementComment({
        influencer_id: post.influencer_id,
        post_content: post.post_content,
        post_url: post.linkedin_post_url,
        engagement_goal: engagementGoal,
      });
      setVariations(response.data.variations || []);
      // Initialize edited comments
      const edited = {};
      (response.data.variations || []).forEach(v => {
        edited[v.approach] = v.comment;
      });
      setEditedComments(edited);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate comments'));
    } finally {
      setLoading(false);
    }
  }, [post, engagementGoal]);

  useEffect(() => {
    if (open && post) {
      generateComments();
    }
  }, [open, post, generateComments]);

  const handleUseComment = async () => {
    const currentApproach = selectedTab === 'experience' ? 'related_experience' 
      : selectedTab === 'insight' ? 'complementary_insight' : 'thoughtful_question';
    const comment = editedComments[currentApproach] || '';
    
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(comment);
      toast.success('Comment copied to clipboard');
      
      // Update post with drafted comment
      await trackedPostsAPI.update(post.id, {
        drafted_comment: comment,
        final_comment: comment,
        selected_approach: currentApproach,
        status: 'draft_ready',
      });
      
      // Open LinkedIn if checked
      if (openOnLinkedIn) {
        window.open(post.linkedin_post_url, '_blank');
      }
      
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save comment'));
    }
  };

  const getVariationByApproach = (approach) => {
    const mapping = {
      experience: 'related_experience',
      insight: 'complementary_insight',
      question: 'thoughtful_question',
    };
    return variations.find(v => v.approach === mapping[approach]);
  };

  const approachDescriptions = {
    experience: 'Share a related experience from your work',
    insight: 'Add a complementary perspective or insight',
    question: 'Ask a thoughtful, engaging question',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl bg-charcoal border-white/10 max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Draft Engagement Comment</DialogTitle>
          <DialogDescription>AI-generated comment variations for {post?.influencer_name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4 h-[60vh]">
          {/* Left Panel - Post Content */}
          <div className="col-span-2 bg-obsidian/50 rounded-lg p-4 overflow-y-auto">
            <h4 className="text-sm font-medium text-slate-400 mb-2">Original Post</h4>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{post?.post_content}</p>
          </div>

          {/* Right Panel - Comment Drafting */}
          <div className="col-span-3 flex flex-col">
            {/* Goal Selector */}
            <div className="flex gap-2 mb-4">
              {['visibility', 'relationship', 'thought_leadership'].map((goal) => (
                <Button
                  key={goal}
                  size="sm"
                  variant={engagementGoal === goal ? 'default' : 'outline'}
                  onClick={() => setEngagementGoal(goal)}
                  className={engagementGoal === goal ? 'bg-electric-blue' : ''}
                >
                  {goal.replace('_', ' ')}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Generating comments...
              </div>
            ) : (
              <>
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
                  <TabsList className="bg-obsidian">
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="insight">Insight</TabsTrigger>
                    <TabsTrigger value="question">Question</TabsTrigger>
                  </TabsList>

                  {['experience', 'insight', 'question'].map((tab) => {
                    const variation = getVariationByApproach(tab);
                    const approachKey = tab === 'experience' ? 'related_experience' 
                      : tab === 'insight' ? 'complementary_insight' : 'thoughtful_question';
                    
                    return (
                      <TabsContent key={tab} value={tab} className="flex-1 flex flex-col mt-4">
                        <p className="text-xs text-slate-500 mb-2">{approachDescriptions[tab]}</p>
                        <Textarea
                          value={editedComments[approachKey] || variation?.comment || ''}
                          onChange={(e) => setEditedComments({ ...editedComments, [approachKey]: e.target.value })}
                          className="flex-1 bg-obsidian border-white/10 resize-none min-h-[200px]"
                          placeholder="Comment will appear here..."
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            {(editedComments[approachKey] || variation?.comment || '').split(' ').filter(Boolean).length} words
                          </span>
                          <Button size="sm" variant="ghost" onClick={generateComments}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={openOnLinkedIn}
                      onChange={(e) => setOpenOnLinkedIn(e.target.checked)}
                      className="rounded"
                    />
                    Open post on LinkedIn after copying
                  </label>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleUseComment} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Copy className="w-4 h-4 mr-2" />
                      Use This Comment
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
