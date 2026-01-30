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

/**
 * Extract a user-friendly error message from an API error response
 * @param {Error} error - The error object from axios/fetch
 * @param {string} fallback - Fallback message if no detail can be extracted
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, fallback = 'An error occurred') => {
  // Check for API response with detail message
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    // Handle array of validation errors
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || d.message || d).join(', ');
    }
    return detail;
  }

  // Check for standard error message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for network errors
  if (error.message === 'Network Error') {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Check for timeout
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Use error message if available
  if (error.message && error.message !== 'Request failed with status code ' + error.response?.status) {
    return error.message;
  }

  return fallback;
};
