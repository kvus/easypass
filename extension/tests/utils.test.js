import { describe, it, expect } from 'vitest';
import { generatePassword, assessStrength } from '../modules/utils';

describe('generatePassword', () => {
  it('returns a string of the requested length', () => {
    expect(generatePassword({ length: 8 })).toHaveLength(8);
    expect(generatePassword({ length: 32 })).toHaveLength(32);
  });

  it('defaults to length 16', () => {
    expect(generatePassword()).toHaveLength(16);
  });

  it('contains only uppercase when useLower/useDigits/useSymbols are off', () => {
    const pw = generatePassword({ length: 20, useUpper: true, useLower: false, useDigits: false, useSymbols: false });
    expect(pw).toMatch(/^[A-Z]+$/);
  });

  it('contains only lowercase when others are off', () => {
    const pw = generatePassword({ length: 20, useUpper: false, useLower: true, useDigits: false, useSymbols: false });
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it('contains only digits when others are off', () => {
    const pw = generatePassword({ length: 20, useUpper: false, useLower: false, useDigits: true, useSymbols: false });
    expect(pw).toMatch(/^[0-9]+$/);
  });

  it('falls back to alphanumeric when all options are false', () => {
    const pw = generatePassword({ length: 20, useUpper: false, useLower: false, useDigits: false, useSymbols: false });
    expect(pw).toMatch(/^[a-z0-9]+$/);
  });

  it('produces different values on successive calls (random)', () => {
    const results = new Set(Array.from({ length: 10 }, () => generatePassword({ length: 20 })));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('assessStrength', () => {
  it('returns score 0 for an empty string', () => {
    expect(assessStrength('').score).toBe(0);
  });

  it('score increases with length (≥8 and ≥12)', () => {
    const short  = assessStrength('abc').score;
    const medium = assessStrength('abcdefgh').score; // length ≥ 8
    const long   = assessStrength('abcdefghijkl').score; // length ≥ 12
    expect(medium).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(medium);
  });

  it('scores higher with mixed case', () => {
    const lower  = assessStrength('abcdefgh').score;
    const mixed  = assessStrength('Abcdefgh').score;
    expect(mixed).toBeGreaterThan(lower);
  });

  it('scores higher with digits', () => {
    const noDigit = assessStrength('Abcdefgh').score;
    const digit   = assessStrength('Abcdefg1').score;
    expect(digit).toBeGreaterThan(noDigit);
  });

  it('scores higher with symbols', () => {
    const noSym = assessStrength('Abcdefg1').score;
    const sym   = assessStrength('Abcdef1!').score;
    expect(sym).toBeGreaterThan(noSym);
  });

  it('returns maximum score 4 for a strong password', () => {
    expect(assessStrength('Abcdefgh1!XY').score).toBe(4);
  });

  it('returns a label and color for every score level', () => {
    ['', 'abcdefgh', 'Abcdefgh', 'Abcdefg1', 'Abcdef1!XYZ'].forEach(pw => {
      const { score, label, color } = assessStrength(pw);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(label).toBeTruthy();
      expect(color).toMatch(/^#/);
    });
  });
});
