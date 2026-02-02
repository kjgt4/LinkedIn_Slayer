import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Save, Cpu, Check, Linkedin, Link2, Unlink, Settings2, ExternalLink, CreditCard, Crown, Calendar, AlertCircle, Eye, EyeOff, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getSettings, updateSettings, getLinkedInAuthUrl, disconnectLinkedIn, subscriptionAPI } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { UsageDashboard, GracePeriodBanner } from '@/components/subscription';
import { cn, getErrorMessage } from '@/lib/utils';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🟣' },
  { value: 'openai', label: 'OpenAI (GPT)', icon: '🟢' },
  { value: 'gemini', label: 'Google (Gemini)', icon: '🔵' },
];

const MODELS = {
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
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
  const navigate = useNavigate();
  const { subscription, usage, tier, effectiveTier, isInGracePeriod, refresh: refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
  const [linkedInConfigOpen, setLinkedInConfigOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    ai_provider: 'anthropic',
    ai_model: 'claude-sonnet-4-5-20250929',
    api_key: '',
    use_emergent_key: false,
    linkedin_connected: false,
    linkedin_name: '',
    linkedin_client_id: '',
    linkedin_client_secret: '',
    linkedin_redirect_uri: '',
  });

  const pollCheckoutStatus = useCallback(async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.info('Payment processing. Check back shortly.');
      return;
    }

    try {
      const res = await subscriptionAPI.getCheckoutStatus(sessionId);
      if (res.data.payment_status === 'paid') {
        toast.success(`Welcome to ${res.data.tier}! Your subscription is now active.`);
        refreshSubscription();
        // Clear URL params
        navigate('/settings', { replace: true });
        return;
      }

      // Continue polling
      setTimeout(() => pollCheckoutStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  }, [refreshSubscription, navigate]);

  useEffect(() => {
    fetchSettings();

    // Check for LinkedIn callback
    if (searchParams.get('linkedin') === 'connected') {
      toast.success('LinkedIn connected successfully!');
    }

    // Check for subscription success
    if (searchParams.get('subscription') === 'success') {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        pollCheckoutStatus(sessionId);
      }
    }
  }, [searchParams, pollCheckoutStatus]);

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
        linkedin_client_id: response.data.linkedin_client_id || '',
        linkedin_client_secret: response.data.linkedin_client_secret || '',
        linkedin_redirect_uri: response.data.linkedin_redirect_uri || '',
      });
      // Auto-open config if credentials not set
      if (!response.data.linkedin_client_id && !response.data.linkedin_connected) {
        setLinkedInConfigOpen(true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = (key) => {
    if (!key || key.trim() === '') {
      return 'API key is required to use AI features';
    }
    // API keys are typically 40+ characters
    if (key.trim().length < 20) {
      return 'API key appears too short. Please check your key.';
    }
    return '';
  };

  const handleSave = async () => {
    // Validate API key
    const keyError = validateApiKey(settings.api_key);
    if (keyError) {
      setApiKeyError(keyError);
      toast.error(keyError);
      return;
    }
    setApiKeyError('');

    setSaving(true);
    try {
      await updateSettings({
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model,
        api_key: settings.api_key,
        use_emergent_key: settings.use_emergent_key,
        linkedin_client_id: settings.linkedin_client_id,
        linkedin_client_secret: settings.linkedin_client_secret,
        linkedin_redirect_uri: settings.linkedin_redirect_uri,
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save settings'));
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
    // Check if credentials are configured
    if (!settings.linkedin_client_id || !settings.linkedin_redirect_uri) {
      toast.error('Please configure LinkedIn API credentials first');
      setLinkedInConfigOpen(true);
      return;
    }

    // Save credentials first
    await handleSave();

    setConnectingLinkedIn(true);
    try {
      const response = await getLinkedInAuthUrl();
      window.location.href = response.data.auth_url;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to connect LinkedIn');
      if (message.includes('not configured')) {
        toast.error('Please configure LinkedIn API credentials first');
        setLinkedInConfigOpen(true);
      } else {
        toast.error(message);
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
      toast.error(getErrorMessage(error, 'Failed to disconnect LinkedIn'));
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      await subscriptionAPI.cancel();
      toast.success('Subscription will be cancelled at the end of the billing period');
      refreshSubscription();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to cancel subscription'));
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await subscriptionAPI.reactivate();
      toast.success('Subscription reactivated!');
      refreshSubscription();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reactivate subscription'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasLinkedInCredentials = settings.linkedin_client_id && settings.linkedin_client_secret && settings.linkedin_redirect_uri;

  const tierColors = {
    free: 'text-muted-foreground',
    basic: 'text-primary',
    premium: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">Configure your AI model and integrations</p>
      </div>

      {/* Grace Period Banner */}
      <GracePeriodBanner />

      {/* Subscription Card */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Subscription
            </h2>
            <p className="text-xs text-muted-foreground">Manage your plan and billing</p>
          </div>
        </div>

        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">Current Plan:</span>
                <span className={cn("font-semibold capitalize", tierColors[effectiveTier])}>
                  {effectiveTier}
                </span>
                {subscription?.status === 'active' && tier !== 'free' && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              {tier !== 'free' && subscription?.billing_cycle && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
                  {subscription?.current_period_end && (
                    <> • Renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
                  )}
                </p>
              )}
              {subscription?.cancel_at_period_end && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cancels at end of billing period
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {tier === 'free' ? (
              <Button onClick={() => navigate('/pricing')} data-testid="upgrade-btn">
                Upgrade
              </Button>
            ) : subscription?.cancel_at_period_end ? (
              <Button onClick={handleReactivateSubscription} data-testid="reactivate-btn">
                Reactivate
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:text-destructive" data-testid="cancel-sub-btn">
                    Cancel Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of the current billing period.
                      All your content will be preserved, but some features will be restricted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={cancellingSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancellingSubscription && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Payment Method (if paid) */}
        {tier !== 'free' && subscription?.payment_method_last4 && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-foreground font-medium">
                  {subscription.payment_method_brand?.charAt(0).toUpperCase() + subscription.payment_method_brand?.slice(1) || 'Card'} ending in {subscription.payment_method_last4}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Dashboard */}
        <UsageDashboard />

        {/* View All Plans */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/pricing')}
          data-testid="view-plans-btn"
        >
          View All Plans
        </Button>
      </div>

      {/* LinkedIn Integration Card */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-[#0077B5]/20 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-[#0077B5]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              LinkedIn Integration
            </h2>
            <p className="text-xs text-muted-foreground">Connect for 1-click publishing to LinkedIn</p>
          </div>
        </div>

        {settings.linkedin_connected ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              <div>
                <p className="text-foreground font-medium">Connected as {settings.linkedin_name}</p>
                <p className="text-xs text-muted-foreground">You can publish directly to LinkedIn</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect LinkedIn?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will no longer be able to publish directly to LinkedIn. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnectLinkedIn}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-4">
            {/* API Credentials Configuration */}
            <Collapsible open={linkedInConfigOpen} onOpenChange={setLinkedInConfigOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span>Configure API Credentials</span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    hasLinkedInCredentials ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {hasLinkedInCredentials ? 'Configured' : 'Required'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Get your LinkedIn API credentials from the Developer Portal
                    </p>
                    <a
                      href="https://www.linkedin.com/developers/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-1"
                    >
                      Open Portal <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Client ID</Label>
                    <Input
                      value={settings.linkedin_client_id}
                      onChange={(e) => setSettings(prev => ({ ...prev, linkedin_client_id: e.target.value }))}
                      placeholder="Your LinkedIn App Client ID"
                      data-testid="linkedin-client-id-input"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Client Secret</Label>
                    <Input
                      type="password"
                      value={settings.linkedin_client_secret}
                      onChange={(e) => setSettings(prev => ({ ...prev, linkedin_client_secret: e.target.value }))}
                      placeholder="Your LinkedIn App Client Secret"
                      data-testid="linkedin-client-secret-input"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Redirect URI</Label>
                    <Input
                      value={settings.linkedin_redirect_uri}
                      onChange={(e) => setSettings(prev => ({ ...prev, linkedin_redirect_uri: e.target.value }))}
                      placeholder="https://your-domain.com/api/linkedin/callback"
                      data-testid="linkedin-redirect-uri-input"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add this URL to your LinkedIn App&apos;s Authorized Redirect URLs
                    </p>
                  </div>

                  <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Credentials
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Connect Button */}
            <Button
              onClick={handleConnectLinkedIn}
              disabled={connectingLinkedIn || !hasLinkedInCredentials}
              data-testid="connect-linkedin-btn"
              className={cn(
                "w-full text-white",
                hasLinkedInCredentials
                  ? "bg-[#0077B5] hover:bg-[#006097]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {connectingLinkedIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {hasLinkedInCredentials ? 'Connect LinkedIn Account' : 'Configure Credentials First'}
            </Button>
          </div>
        )}
      </div>

      {/* AI Configuration Card */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              AI Configuration
            </h2>
            <p className="text-xs text-muted-foreground">Choose your AI model for content generation</p>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">AI Provider</Label>
          <Select
            value={settings.ai_provider}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger data-testid="ai-provider-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Model</Label>
          <Select
            value={settings.ai_model}
            onValueChange={(model) => setSettings(prev => ({ ...prev, ai_model: model }))}
          >
            <SelectTrigger data-testid="ai-model-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS[settings.ai_provider]?.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            {settings.ai_provider === 'anthropic' ? 'Anthropic' :
             settings.ai_provider === 'openai' ? 'OpenAI' : 'Google'} API Key *
          </Label>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={settings.api_key}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, api_key: e.target.value }));
                if (apiKeyError) setApiKeyError('');
              }}
              placeholder="Enter your API key..."
              data-testid="api-key-input"
              className={cn(
                "font-mono pr-20",
                apiKeyError && "border-destructive"
              )}
              aria-invalid={!!apiKeyError}
              aria-describedby={apiKeyError ? "api-key-error" : "api-key-help"}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {settings.api_key && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.api_key);
                    toast.success('API key copied to clipboard');
                  }}
                  aria-label="Copy API key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {apiKeyError && (
            <p id="api-key-error" className="text-xs text-destructive">{apiKeyError}</p>
          )}
          <p id="api-key-help" className="text-xs text-muted-foreground">
            {settings.ai_provider === 'anthropic' && 'Get your key at console.anthropic.com'}
            {settings.ai_provider === 'openai' && 'Get your key at platform.openai.com'}
            {settings.ai_provider === 'gemini' && 'Get your key at ai.google.dev'}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-settings-btn"
          className="px-8"
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
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Quick Reference: 4-3-2-1 Strategy
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">4</span>
            <span className="text-foreground/80">Posts per week for optimal algorithm engagement</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">3</span>
            <span className="text-foreground/80">Content pillars: Growth, TAM, Sales</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">2</span>
            <span className="text-foreground/80">Frameworks: SLAY (narrative) + PAS (problem-solving)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">1</span>
            <span className="text-foreground/80">Clear CTA in every post</span>
          </div>
        </div>
      </div>
    </div>
  );
}
