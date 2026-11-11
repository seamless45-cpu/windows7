import assert from "node:assert/strict";
import { evaluateStandard, groupDigits, percentValue } from "../src/win7/calcEngine.ts";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

console.log("Windows 7 Calculator engine");
near(evaluateStandard(["2", "+", "3", "×"], "4"), 20);
near(evaluateStandard(["4", "×", "12", "+", "2", "×"], "14"), 700);
near(evaluateStandard(["10", "÷"], "4"), 2.5);
near(evaluateStandard(["2", "^"], "8"), 256);
assert.throws(() => evaluateStandard(["8", "÷"], "0"), /divide by zero/i);
assert.throws(() => evaluateStandard(["2", "+"], "not-a-number"), /invalid input/i);

// Additive percentages are relative to the running left operand; multiplicative
// percentages are ordinary hundredths (200 + 10% = 220, 200 × 10% = 20).
near(percentValue(["200", "+"], "10"), 20);
near(percentValue(["200", "-"], "10"), 20);
near(percentValue(["200", "×"], "10"), 0.1);
near(percentValue([], "15"), 0.15);

assert.equal(groupDigits("1234567"), "1,234,567");
assert.equal(groupDigits("-12345.625"), "-12,345.625");
assert.equal(groupDigits("0."), "0.");
assert.equal(groupDigits("1.20"), "1.20");
assert.equal(groupDigits("1.2e+21"), "1.2e+21");
assert.equal(groupDigits("Invalid input"), "Invalid input");
console.log("  ok    Standard mode evaluates left to right");
console.log("  ok    division, exponentiation and errors");
console.log("  ok    Windows percent semantics");
console.log("  ok    lossless digit grouping\nall checks passed");
