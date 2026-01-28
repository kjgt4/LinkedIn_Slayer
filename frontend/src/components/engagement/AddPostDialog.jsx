import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { trackedPostsAPI, influencersAPI } from '@/lib/api';

export default function AddPostDialog({ open, onOpenChange, influencer, onSuccess }) {
  const [influencers, setInfluencers] = useState([]);
  const [formData, setFormData] = useState({
    influencer_id: '',
    linkedin_post_url: '',
    post_content: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);

  // Load influencers when dialog opens
  useEffect(() => {
    if (open && !influencer) {
      loadInfluencers();
    }
  }, [open, influencer]);

  // Pre-fill influencer if provided
  useEffect(() => {
    if (influencer) {
      setFormData(prev => ({
        ...prev,
        influencer_id: influencer.id,
      }));
    } else {
      setFormData({
        influencer_id: '',
        linkedin_post_url: '',
        post_content: '',
      });
    }
  }, [influencer, open]);

  const loadInfluencers = async () => {
    setLoadingInfluencers(true);
    try {
      const response = await influencersAPI.getAll();
      setInfluencers(response.data);
    } catch (error) {
      toast.error('Failed to load influencers');
    } finally {
      setLoadingInfluencers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.influencer_id) {
      toast.error('Please select an influencer');
      return;
    }
    if (!formData.linkedin_post_url) {
      toast.error('Post URL is required');
      return;
    }
    if (!formData.post_content) {
      toast.error('Post content is required');
      return;
    }

    setSaving(true);
    try {
      await trackedPostsAPI.create({
        influencer_id: formData.influencer_id,
        linkedin_post_url: formData.linkedin_post_url,
        post_content: formData.post_content,
      });
      toast.success('Post added to queue');
      onSuccess();
      setFormData({
        influencer_id: '',
        linkedin_post_url: '',
        post_content: '',
      });
    } catch (error) {
      toast.error('Failed to add post');
    } finally {
      setSaving(false);
    }
  };

  const selectedInfluencer = influencer || influencers.find(i => i.id === formData.influencer_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-charcoal border-white/10">
        <DialogHeader>
          <DialogTitle>Add Post to Track</DialogTitle>
          <DialogDescription>
            Paste a LinkedIn post from an influencer to add it to your engagement queue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Influencer Selection */}
          <div>
            <Label>Influencer</Label>
            {influencer ? (
              <div className="flex items-center gap-3 p-3 bg-obsidian/50 rounded-lg border border-white/10">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                  {influencer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{influencer.name}</p>
                  <p className="text-xs text-slate-400">{influencer.headline || 'No headline'}</p>
                </div>
              </div>
            ) : (
              <Select
                value={formData.influencer_id}
                onValueChange={(v) => setFormData({ ...formData, influencer_id: v })}
                disabled={loadingInfluencers}
              >
                <SelectTrigger className="bg-obsidian border-white/10">
                  <SelectValue placeholder={loadingInfluencers ? "Loading..." : "Select an influencer"} />
                </SelectTrigger>
                <SelectContent>
                  {influencers.map((inf) => (
                    <SelectItem key={inf.id} value={inf.id}>
                      {inf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!influencer && influencers.length === 0 && !loadingInfluencers && (
              <p className="text-xs text-amber-400 mt-1">
                No influencers yet. Add an influencer first from the Influencers page.
              </p>
            )}
          </div>

          {/* Post URL */}
          <div>
            <Label>LinkedIn Post URL *</Label>
            <Input
              value={formData.linkedin_post_url}
              onChange={(e) => setFormData({ ...formData, linkedin_post_url: e.target.value })}
              placeholder="https://linkedin.com/posts/..."
              className="bg-obsidian border-white/10"
              data-testid="post-url-input"
            />
            <p className="text-xs text-slate-500 mt-1">Copy the URL from the post on LinkedIn</p>
          </div>

          {/* Post Content */}
          <div>
            <Label>Post Content *</Label>
            <Textarea
              value={formData.post_content}
              onChange={(e) => setFormData({ ...formData, post_content: e.target.value })}
              placeholder="Paste the full post content here..."
              className="bg-obsidian border-white/10 min-h-[150px]"
              rows={6}
              data-testid="post-content-input"
            />
            <p className="text-xs text-slate-500 mt-1">Copy and paste the entire post text</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || (!influencer && influencers.length === 0)}
              className="bg-electric-blue"
            >
              {saving ? 'Adding...' : 'Add to Queue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
