import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Save, Key, Cpu, Check, Linkedin, Link2, Unlink } from 'lucide-react';
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
import { getSettings, updateSettings, getLinkedInAuthUrl, disconnectLinkedIn } from '@/lib/api';
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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
  const [settings, setSettings] = useState({
    ai_provider: 'anthropic',
    ai_model: 'claude-sonnet-4-5-20250929',
    api_key: '',
    use_emergent_key: true,
    linkedin_connected: false,
    linkedin_name: '',
  });

  useEffect(() => {
    fetchSettings();
    
    // Check for LinkedIn callback
    if (searchParams.get('linkedin') === 'connected') {
      toast.success('LinkedIn connected successfully!');
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getSettings();
      setSettings({
        ai_provider: response.data.ai_provider || 'anthropic',
        ai_model: response.data.ai_model || 'claude-sonnet-4-5-20250929',
        api_key: response.data.api_key || '',
        use_emergent_key: response.data.use_emergent_key ?? true,
        linkedin_connected: response.data.linkedin_connected || false,
        linkedin_name: response.data.linkedin_name || '',
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
      await updateSettings({
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model,
        api_key: settings.api_key,
        use_emergent_key: settings.use_emergent_key,
      });
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

  const handleConnectLinkedIn = async () => {
    setConnectingLinkedIn(true);
    try {
      const response = await getLinkedInAuthUrl();
      window.location.href = response.data.auth_url;
    } catch (error) {
      if (error.response?.data?.detail?.includes('not configured')) {
        toast.error('LinkedIn API not configured. Please add your LinkedIn API credentials to the backend .env file.');
      } else {
        toast.error('Failed to connect LinkedIn');
      }
      setConnectingLinkedIn(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    try {
      await disconnectLinkedIn();
      setSettings(prev => ({
        ...prev,
        linkedin_connected: false,
        linkedin_name: '',
      }));
      toast.success('LinkedIn disconnected');
    } catch (error) {
      toast.error('Failed to disconnect LinkedIn');
    }
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
        <p className="text-neutral-400 mt-2">Configure your AI model and integrations</p>
      </div>

      {/* LinkedIn Integration Card */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-[#0077B5]/20 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-[#0077B5]" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wide text-white">
              LinkedIn Integration
            </h2>
            <p className="text-xs text-neutral-500">Connect for 1-click publishing to LinkedIn</p>
          </div>
        </div>

        {settings.linkedin_connected ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-white font-medium">Connected as {settings.linkedin_name}</p>
                <p className="text-xs text-neutral-400">You can publish directly to LinkedIn</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-charcoal border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Disconnect LinkedIn?</AlertDialogTitle>
                  <AlertDialogDescription className="text-neutral-400">
                    You will no longer be able to publish directly to LinkedIn. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnectLinkedIn}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">
              Connect your LinkedIn account to publish posts directly from the editor with one click.
            </p>
            <Button
              onClick={handleConnectLinkedIn}
              disabled={connectingLinkedIn}
              data-testid="connect-linkedin-btn"
              className="w-full bg-[#0077B5] hover:bg-[#006097] text-white"
            >
              {connectingLinkedIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Connect LinkedIn Account
            </Button>
            <p className="text-xs text-neutral-500 text-center">
              Requires LinkedIn API credentials configured in backend
            </p>
          </div>
        )}
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
