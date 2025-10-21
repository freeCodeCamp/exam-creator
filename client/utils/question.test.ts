import { compare } from "./question";

// 1: Test compare function does comparisons for all sets
//    A | B, A | C, A | D, B | C, B | D, C | D
const a1 = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
];
let a2 = 0;
const _a = compare(a1, (a, b) => {
  a2++;
  return new Set([...a, ...b]);
});

if (a2 !== 6) {
  throw new Error(`Expected 6 comparisons, got ${a2}`);
}

// 2: Test compare function with algorithm
const totally_unique = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const results_unique = compare(totally_unique, (a, b) => {
  const s = new Set([...a, ...b]);
  return (s.size - a.length) / a.length;
});

if (results_unique.length !== 3) {
  throw new Error(
    `Expected 3 comparison results, got ${results_unique.length}`
  );
}

for (const r of results_unique) {
  if (r !== 1) {
    throw new Error(
      `Expected variability of 1 for totally unique sets, got ${r}`
    );
  }
}

const identical = [
  [1, 2, 3],
  [1, 2, 3],
  [1, 2, 3],
];
const results_identical = compare(identical, (a, b) => {
  const s = new Set([...a, ...b]);
  return (s.size - a.length) / a.length;
});

if (results_identical.length !== 3) {
  throw new Error(
    `Expected 3 comparison results, got ${results_identical.length}`
  );
}

for (const r of results_identical) {
  if (r !== 0) {
    throw new Error(`Expected variability of 0 for identical sets, got ${r}`);
  }
}

const partial_overlap = [
  [1, 2, 3],
  [3, 4, 5],
  [5, 6, 1],
];
const results_partial = compare(partial_overlap, (a, b) => {
  const s = new Set([...a, ...b]);
  return (s.size - a.length) / a.length;
});

if (results_partial.length !== 3) {
  throw new Error(
    `Expected 3 comparison results, got ${results_partial.length}`
  );
}

const expected_partial = 2 / 3;
for (let i = 0; i < results_partial.length; i++) {
  if (Math.abs(results_partial[i] - expected_partial) > 1e-6) {
    throw new Error(
      `Expected variability of ${expected_partial} for partial overlap sets, got ${results_partial[i]}`
    );
  }
}
