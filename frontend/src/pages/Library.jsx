import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Trash2, Calendar, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/EmptyState';
import { getPosts, deletePost } from '@/lib/api';
import { PILLARS, FRAMEWORKS, formatDate, getErrorMessage } from '@/lib/utils';
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
      toast.error(getErrorMessage(error, 'Failed to load posts'));
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
      toast.error(getErrorMessage(error, 'Failed to delete post'));
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Content Library
          </h1>
          <p className="text-muted-foreground mt-2">Manage your drafts and published posts</p>
        </div>
        <Button
          onClick={() => navigate('/editor')}
          data-testid="library-create-btn"
          className="w-full sm:w-auto"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'scheduled', 'published'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            data-testid={`filter-${status}-btn`}
            size="sm"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-surface p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts found"
          description="Start creating content to build your library"
          action={
            <Button onClick={() => navigate('/editor')}>
              Create your first post
            </Button>
          }
          className="py-20"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="card-surface p-5 hover:shadow-md transition-all duration-200 group"
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
                  post.status === 'draft' ? 'bg-muted text-muted-foreground' :
                  post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                  'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                )}>
                  {post.status}
                </span>
              </div>

              <h3 className="font-medium text-foreground mb-2 line-clamp-1">
                {post.hook || post.title || 'Untitled'}
              </h3>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {post.rehook || post.content?.slice(0, 100) || 'No content yet...'}
              </p>

              {post.scheduled_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.scheduled_date)}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/editor/${post.id}`)}
                  data-testid={`edit-post-${post.id}-btn`}
                  className="flex-1 h-10"
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
                      className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
