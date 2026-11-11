/**
 * Arithmetic rules used by calc.exe's Standard and Scientific views.
 * Kept independent of React so the subtle Standard-mode behavior is testable.
 */

export type CalcOperator = "+" | "-" | "×" | "÷" | "^";

/** Standard view is an adding machine: every operation uses the running total. */
export function evaluateStandard(tokens: string[], entry: string): number {
  const parts = [...tokens];
  if (!parts.length || parts[parts.length - 1] === "(") return Number.parseFloat(entry);
  if (/[+\-×÷^]$/.test(parts[parts.length - 1])) parts.push(entry);
  if (parts.length < 3 || parts.length % 2 === 0) throw new Error("Invalid input");

  let total = Number.parseFloat(parts[0]);
  if (!Number.isFinite(total)) throw new Error("Invalid input");
  for (let i = 1; i < parts.length; i += 2) {
    const operator = parts[i];
    const operand = Number.parseFloat(parts[i + 1]);
    if (!Number.isFinite(operand)) throw new Error("Invalid input");
    if (operator === "+") total += operand;
    else if (operator === "-") total -= operand;
    else if (operator === "×") total *= operand;
    else if (operator === "÷") {
      if (operand === 0) throw new Error("Cannot divide by zero");
      total /= operand;
    } else if (operator === "^") total **= operand;
    else throw new Error("Invalid input");
    if (!Number.isFinite(total)) throw new Error("Overflow");
  }
  return total;
}

/** Windows' percent key: additive operations use a percentage of the left side. */
export function percentValue(tokens: string[], entry: string): number {
  const value = Number.parseFloat(entry);
  if (!Number.isFinite(value)) return Number.NaN;
  const operator = tokens[tokens.length - 1];
  const left = Number.parseFloat(tokens[tokens.length - 2]);
  if ((operator === "+" || operator === "-") && Number.isFinite(left)) return left * value / 100;
  return value / 100;
}

/** Group only the integer part; never round or alter an in-progress decimal. */
export function groupDigits(value: string): string {
  if (!value || value === "-" || /e|invalid|overflow|divide/i.test(value)) return value;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer, ...rest] = unsigned.split(".");
  if (!/^\d+$/.test(integer)) return value;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "-" : "") + grouped + (rest.length ? "." + rest.join(".") : "");
}
