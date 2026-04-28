import { Card } from "./ui/card";
import { ArrowDown, RefreshCw } from "lucide-react";

export function BucketFundingTimeline() {
  const buckets = [
    {
      name: 'Bucket 1',
      subname: 'Cash Reserve',
      years: '0-3 years',
      amount: '$185K',
      status: 'warning',
      coverage: '2.1 yrs',
      color: '#3D6337',
      position: 0
    },
    {
      name: 'Bucket 2',
      subname: 'Bond Ladder',
      years: '3-10 years',
      amount: '$820K',
      status: 'warning',
      coverage: '8.3 yrs',
      color: '#0A4D54',
      position: 33
    },
    {
      name: 'Bucket 3',
      subname: 'Growth Portfolio',
      years: '10+ years',
      amount: '$1.85M',
      status: 'success',
      coverage: '15+ yrs',
      color: '#8A5515',
      position: 66
    }
  ];

  return (
    <Card className="p-6 mb-8">
      <div className="mb-6">
        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          Bucket Funding Horizon
        </h3>
        <p className="text-muted-foreground" style={{ fontSize: '15px', fontWeight: 500 }}>
          Strategic time-based allocation protects from market downturns
        </p>
      </div>

      {/* Timeline visual */}
      <div className="relative mb-8">
        {/* Timeline bar */}
        <div className="absolute top-8 left-0 right-0 h-2 bg-secondary rounded-full">
          <div className="absolute inset-0 rounded-full" style={{
            background: 'linear-gradient(to right, #3D6337 0%, #3D6337 33%, #0A4D54 33%, #0A4D54 66%, #8A5515 66%, #8A5515 100%)'
          }}></div>
        </div>

        {/* Year markers */}
        <div className="relative flex justify-between pt-16 text-sm text-muted-foreground font-medium">
          <div>Today</div>
          <div>Year 3</div>
          <div>Year 10</div>
          <div>Year 15+</div>
        </div>

        {/* Bucket cards */}
        <div className="relative grid grid-cols-3 gap-4 mb-4">
          {buckets.map((bucket) => (
            <div
              key={bucket.name}
              className="p-4 rounded-lg border-2"
              style={{
                backgroundColor: `${bucket.color}0A`,
                borderColor: bucket.color
              }}
            >
              <div className="mb-3">
                <div style={{ fontSize: '16px', fontWeight: 700, color: bucket.color }}>
                  {bucket.name}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {bucket.subname}
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: bucket.color, marginBottom: '4px' }}>
                {bucket.amount}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Covers {bucket.coverage}
              </div>
              <div
                className="px-2 py-1 rounded text-xs font-bold inline-block"
                style={{
                  backgroundColor: bucket.status === 'success' ? '#3D6337' : '#8A5515',
                  color: '#FFFFFF'
                }}
              >
                {bucket.status === 'success' ? 'On Target' : 'Low'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refill flow logic */}
      <div className="p-5 rounded-lg" style={{ backgroundColor: '#0A4D540A', border: '2px solid #0A4D54' }}>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-5 w-5" style={{ color: '#0A4D54' }} />
          <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#0A4D54' }}>
            Annual Refill Logic
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-bold mb-2" style={{ color: '#3D6337' }}>
              ✓ Good Markets (up years)
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" style={{ color: '#8A5515' }} />
                <span>Sell Bucket 3 gains → Bucket 1</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" style={{ color: '#0A4D54' }} />
                <span>Roll maturing bonds → Bucket 1</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Harvest gains while preserving tax efficiency
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold mb-2" style={{ color: '#8B3528' }}>
              ⚠ Down Markets (bear years)
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" style={{ color: '#0A4D54' }} />
                <span>Use Bucket 2 only → Bucket 1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">× Don't touch Bucket 3</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Never sell equity in downturn—let it recover
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}