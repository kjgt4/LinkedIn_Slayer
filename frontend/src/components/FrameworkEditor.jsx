import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { FRAMEWORKS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function FrameworkEditor({ framework, sections, onChange }) {
  const frameworkConfig = FRAMEWORKS[framework];
  const [openSections, setOpenSections] = useState(
    frameworkConfig.sections.map(s => s.key)
  );

  const toggleSection = (key) => {
    setOpenSections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleSectionChange = (key, value) => {
    onChange({
      ...sections,
      [key]: value
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider", frameworkConfig.color)}>
          {frameworkConfig.label} Framework
        </span>
      </div>

      {frameworkConfig.sections.map(({ key, label, description }) => (
        <Collapsible
          key={key}
          open={openSections.includes(key)}
          onOpenChange={() => toggleSection(key)}
        >
          <div className="card-surface overflow-hidden">
            <CollapsibleTrigger 
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
              data-testid={`framework-section-${key}-toggle`}
            >
              {openSections.includes(key) ? (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              )}
              <div className="flex-1 text-left">
                <span className="font-heading text-lg font-semibold text-white uppercase tracking-wide">
                  {label[0]}
                </span>
                <span className="text-neutral-400 ml-2 text-sm">{label.slice(1)}</span>
              </div>
              <span className="text-xs text-neutral-500 hidden sm:block">{description}</span>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <Textarea
                  value={sections[key] || ''}
                  onChange={(e) => handleSectionChange(key, e.target.value)}
                  placeholder={`Write your ${label.toLowerCase()}...`}
                  className="min-h-[120px] bg-black/30 border-white/10 focus:border-electric-blue resize-none"
                  data-testid={`framework-section-${key}-input`}
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
