export function ssBenefitFactor(claimAge) {
  var fra = 67;
  if (claimAge <= 62) return 0.70;
  if (claimAge < fra) return 1 - 0.0667 * (fra - claimAge);
  if (claimAge > fra) return 1 + 0.08 * (claimAge - fra);
  return 1.0;
}

// SS income for a given calendar year
// Bug fixes: Scott born Nov 1959, SS start year = birth year + claim age
// Stacey born Aug 1962, uses actual net figures with toggle
export function ssIncomeForYear(inp, calYear) {
  var ssCola = (inp.ssCola || 2.5) / 100;
  var fraBase = inp.ssFRA || inp.ssMonthly || 3445;
  var yourMonthly = Math.round(fraBase * ssBenefitFactor(inp.ssAge));
  var yourStartYear = 1959 + inp.ssAge; // Scott born 1959
  var yourSS = 0;

  // Scott always gets partial first year (Nov birthday = 2 months: Nov+Dec)
  if (calYear === yourStartYear) {
    yourSS = yourMonthly * 2;
  } else if (calYear > yourStartYear) {
    var colaYrs = calYear - yourStartYear;
    yourSS = yourMonthly * Math.pow(1 + ssCola, colaYrs) * 12;
  }

  // Stacey SS — actual net figures, respects toggle
  var spouseSS = 0;
  if (inp.hasSpouse && !inp.survivorMode) {
    var staceyClaimAge = inp.staceySS63 ? 63 : (inp.spouseSSAge || 67);
    var staceyMonthly = inp.staceySS63 ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
    var staceyStartYear = 1962 + staceyClaimAge; // Stacey born 1962
    if (calYear === staceyStartYear) {
      spouseSS = staceyMonthly * 5; // Aug birthday = Aug-Dec
    } else if (calYear > staceyStartYear) {
      var spColaYrs = calYear - staceyStartYear;
      spouseSS = staceyMonthly * Math.pow(1 + ssCola, spColaYrs) * 12;
    }
  }

  if (inp.survivorMode && inp.hasSpouse) return yourSS;
  return yourSS + spouseSS;
}

// Scott's SS only (for cash flow table breakdown)
export function scottSSForYear(inp, calYear) {
  var ssCola = (inp.ssCola || 2.5) / 100;
  var fraBase = inp.ssFRA || inp.ssMonthly || 3445;
  var yourMonthly = Math.round(fraBase * ssBenefitFactor(inp.ssAge));
  var yourStartYear = 1959 + inp.ssAge;
  if (calYear === yourStartYear) return yourMonthly * 2;
  if (calYear > yourStartYear) return yourMonthly * Math.pow(1 + ssCola, calYear - yourStartYear) * 12;
  return 0;
}

// Stacey's SS only (for cash flow table breakdown)
export function staceySSForYear(inp, calYear) {
  if (!inp.hasSpouse || inp.survivorMode) return 0;
  var ssCola = (inp.ssCola || 2.5) / 100;
  var staceyClaimAge = inp.staceySS63 ? 63 : (inp.spouseSSAge || 67);
  var staceyMonthly = inp.staceySS63 ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var staceyStartYear = 1962 + staceyClaimAge;
  if (calYear === staceyStartYear) return staceyMonthly * 5;
  if (calYear > staceyStartYear) return staceyMonthly * Math.pow(1 + ssCola, calYear - staceyStartYear) * 12;
  return 0;
}
