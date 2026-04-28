import { Card } from "./ui/card";
import { AlertTriangle, Target, TrendingUp } from "lucide-react";
import React from "react";

interface CriticalYear {
  year: number;
  age: number;
  label: string;
  reason: string;
  type: 'risk' | 'milestone' | 'opportunity';
}

const criticalYears: CriticalYear[] = [
  {
    year: 2026,
    age: 63,
    label: 'Peak Sequence Risk',
    reason: 'First 2 years: portfolio most vulnerable to downturn',
    type: 'risk'
  },
  {
    year: 2028,
    age: 65,
    label: 'SS & Medicare Start',
    reason: 'Income floor begins, healthcare costs drop 60%',
    type: 'milestone'
  },
  {
    year: 2037,
    age: 74,
    label: 'RMD Trigger Year',
    reason: 'Required distributions may push to 24% tax bracket',
    type: 'risk'
  }
];

export function CriticalYearsStrip() {
  const icons = {
    risk: <AlertTriangle className="h-5 w-5" />,
    milestone: <Target className="h-5 w-5" />,
    opportunity: <TrendingUp className="h-5 w-5" />
  };

  const colors = {
    risk: { bg: '#8B35280A', text: '#8B3528', border: '#8B3528' },
    milestone: { bg: '#0A4D540A', text: '#0A4D54', border: '#0A4D54' },
    opportunity: { bg: '#3D63370A', text: '#3D6337', border: '#3D6337' }
  };

  return (
    <Card className="p-5 mb-8 border-2" style={{ borderColor: '#8A5515' }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5" style={{ color: '#8A5515' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#8A5515' }}>
          Critical Years in Your Plan
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {criticalYears.map((year) => {
          const color = colors[year.type];
          const Icon = icons[year.type];

          return (
            <div
              key={year.year}
              className="p-4 rounded-lg border-2"
              style={{
                backgroundColor: color.bg,
                borderColor: color.border
              }}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color.text }}>
                  {React.cloneElement(Icon, { style: { color: '#FFFFFF' } })}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: '20px', fontWeight: 700, color: color.text, lineHeight: 1.1 }}>
                    {year.year}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Age {year.age}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                {year.label}
              </div>
              <div className="text-sm text-muted-foreground" style={{ lineHeight: 1.4 }}>
                {year.reason}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}