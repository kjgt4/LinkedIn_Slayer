import { useState, useEffect } from 'react';
import { Loader2, Save, Key, Cpu, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, updateSettings } from '@/lib/api';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🟣' },
  { value: 'openai', label: 'OpenAI (GPT)', icon: '🟢' },
  { value: 'gemini', label: 'Google (Gemini)', icon: '🔵' },
];

const MODELS = {
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-4-sonnet-20250514', label: 'Claude 4 Sonnet' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
  ],
  openai: [
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  gemini: [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ai_provider: 'anthropic',
    ai_model: 'claude-sonnet-4-5-20250929',
    api_key: '',
    use_emergent_key: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getSettings();
      setSettings({
        ai_provider: response.data.ai_provider || 'anthropic',
        ai_model: response.data.ai_model || 'claude-sonnet-4-5-20250929',
        api_key: response.data.api_key || '',
        use_emergent_key: response.data.use_emergent_key ?? true,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider) => {
    const defaultModel = MODELS[provider]?.[0]?.value || '';
    setSettings(prev => ({
      ...prev,
      ai_provider: provider,
      ai_model: defaultModel,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
          Settings
        </h1>
        <p className="text-neutral-400 mt-2">Configure your AI model and preferences</p>
      </div>

      {/* AI Configuration Card */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wide text-white">
              AI Configuration
            </h2>
            <p className="text-xs text-neutral-500">Choose your AI model for content generation</p>
          </div>
        </div>

        {/* Emergent Key Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-electric-blue/10 border border-electric-blue/30">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-electric-blue" />
            <div>
              <Label className="text-white font-medium">Use Emergent Universal Key</Label>
              <p className="text-xs text-neutral-400 mt-1">
                No API key needed. Credits deducted from your Emergent balance.
              </p>
            </div>
          </div>
          <Switch
            checked={settings.use_emergent_key}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, use_emergent_key: checked }))}
            data-testid="use-emergent-key-toggle"
          />
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-neutral-400 text-xs uppercase tracking-wider">AI Provider</Label>
          <Select
            value={settings.ai_provider}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger data-testid="ai-provider-select" className="bg-black/30 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-white/10">
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  <span className="flex items-center gap-2">
                    <span>{provider.icon}</span>
                    <span>{provider.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label className="text-neutral-400 text-xs uppercase tracking-wider">Model</Label>
          <Select
            value={settings.ai_model}
            onValueChange={(model) => setSettings(prev => ({ ...prev, ai_model: model }))}
          >
            <SelectTrigger data-testid="ai-model-select" className="bg-black/30 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-white/10">
              {MODELS[settings.ai_provider]?.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom API Key */}
        {!settings.use_emergent_key && (
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs uppercase tracking-wider">
              {settings.ai_provider === 'anthropic' ? 'Anthropic' : 
               settings.ai_provider === 'openai' ? 'OpenAI' : 'Google'} API Key
            </Label>
            <Input
              type="password"
              value={settings.api_key}
              onChange={(e) => setSettings(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="Enter your API key..."
              data-testid="api-key-input"
              className="bg-black/30 border-white/10 focus:border-electric-blue font-mono"
            />
            <p className="text-xs text-neutral-500">
              {settings.ai_provider === 'anthropic' && 'Get your key at console.anthropic.com'}
              {settings.ai_provider === 'openai' && 'Get your key at platform.openai.com'}
              {settings.ai_provider === 'gemini' && 'Get your key at ai.google.dev'}
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-settings-btn"
          className="btn-primary px-8"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Quick Reference */}
      <div className="card-surface p-6 mt-8">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">
          Quick Reference: 4-3-2-1 Strategy
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">4</span>
            <span className="text-neutral-300">Posts per week for optimal algorithm engagement</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">3</span>
            <span className="text-neutral-300">Content pillars: Growth, TAM, Sales</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">2</span>
            <span className="text-neutral-300">Frameworks: SLAY (narrative) + PAS (problem-solving)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">1</span>
            <span className="text-neutral-300">Clear CTA in every post</span>
          </div>
        </div>
      </div>
    </div>
  );
}
