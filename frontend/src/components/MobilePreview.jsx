import { cn } from '@/lib/utils';

export default function MobilePreview({ hook, rehook, content, className }) {
  const formatContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <p key={i} className={cn("text-sm leading-relaxed", !line.trim() && "h-4")}>
        {line || '\u00A0'}
      </p>
    ));
  };

  return (
    <div className={cn("phone-frame", className)}>
      <div className="phone-screen p-4 pt-8 overflow-y-auto">
        {/* LinkedIn Header Mock */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Your Name</p>
            <p className="text-xs text-gray-500">LinkedIn Thought Leader</p>
            <p className="text-xs text-gray-400">1h • 🌐</p>
          </div>
        </div>

        {/* Post Content */}
        <div className="text-gray-900 space-y-2">
          {hook && (
            <p className="font-semibold text-base leading-tight">{hook}</p>
          )}
          {rehook && (
            <p className="text-sm text-gray-700">{rehook}</p>
          )}
          {content && (
            <div className="mt-3 space-y-2">
              {formatContent(content)}
            </div>
          )}
          {!hook && !content && (
            <p className="text-gray-400 text-sm italic">Your post preview will appear here...</p>
          )}
        </div>

        {/* LinkedIn Actions Mock */}
        <div className="mt-6 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500 mb-3">
            <span>142 likes</span>
            <span>23 comments</span>
          </div>
          <div className="flex justify-around py-2 border-t border-gray-200">
            <button className="text-gray-500 text-xs font-medium">Like</button>
            <button className="text-gray-500 text-xs font-medium">Comment</button>
            <button className="text-gray-500 text-xs font-medium">Repost</button>
            <button className="text-gray-500 text-xs font-medium">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
