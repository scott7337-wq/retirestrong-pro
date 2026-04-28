import { Card } from "./ui/card";
import { TrendingUp } from "lucide-react";

interface TaxBracketThermometerProps {
  currentMAGI: number;
  projectedYearEndMAGI: number;
  bracketHeadroom: number;
}

const brackets = [
  { name: '10%', min: 0, max: 22000, rate: 0.10, color: '#3D6337' },
  { name: '12%', min: 22000, max: 89075, rate: 0.12, color: '#0A4D54' },
  { name: '22%', min: 89075, max: 190750, rate: 0.22, color: '#8A5515' },
  { name: '24%', min: 190750, max: 364200, rate: 0.24, color: '#8B3528' },
];

export function TaxBracketThermometer({ currentMAGI, projectedYearEndMAGI, bracketHeadroom }: TaxBracketThermometerProps) {
  // Find current bracket
  const currentBracket = brackets.find(b => currentMAGI >= b.min && currentMAGI < b.max) || brackets[0];
  const currentBracketIndex = brackets.indexOf(currentBracket);

  // Calculate position within current bracket
  const bracketRange = currentBracket.max - currentBracket.min;
  const positionInBracket = currentMAGI - currentBracket.min;
  const percentInBracket = (positionInBracket / bracketRange) * 100;

  // Calculate projected position
  const projectedBracket = brackets.find(b => projectedYearEndMAGI >= b.min && projectedYearEndMAGI < b.max) || brackets[0];
  const projectedBracketIndex = brackets.indexOf(projectedBracket);
  const projectedPositionInBracket = projectedYearEndMAGI - projectedBracket.min;
  const projectedPercentInBracket = (projectedPositionInBracket / (projectedBracket.max - projectedBracket.min)) * 100;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          Tax Bracket Position
        </h3>
        <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
          Current MAGI: ${currentMAGI.toLocaleString()} • Projected: ${projectedYearEndMAGI.toLocaleString()}
        </p>
      </div>

      {/* Thermometer */}
      <div className="space-y-2 mb-6">
        {brackets.slice(0, 4).map((bracket, idx) => {
          const isCurrent = idx === currentBracketIndex;
          const isProjected = idx === projectedBracketIndex;
          const isPassed = idx < currentBracketIndex;

          return (
            <div key={bracket.name} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '16px', fontWeight: 700, color: bracket.color }}>
                    {bracket.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    ${bracket.min.toLocaleString()} - ${bracket.max.toLocaleString()}
                  </span>
                </div>
                {isCurrent && (
                  <div className="text-xs font-bold px-3 py-1 rounded" style={{
                    backgroundColor: bracket.color,
                    color: '#FFFFFF'
                  }}>
                    Current Bracket
                  </div>
                )}
              </div>

              <div className="relative h-10 rounded-lg border-2 overflow-visible" style={{
                borderColor: isCurrent ? bracket.color : '#D4D1C5',
                backgroundColor: isPassed ? `${bracket.color}15` : '#F5F4EF'
              }}>
                {/* Fill for passed brackets */}
                {isPassed && (
                  <div className="absolute inset-0" style={{ backgroundColor: `${bracket.color}30` }}></div>
                )}

                {/* Current position indicator */}
                {isCurrent && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 transition-all"
                      style={{
                        width: `${percentInBracket}%`,
                        backgroundColor: `${bracket.color}40`
                      }}
                    ></div>
                    <div
                      className="absolute inset-y-0 w-1 transition-all"
                      style={{
                        left: `${percentInBracket}%`,
                        backgroundColor: bracket.color,
                        boxShadow: `0 0 8px ${bracket.color}80`
                      }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold px-2 py-1 rounded" style={{
                        backgroundColor: bracket.color,
                        color: '#FFFFFF'
                      }}>
                        You are here
                      </div>
                    </div>
                  </>
                )}

                {/* Projected position indicator (if different from current) */}
                {isProjected && !isCurrent && (
                  <div
                    className="absolute inset-y-0 w-1 transition-all opacity-60"
                    style={{
                      left: `${projectedPercentInBracket}%`,
                      backgroundColor: bracket.color,
                      borderLeft: `2px dashed ${bracket.color}`
                    }}
                  >
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold" style={{
                      color: bracket.color
                    }}>
                      Year-end
                    </div>
                  </div>
                )}

                {/* Same bracket, different position */}
                {isProjected && isCurrent && projectedPercentInBracket !== percentInBracket && (
                  <div
                    className="absolute inset-y-0 w-1 transition-all opacity-50"
                    style={{
                      left: `${projectedPercentInBracket}%`,
                      backgroundColor: bracket.color,
                      borderLeft: `2px dashed ${bracket.color}`
                    }}
                  ></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Headroom indicator */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#3D63370A' }}>
          <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
            Available Headroom
          </div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#3D6337' }}>
            ${bracketHeadroom.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#3D6337' }}>
            <TrendingUp className="h-3 w-3" />
            <span>Before hitting {currentBracket.name === '12%' ? '22%' : '24%'} bracket</span>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A4D540A' }}>
          <div className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
            Optimal Conversion
          </div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#0A4D54' }}>
            ${bracketHeadroom.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Maximize {currentBracket.name} rate
          </div>
        </div>
      </div>
    </Card>
  );
}
