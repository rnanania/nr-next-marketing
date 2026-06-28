// Static Server Component → "/pricing". Pre-rendered at build (SSG).

export const metadata = {
  title: "Pricing — Acme",
  description: "Simple, transparent pricing.",
};

const tiers = [
  { name: "Starter", price: "$0", blurb: "For side projects.", features: ["1 site", "Community support"] },
  { name: "Pro", price: "$29", blurb: "For growing teams.", features: ["10 sites", "Email support", "Analytics"] },
  { name: "Scale", price: "$99", blurb: "For high traffic.", features: ["Unlimited sites", "Priority support", "A/B testing"] },
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      <div className="grid gap-6 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.name} className="rounded-lg border border-black/10 p-6 dark:border-white/15">
            <h2 className="text-xl font-semibold">{tier.name}</h2>
            <p className="mt-2 text-3xl font-bold">{tier.price}<span className="text-base font-normal text-black/60 dark:text-white/60">/mo</span></p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">{tier.blurb}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {tier.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
