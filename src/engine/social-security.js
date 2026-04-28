// ── RetireStrong Engine: Social Security ──────────────────────────────────────
// Person-agnostic: primary = the user, spouse = optional partner. Birth years
// must come from the profile. Missing/invalid values short-circuit to 0 to
// prevent exponent overflow (a null birthYear would coerce to 0, making
// startYear tiny and Math.pow(1+cola, 2026 - 0) blow up).

function isValidBirthYear(y) {
  return typeof y === 'number' && y >= 1930 && y <= 1980;
}

export function ssBenefitFactor(claimAge) {
  var fra = 67;
  if (claimAge <= 62) return 0.70;
  if (claimAge < fra) return 1 - 0.0667 * (fra - claimAge);
  if (claimAge > fra) return 1 + 0.08 * (claimAge - fra);
  return 1.0;
}

export function ssIncomeForYear(inp, calYear) {
  if (!isValidBirthYear(inp.birthYear)) return 0;
  var ssCola = (inp.ssCola || 2.5) / 100;
  var fraBase = inp.ssFRA || inp.ssMonthly || 3445;
  var yourMonthly = Math.round(fraBase * ssBenefitFactor(inp.ssAge));
  var birthYear = inp.birthYear;
  var yourStartYear = birthYear + inp.ssAge;
  var yourSS = 0;
  if (calYear === yourStartYear) {
    yourSS = yourMonthly * 2;
  } else if (calYear > yourStartYear) {
    var colaYrs = calYear - yourStartYear;
    yourSS = yourMonthly * Math.pow(1 + ssCola, colaYrs) * 12;
  }
  var spouseSS = 0;
  if (inp.hasSpouse && !inp.survivorMode && isValidBirthYear(inp.spouseBirthYear)) {
    var spouseBirthYear = inp.spouseBirthYear;
    var spouseClaimAge = inp.spouseEarlyClaim ? 63 : (inp.spouseSSAge || 67);
    var spouseMonthly = inp.spouseEarlyClaim ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
    var spouseStartYear = spouseBirthYear + spouseClaimAge;
    if (calYear === spouseStartYear) {
      spouseSS = spouseMonthly * 5;
    } else if (calYear > spouseStartYear) {
      var spColaYrs = calYear - spouseStartYear;
      spouseSS = spouseMonthly * Math.pow(1 + ssCola, spColaYrs) * 12;
    }
  }
  if (inp.survivorMode && inp.hasSpouse) return yourSS;
  return yourSS + spouseSS;
}

export function primarySSForYear(inp, calYear) {
  if (!isValidBirthYear(inp.birthYear)) return 0;
  var ssCola = (inp.ssCola || 2.5) / 100;
  var fraBase = inp.ssFRA || inp.ssMonthly || 3445;
  var yourMonthly = Math.round(fraBase * ssBenefitFactor(inp.ssAge));
  var birthYear = inp.birthYear;
  var yourStartYear = birthYear + inp.ssAge;
  if (calYear === yourStartYear) return yourMonthly * 2;
  if (calYear > yourStartYear) return yourMonthly * Math.pow(1 + ssCola, calYear - yourStartYear) * 12;
  return 0;
}

export function spouseSSForYear(inp, calYear) {
  if (!inp.hasSpouse || inp.survivorMode) return 0;
  if (!isValidBirthYear(inp.spouseBirthYear)) return 0;
  var ssCola = (inp.ssCola || 2.5) / 100;
  var spouseBirthYear = inp.spouseBirthYear;
  var spouseClaimAge = inp.spouseEarlyClaim ? 63 : (inp.spouseSSAge || 67);
  var spouseMonthly = inp.spouseEarlyClaim ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var spouseStartYear = spouseBirthYear + spouseClaimAge;
  if (calYear === spouseStartYear) return spouseMonthly * 5;
  if (calYear > spouseStartYear) return spouseMonthly * Math.pow(1 + ssCola, calYear - spouseStartYear) * 12;
  return 0;
}
