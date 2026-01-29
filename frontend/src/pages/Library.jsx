import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Trash2, Calendar, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getPosts, deletePost } from '@/lib/api';
import { PILLARS, FRAMEWORKS, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
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

export default function Library() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const response = await getPosts(status);
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id) => {
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
            Content Library
          </h1>
          <p className="text-neutral-400 mt-2">Manage your drafts and published posts</p>
        </div>
        <Button
          onClick={() => navigate('/editor')}
          data-testid="library-create-btn"
          className="btn-primary"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'scheduled', 'published'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'ghost'}
            onClick={() => setFilter(status)}
            data-testid={`filter-${status}-btn`}
            className={filter === status ? 'bg-electric-blue' : 'text-neutral-400 hover:text-white'}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 card-surface">
          <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No posts found</p>
          <Button
            onClick={() => navigate('/editor')}
            className="mt-4 btn-primary"
          >
            Create your first post
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="card-surface p-5 hover:border-white/20 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-xs", PILLARS[post.pillar]?.color)}>
                    {PILLARS[post.pillar]?.label}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-xs", FRAMEWORKS[post.framework]?.color)}>
                    {FRAMEWORKS[post.framework]?.label}
                  </span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded",
                  post.status === 'draft' ? 'bg-neutral-500/20 text-neutral-400' :
                  post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-emerald-500/20 text-emerald-400'
                )}>
                  {post.status}
                </span>
              </div>

              <h3 className="font-medium text-white mb-2 line-clamp-1">
                {post.hook || post.title || 'Untitled'}
              </h3>
              
              <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                {post.rehook || post.content?.slice(0, 100) || 'No content yet...'}
              </p>

              {post.scheduled_date && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.scheduled_date)}
                </div>
              )}

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/editor/${post.id}`)}
                  data-testid={`edit-post-${post.id}-btn`}
                  className="flex-1 text-neutral-400 hover:text-white"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`delete-post-${post.id}-btn`}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-charcoal border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Post?</AlertDialogTitle>
                      <AlertDialogDescription className="text-neutral-400">
                        This action cannot be undone. This will permanently delete your post.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(post.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
