import { cn } from '@/lib/utils';

const currencies = [
  { code: 'aud', symbol: '$', name: 'AUD', flag: '🇦🇺' },
  { code: 'usd', symbol: '$', name: 'USD', flag: '🇺🇸' },
  { code: 'eur', symbol: '€', name: 'EUR', flag: '🇪🇺' },
  { code: 'gbp', symbol: '£', name: 'GBP', flag: '🇬🇧' },
];

export function CurrencySelector({ value, onChange, className }) {
  return (
    <div className={cn("flex items-center gap-1 bg-muted rounded-lg p-1", className)}>
      {currencies.map((currency) => (
        <button
          key={currency.code}
          onClick={() => onChange(currency.code)}
          data-testid={`currency-${currency.code}`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            value === currency.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <span>{currency.flag}</span>
          <span>{currency.name}</span>
        </button>
      ))}
    </div>
  );
}

export default CurrencySelector;
