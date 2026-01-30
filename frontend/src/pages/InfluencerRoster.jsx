import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Filter, Sparkles, ExternalLink, Trash2, Edit2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { influencersAPI, aiAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import AddPostDialog from '@/components/engagement/AddPostDialog';

const priorityColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusColors = {
  discovered: 'bg-blue-500/20 text-blue-400',
  following: 'bg-purple-500/20 text-purple-400',
  engaged: 'bg-green-500/20 text-green-400',
  connected: 'bg-cyan-500/20 text-cyan-400',
};

export default function InfluencerRoster() {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDiscoveryDialog, setShowDiscoveryDialog] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState(null);
  const [showAddPostDialog, setShowAddPostDialog] = useState(false);
  const [selectedInfluencerForPost, setSelectedInfluencerForPost] = useState(null);

  const loadInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await influencersAPI.getAll(params);
      setInfluencers(response.data);
    } catch (error) {
      toast.error('Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [filterPriority, filterStatus]);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  const filteredInfluencers = influencers.filter(inf => 
    inf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inf.headline || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inf.content_themes || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this influencer and all their tracked posts?')) return;
    try {
      await influencersAPI.delete(id);
      toast.success('Influencer deleted');
      loadInfluencers();
    } catch (error) {
      toast.error('Failed to delete influencer');
    }
  };

  const handleAddPost = (influencer) => {
    setSelectedInfluencerForPost(influencer);
    setShowAddPostDialog(true);
  };

  const formatLastEngaged = (date) => {
    if (!date) return 'Never engaged';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return `${Math.floor(diff / 30)} months ago`;
  };

  return (
    <div className="p-8 space-y-8" data-testid="influencer-roster">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-electric-blue" />
            Influencer Roster
          </h1>
          <p className="text-slate-400 mt-1">Track and engage with influential voices in your niche</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDiscoveryDialog(true)}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            data-testid="discovery-assistant-btn"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Find Influencers
          </Button>
          <Button
            onClick={() => { setEditingInfluencer(null); setShowAddDialog(true); }}
            className="bg-electric-blue hover:bg-electric-blue/80"
            data-testid="add-influencer-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Influencer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, headline, or theme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-charcoal border-white/10"
            data-testid="search-influencers"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40 bg-charcoal border-white/10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-charcoal border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="discovered">Discovered</SelectItem>
            <SelectItem value="following">Following</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Influencer Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading influencers...</div>
      ) : filteredInfluencers.length === 0 ? (
        <div className="text-center py-12 bg-charcoal/50 rounded-lg border border-white/10">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No influencers yet</h3>
          <p className="text-slate-400 mb-4">Start building your network by adding influential voices</p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-electric-blue">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Influencer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInfluencers.map((influencer) => (
            <div
              key={influencer.id}
              className="bg-charcoal border border-white/10 rounded-lg p-5 hover:border-electric-blue/30 transition-colors"
              data-testid={`influencer-card-${influencer.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white">
                    {influencer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{influencer.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-1">{influencer.headline || 'No headline'}</p>
                  </div>
                </div>
                <Badge className={cn('text-xs', priorityColors[influencer.engagement_priority])}>
                  {influencer.engagement_priority}
                </Badge>
              </div>

              {influencer.follower_count && (
                <p className="text-sm text-slate-500 mb-2">{influencer.follower_count.toLocaleString()} followers</p>
              )}

              {influencer.content_themes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {influencer.content_themes.slice(0, 3).map((theme, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-slate-800/50 border-slate-700">
                      {theme}
                    </Badge>
                  ))}
                  {influencer.content_themes.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-slate-800/50 border-slate-700">
                      +{influencer.content_themes.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <Badge className={cn('text-xs', statusColors[influencer.relationship_status])}>
                  {influencer.relationship_status}
                </Badge>
                <span className="text-slate-500">{formatLastEngaged(influencer.last_engaged_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPost(influencer)}
                  className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10"
                  data-testid={`add-post-btn-${influencer.id}`}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Add Post
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditingInfluencer(influencer); setShowAddDialog(true); }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(influencer.linkedin_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(influencer.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Influencer Dialog */}
      <AddInfluencerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        influencer={editingInfluencer}
        onSuccess={loadInfluencers}
      />

      {/* Discovery Assistant Dialog */}
      <DiscoveryAssistantDialog
        open={showDiscoveryDialog}
        onOpenChange={setShowDiscoveryDialog}
        onAddInfluencer={() => { setShowDiscoveryDialog(false); setShowAddDialog(true); }}
      />

      {/* Add Post Dialog */}
      <AddPostDialog
        open={showAddPostDialog}
        onOpenChange={setShowAddPostDialog}
        influencer={selectedInfluencerForPost}
        onSuccess={() => {
          setShowAddPostDialog(false);
          toast.success('Post added to engagement queue');
        }}
      />
    </div>
  );
}

// LinkedIn URL validation helper
const isValidLinkedInUrl = (url) => {
  if (!url) return false;
  // Match linkedin.com/in/username or linkedin.com/company/name patterns
  const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w-]+\/?$/i;
  return linkedInPattern.test(url);
};

// Add Influencer Dialog Component
function AddInfluencerDialog({ open, onOpenChange, influencer, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    linkedin_url: '',
    headline: '',
    follower_count: '',
    content_themes: '',
    engagement_priority: 'medium',
    relationship_status: 'discovered',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (influencer) {
      setFormData({
        name: influencer.name || '',
        linkedin_url: influencer.linkedin_url || '',
        headline: influencer.headline || '',
        follower_count: influencer.follower_count?.toString() || '',
        content_themes: (influencer.content_themes || []).join(', '),
        engagement_priority: influencer.engagement_priority || 'medium',
        relationship_status: influencer.relationship_status || 'discovered',
        notes: influencer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        linkedin_url: '',
        headline: '',
        follower_count: '',
        content_themes: '',
        engagement_priority: 'medium',
        relationship_status: 'discovered',
        notes: '',
      });
    }
    setErrors({});
  }, [influencer, open]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.linkedin_url.trim()) {
      newErrors.linkedin_url = 'LinkedIn URL is required';
    } else if (!isValidLinkedInUrl(formData.linkedin_url)) {
      newErrors.linkedin_url = 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name,
        linkedin_url: formData.linkedin_url,
        headline: formData.headline || null,
        follower_count: formData.follower_count ? parseInt(formData.follower_count) : null,
        content_themes: formData.content_themes ? formData.content_themes.split(',').map(t => t.trim()).filter(Boolean) : [],
        engagement_priority: formData.engagement_priority,
        relationship_status: formData.relationship_status,
        notes: formData.notes || null,
      };

      if (influencer) {
        await influencersAPI.update(influencer.id, data);
        toast.success('Influencer updated');
      } else {
        await influencersAPI.create(data);
        toast.success('Influencer added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save influencer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-charcoal border-white/10">
        <DialogHeader>
          <DialogTitle>{influencer ? 'Edit Influencer' : 'Add Influencer'}</DialogTitle>
          <DialogDescription>Track a new influential voice in your niche</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              placeholder="John Smith"
              className={cn("bg-obsidian border-white/10", errors.name && "border-red-500")}
              data-testid="influencer-name-input"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <Label>LinkedIn Profile URL *</Label>
            <Input
              value={formData.linkedin_url}
              onChange={(e) => {
                setFormData({ ...formData, linkedin_url: e.target.value });
                if (errors.linkedin_url) setErrors({ ...errors, linkedin_url: null });
              }}
              placeholder="https://linkedin.com/in/johnsmith"
              className={cn("bg-obsidian border-white/10", errors.linkedin_url && "border-red-500")}
              data-testid="influencer-url-input"
              aria-invalid={!!errors.linkedin_url}
              aria-describedby={errors.linkedin_url ? "url-error" : undefined}
            />
            {errors.linkedin_url && (
              <p id="url-error" className="text-xs text-red-400 mt-1">{errors.linkedin_url}</p>
            )}
          </div>
          <div>
            <Label>Headline</Label>
            <Input
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              placeholder="CEO at Company | Thought Leader"
              className="bg-obsidian border-white/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Follower Count</Label>
              <Input
                type="number"
                value={formData.follower_count}
                onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                placeholder="10000"
                className="bg-obsidian border-white/10"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.engagement_priority} onValueChange={(v) => setFormData({ ...formData, engagement_priority: v })}>
                <SelectTrigger className="bg-obsidian border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Relationship Status</Label>
            <Select value={formData.relationship_status} onValueChange={(v) => setFormData({ ...formData, relationship_status: v })}>
              <SelectTrigger className="bg-obsidian border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="following">Following</SelectItem>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content Themes (comma-separated)</Label>
            <Input
              value={formData.content_themes}
              onChange={(e) => setFormData({ ...formData, content_themes: e.target.value })}
              placeholder="B2B Sales, Leadership, SaaS"
              className="bg-obsidian border-white/10"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this influencer..."
              className="bg-obsidian border-white/10"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-electric-blue">
              {saving ? 'Saving...' : (influencer ? 'Update' : 'Add Influencer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Discovery Assistant Dialog
function DiscoveryAssistantDialog({ open, onOpenChange, onAddInfluencer }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    industry: '',
    audience: '',
    pillars: 'Growth, TAM, Sales',
  });

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.suggestInfluencerSearch({
        user_content_pillars: formData.pillars.split(',').map(p => p.trim()),
        user_industry: formData.industry,
        user_target_audience: formData.audience,
        existing_themes: [],
      });
      setSuggestions(response.data);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl bg-charcoal border-white/10 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Find Influential Voices
          </DialogTitle>
          <DialogDescription>Get AI-powered strategies for discovering influencers in your niche</DialogDescription>
        </DialogHeader>

        {!suggestions ? (
          <div className="space-y-4">
            <div>
              <Label>Your Industry</Label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., B2B SaaS, Healthcare Tech"
                className="bg-obsidian border-white/10"
              />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                placeholder="e.g., Sales Leaders, CTOs"
                className="bg-obsidian border-white/10"
              />
            </div>
            <div>
              <Label>Content Pillars (comma-separated)</Label>
              <Input
                value={formData.pillars}
                onChange={(e) => setFormData({ ...formData, pillars: e.target.value })}
                className="bg-obsidian border-white/10"
              />
            </div>
            <Button onClick={generateSuggestions} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
              {loading ? 'Generating...' : 'Generate Discovery Strategies'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Strategies */}
            <div>
              <h4 className="font-semibold text-white mb-3">Search Strategies</h4>
              <div className="space-y-3">
                {suggestions.search_strategies?.map((strategy, idx) => (
                  <div key={idx} className="bg-obsidian/50 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-electric-blue">{strategy.approach}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(strategy.query)}>
                        Copy Query
                      </Button>
                    </div>
                    <p className="text-sm text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded mb-2">{strategy.query}</p>
                    <p className="text-sm text-slate-400">{strategy.instructions}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Niches */}
            {suggestions.suggested_niches?.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-3">Suggested Niches</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.suggested_niches.map((niche, idx) => (
                    <Badge key={idx} className="bg-purple-500/20 text-purple-300 border-purple-500/30">{niche}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Terms */}
            {suggestions.suggested_search_terms?.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-3">Ready-to-Use Search Terms</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.suggested_search_terms.map((term, idx) => (
                    <Badge
                      key={idx}
                      className="bg-slate-700 text-white cursor-pointer hover:bg-slate-600"
                      onClick={() => copyToClipboard(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setSuggestions(null)} className="flex-1">
                Regenerate
              </Button>
              <Button onClick={onAddInfluencer} className="flex-1 bg-electric-blue">
                Found Someone? Add Them
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
