export function capeBased(cape, tenYr, tips) {
  return {
    stock: (1/cape) + 0.02,
    bond: tenYr/100,
    inflation: Math.max(0.015, tenYr/100 - tips/100)
  };
}
