import { useState, useEffect } from 'react';
import { 
  Mic, Plus, Trash2, Loader2, Check, Sparkles, Edit3, 
  Volume2, MessageSquare, Target, User, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getVoiceProfiles, createVoiceProfile, updateVoiceProfile, 
  deleteVoiceProfile, activateVoiceProfile, analyzeWritingSamples 
} from '@/lib/api';
import { cn } from '@/lib/utils';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Polished and business-appropriate' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert and commanding' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating and uplifting' },
];

const STYLE_OPTIONS = [
  { value: 'business', label: 'Business', description: 'Corporate vocabulary' },
  { value: 'technical', label: 'Technical', description: 'Industry-specific terms' },
  { value: 'conversational', label: 'Conversational', description: 'Everyday language' },
  { value: 'academic', label: 'Academic', description: 'Scholarly and precise' },
  { value: 'creative', label: 'Creative', description: 'Imaginative and unique' },
];

const SENTENCE_OPTIONS = [
  { value: 'short', label: 'Short', description: 'Punchy, impactful sentences' },
  { value: 'varied', label: 'Varied', description: 'Mix of lengths for rhythm' },
  { value: 'complex', label: 'Complex', description: 'Longer, detailed sentences' },
];

export default function VoiceProfilePage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  // New profile form
  const [formData, setFormData] = useState({
    name: '',
    tone: 'professional',
    vocabulary_style: 'business',
    sentence_structure: 'varied',
    personality_traits: [],
    avoid_phrases: [],
    preferred_phrases: [],
    signature_expressions: [],
    example_posts: [],
    industry_context: '',
    target_audience: '',
  });

  // Analyze samples form
  const [samples, setSamples] = useState(['', '', '']);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await getVoiceProfiles();
      setProfiles(response.data);
    } catch (error) {
      toast.error('Failed to load voice profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Please enter a profile name');
      return;
    }

    setSaving(true);
    try {
      if (editingProfile) {
        await updateVoiceProfile(editingProfile.id, formData);
        toast.success('Profile updated');
      } else {
        await createVoiceProfile(formData);
        toast.success('Profile created');
      }
      setDialogOpen(false);
      setEditingProfile(null);
      resetForm();
      fetchProfiles();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteVoiceProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast.success('Profile deleted');
    } catch (error) {
      toast.error('Failed to delete profile');
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateVoiceProfile(id);
      setProfiles(prev => prev.map(p => ({
        ...p,
        is_active: p.id === id
      })));
      toast.success('Profile activated');
    } catch (error) {
      toast.error('Failed to activate profile');
    }
  };

  const handleAnalyzeSamples = async () => {
    const validSamples = samples.filter(s => s.trim().length > 50);
    if (validSamples.length < 2) {
      toast.error('Please provide at least 2 writing samples (50+ characters each)');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await analyzeWritingSamples(validSamples);
      const analysis = response.data;
      
      setFormData(prev => ({
        ...prev,
        name: analysis.recommended_profile_name || 'Analyzed Voice Profile',
        tone: analysis.tone || 'professional',
        vocabulary_style: analysis.vocabulary_style || 'business',
        sentence_structure: analysis.sentence_structure || 'varied',
        personality_traits: analysis.personality_traits || [],
        signature_expressions: analysis.signature_expressions || [],
        preferred_phrases: analysis.preferred_phrases || [],
        avoid_phrases: analysis.avoid_phrases || [],
      }));

      setAnalyzeDialogOpen(false);
      setDialogOpen(true);
      toast.success('Voice analysis complete! Review and customize your profile.');
    } catch (error) {
      toast.error('Failed to analyze writing samples');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      tone: profile.tone,
      vocabulary_style: profile.vocabulary_style,
      sentence_structure: profile.sentence_structure,
      personality_traits: profile.personality_traits || [],
      avoid_phrases: profile.avoid_phrases || [],
      preferred_phrases: profile.preferred_phrases || [],
      signature_expressions: profile.signature_expressions || [],
      example_posts: profile.example_posts || [],
      industry_context: profile.industry_context || '',
      target_audience: profile.target_audience || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tone: 'professional',
      vocabulary_style: 'business',
      sentence_structure: 'varied',
      personality_traits: [],
      avoid_phrases: [],
      preferred_phrases: [],
      signature_expressions: [],
      example_posts: [],
      industry_context: '',
      target_audience: '',
    });
  };

  const addToList = (field, value) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
    }
  };

  const removeFromList = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
            Voice Profile Engine
          </h1>
          <p className="text-neutral-400 mt-2">Define your unique brand voice for consistent AI-generated content</p>
        </div>
        <div className="flex gap-3">
          {/* Analyze Samples Dialog */}
          <Dialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="analyze-samples-btn" className="border-white/10">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze My Writing
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Analyze Your Writing Style</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Paste 2-3 examples of your LinkedIn posts. AI will analyze your voice and create a profile.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {samples.map((sample, i) => (
                  <div key={i}>
                    <Label className="text-neutral-400">Sample {i + 1}</Label>
                    <Textarea
                      value={sample}
                      onChange={(e) => {
                        const newSamples = [...samples];
                        newSamples[i] = e.target.value;
                        setSamples(newSamples);
                      }}
                      placeholder="Paste your LinkedIn post here..."
                      data-testid={`writing-sample-${i}`}
                      className="min-h-[100px] bg-black/30 border-white/10"
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={handleAnalyzeSamples} disabled={analyzing} className="btn-primary">
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Analyze Voice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Profile Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingProfile(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="create-voice-profile-btn" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingProfile ? 'Edit Voice Profile' : 'Create Voice Profile'}
                </DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Define the characteristics of your brand voice
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basics" className="w-full">
                <TabsList className="bg-black/30 border border-white/10 mb-4">
                  <TabsTrigger value="basics">Basics</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="phrases">Phrases</TabsTrigger>
                  <TabsTrigger value="context">Context</TabsTrigger>
                </TabsList>

                <TabsContent value="basics" className="space-y-4">
                  <div>
                    <Label className="text-neutral-400">Profile Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., My Professional Voice"
                      data-testid="voice-profile-name-input"
                      className="bg-black/30 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-400">Tone</Label>
                    <Select
                      value={formData.tone}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v }))}
                    >
                      <SelectTrigger className="bg-black/30 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-charcoal border-white/10">
                        {TONE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-neutral-400">Vocabulary Style</Label>
                    <Select
                      value={formData.vocabulary_style}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, vocabulary_style: v }))}
                    >
                      <SelectTrigger className="bg-black/30 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-charcoal border-white/10">
                        {STYLE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-neutral-400">Sentence Structure</Label>
                    <Select
                      value={formData.sentence_structure}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, sentence_structure: v }))}
                    >
                      <SelectTrigger className="bg-black/30 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-charcoal border-white/10">
                        {SENTENCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4">
                  <div>
                    <Label className="text-neutral-400">Personality Traits</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a trait (e.g., confident, humble)"
                        className="bg-black/30 border-white/10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('personality_traits', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.personality_traits.map((trait, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer"
                          onClick={() => removeFromList('personality_traits', i)}
                        >
                          {trait} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="phrases" className="space-y-4">
                  <div>
                    <Label className="text-neutral-400">Signature Expressions (phrases you commonly use)</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add expression (e.g., 'Here's the thing...')"
                        className="bg-black/30 border-white/10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('signature_expressions', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.signature_expressions.map((phrase, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer bg-purple-500/20 text-purple-300"
                          onClick={() => removeFromList('signature_expressions', i)}
                        >
                          "{phrase}" ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Preferred Phrases (to include)</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add preferred phrase"
                        className="bg-black/30 border-white/10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('preferred_phrases', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.preferred_phrases.map((phrase, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer bg-emerald-500/20 text-emerald-300"
                          onClick={() => removeFromList('preferred_phrases', i)}
                        >
                          {phrase} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-neutral-400">Phrases to Avoid</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add phrase to avoid (e.g., 'game-changer')"
                        className="bg-black/30 border-white/10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToList('avoid_phrases', e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.avoid_phrases.map((phrase, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer bg-red-500/20 text-red-300"
                          onClick={() => removeFromList('avoid_phrases', i)}
                        >
                          {phrase} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="context" className="space-y-4">
                  <div>
                    <Label className="text-neutral-400">Industry Context</Label>
                    <Input
                      value={formData.industry_context}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry_context: e.target.value }))}
                      placeholder="e.g., B2B SaaS, Healthcare Tech, Financial Services"
                      className="bg-black/30 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-400">Target Audience</Label>
                    <Input
                      value={formData.target_audience}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                      placeholder="e.g., CTOs, Marketing Directors, Startup Founders"
                      className="bg-black/30 border-white/10"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingProfile ? 'Update Profile' : 'Create Profile'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 card-surface">
          <Mic className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400 mb-2">No voice profiles yet</p>
          <p className="text-neutral-500 text-sm mb-4">Create a voice profile to ensure consistent brand voice in AI-generated content</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setAnalyzeDialogOpen(true)} variant="outline" className="border-white/10">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze My Writing
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={cn(
                "card-surface p-5 transition-all duration-200 group",
                profile.is_active && "ring-2 ring-electric-blue"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    profile.is_active ? "bg-electric-blue/20" : "bg-white/5"
                  )}>
                    <Volume2 className={cn(
                      "w-5 h-5",
                      profile.is_active ? "text-electric-blue" : "text-neutral-500"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{profile.name}</h3>
                    {profile.is_active && (
                      <Badge className="bg-electric-blue/20 text-electric-blue text-xs">Active</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-400">Tone:</span>
                  <span className="text-white capitalize">{profile.tone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-400">Style:</span>
                  <span className="text-white capitalize">{profile.vocabulary_style}</span>
                </div>
                {profile.industry_context && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-neutral-500" />
                    <span className="text-neutral-400">Industry:</span>
                    <span className="text-white truncate">{profile.industry_context}</span>
                  </div>
                )}
              </div>

              {profile.signature_expressions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-neutral-500 mb-2">Signature expressions:</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.signature_expressions.slice(0, 2).map((expr, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-purple-500/10 text-purple-300">
                        "{expr}"
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!profile.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleActivate(profile.id)}
                    data-testid={`activate-voice-${profile.id}-btn`}
                    className="flex-1 text-electric-blue hover:bg-electric-blue/10"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                  data-testid={`edit-voice-${profile.id}-btn`}
                  className="text-neutral-400 hover:text-white"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`delete-voice-${profile.id}-btn`}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-charcoal border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Profile?</AlertDialogTitle>
                      <AlertDialogDescription className="text-neutral-400">
                        This will permanently delete this voice profile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(profile.id)}
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
