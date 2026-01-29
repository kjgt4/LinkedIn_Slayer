import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, X, Sparkles, Zap, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencySelector, PricingCard } from '@/components/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

const featureComparison = [
  { name: 'Posts per month', free: '5', basic: '30', premium: 'Unlimited' },
  { name: 'AI content generation', free: '3/mo', basic: '20/mo', premium: 'Unlimited' },
  { name: 'AI hook improvements', free: '3/mo', basic: '15/mo', premium: 'Unlimited' },
  { name: 'SLAY & PAS frameworks', free: true, basic: true, premium: true },
  { name: 'Mobile preview', free: true, basic: true, premium: true },
  { name: 'Knowledge Vault items', free: '10', basic: '50', premium: 'Unlimited' },
  { name: 'Voice profiles', free: '1', basic: '3', premium: 'Unlimited' },
  { name: 'LinkedIn integration', free: false, basic: true, premium: true },
  { name: 'Direct publish to LinkedIn', free: false, basic: true, premium: true },
  { name: 'Engagement timer', free: false, basic: true, premium: true },
  { name: 'Tracked influencers', free: '3', basic: '15', premium: 'Unlimited' },
  { name: 'AI comment drafting', free: false, basic: '10/mo', premium: 'Unlimited' },
  { name: 'Comment variations', free: false, basic: false, premium: true },
  { name: 'Analytics by pillar/framework', free: false, basic: true, premium: true },
  { name: 'AI strategy recommendations', free: false, basic: false, premium: true },
  { name: 'Export reports', free: false, basic: false, premium: true },
  { name: 'Priority support', free: false, basic: false, premium: true },
];

export default function Pricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tier: currentTier, refresh } = useSubscription();
  
  const [currency, setCurrency] = useState('aud');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await subscriptionAPI.getPricing(currency);
      setPricing(res.data);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchPricing();

    // Check for cancelled checkout
    if (searchParams.get('cancelled') === 'true') {
      toast.info('Checkout cancelled');
    }
  }, [fetchPricing, searchParams]);

  const handleSelectPlan = async (tier) => {
    setCheckoutLoading(tier);
    try {
      const res = await subscriptionAPI.createCheckout({
        tier,
        billing_cycle: billingCycle,
        currency,
      });
      
      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
      setCheckoutLoading(null);
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
    <div className="min-h-screen bg-charcoal py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Build your LinkedIn authority with AI-powered content creation. 
            Start free, upgrade when you&apos;re ready.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <CurrencySelector value={currency} onChange={setCurrency} />
          
          <div className="flex items-center gap-1 bg-neutral-900/50 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              data-testid="billing-monthly"
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                billingCycle === 'monthly'
                  ? "bg-electric-blue text-white"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              data-testid="billing-annual"
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                billingCycle === 'annual'
                  ? "bg-electric-blue text-white"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              Annual
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-4 mb-16 max-w-4xl mx-auto">
          {['free', 'basic', 'premium'].map((tier) => (
            <PricingCard
              key={tier}
              tier={tier}
              pricing={pricing?.tiers?.[tier]}
              billingCycle={billingCycle}
              currentTier={currentTier}
              onSelect={handleSelectPlan}
              isLoading={checkoutLoading === tier}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-white text-center mb-8">
            Feature Comparison
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="feature-comparison-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-neutral-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2 text-neutral-400">
                      <Zap className="w-4 h-4" />
                      Free
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2 text-electric-blue">
                      <Star className="w-4 h-4" />
                      Basic
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2 text-amber-400">
                      <Crown className="w-4 h-4" />
                      Premium
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((feature, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-3 px-4 text-neutral-300">{feature.name}</td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.free)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.basic)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.premium)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ / Refund Policy */}
        <div className="mt-16 text-center">
          <p className="text-neutral-500 text-sm">
            Refunds are reviewed on a case-by-case basis.{' '}
            <a href="mailto:support@example.com" className="text-electric-blue hover:underline">
              Contact support
            </a>{' '}
            with any questions.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderFeatureValue(value) {
  if (value === true) {
    return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
  }
  if (value === false) {
    return <X className="w-5 h-5 text-neutral-600 mx-auto" />;
  }
  return <span className="text-neutral-300">{value}</span>;
}
