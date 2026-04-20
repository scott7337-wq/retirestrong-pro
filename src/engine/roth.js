// Returns scheduled Roth conversion amount for a given calendar year
export function rothConvForYear(inp, calYear) {
  var schedule = {2027:inp.conv2027, 2028:inp.conv2028, 2029:inp.conv2029, 2030:inp.conv2030, 2031:inp.conv2031};
  return schedule[calYear] || 0;
}
