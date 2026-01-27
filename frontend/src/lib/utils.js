import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const PILLARS = {
  growth: { label: 'Growth', color: 'pillar-growth', description: 'Broad appeal content' },
  tam: { label: 'TAM', color: 'pillar-tam', description: 'Target audience education' },
  sales: { label: 'Sales', color: 'pillar-sales', description: 'Case studies & proof' },
};

export const FRAMEWORKS = {
  slay: { 
    label: 'SLAY', 
    color: 'framework-slay',
    sections: [
      { key: 'story', label: 'Story', description: 'Capture attention with a personal story' },
      { key: 'lesson', label: 'Lesson', description: 'Pivot to a broader insight' },
      { key: 'advice', label: 'Advice', description: 'Provide actionable steps' },
      { key: 'you', label: 'You', description: 'End with engagement prompt' },
    ]
  },
  pas: { 
    label: 'PAS', 
    color: 'framework-pas',
    sections: [
      { key: 'problem', label: 'Problem', description: 'Identify specific pain point' },
      { key: 'agitate', label: 'Agitate', description: 'Create urgency with consequences' },
      { key: 'solution', label: 'Solution', description: 'Provide authoritative solution' },
    ]
  },
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};
