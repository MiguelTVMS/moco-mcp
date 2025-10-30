/**
 * Unit tests for dateUtils
 */

import { describe, it, expect } from '@jest/globals';
import {
  isValidDateFormat,
  validateDateRange,
  validateYear,
  formatDateISO,
  getYearStart,
  getYearEnd
} from '../../../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('isValidDateFormat', () => {
    it('should accept valid ISO 8601 date formats', () => {
      expect(isValidDateFormat('2024-01-01')).toBe(true);
      expect(isValidDateFormat('2024-12-31')).toBe(true);
      expect(isValidDateFormat('2023-02-28')).toBe(true);
      expect(isValidDateFormat('2024-02-29')).toBe(true); // Leap year
    });

    it('should reject invalid date formats', () => {
      expect(isValidDateFormat('24-01-01')).toBe(false);
      expect(isValidDateFormat('2024-1-1')).toBe(false);
      expect(isValidDateFormat('2024/01/01')).toBe(false);
      expect(isValidDateFormat('01-01-2024')).toBe(false);
      expect(isValidDateFormat('2024-13-01')).toBe(false);
      expect(isValidDateFormat('2024-02-30')).toBe(false);
      expect(isValidDateFormat('2023-02-29')).toBe(false); // Not a leap year
      expect(isValidDateFormat('')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date ranges', () => {
      expect(validateDateRange('2024-01-01', '2024-01-31')).toBe(true);
      expect(validateDateRange('2024-01-01', '2024-12-31')).toBe(true);
      expect(validateDateRange('2024-01-01', '2024-01-01')).toBe(true); // Same date
    });

    it('should reject invalid date ranges', () => {
      expect(validateDateRange('2024-01-31', '2024-01-01')).toBe(false); // End before start
      expect(validateDateRange('2024-12-31', '2024-01-01')).toBe(false);
    });

    it('should reject invalid date formats in range', () => {
      expect(validateDateRange('invalid', '2024-01-31')).toBe(false);
      expect(validateDateRange('2024-01-01', 'invalid')).toBe(false);
      expect(validateDateRange('2024-13-01', '2024-01-31')).toBe(false);
    });
  });

  describe('validateYear', () => {
    const currentYear = new Date().getFullYear();

    it('should accept valid years', () => {
      expect(validateYear(2000)).toBe(true);
      expect(validateYear(2024)).toBe(true);
      expect(validateYear(currentYear)).toBe(true);
      expect(validateYear(currentYear + 1)).toBe(true); // Next year for planning
    });

    it('should reject invalid years', () => {
      expect(validateYear(1999)).toBe(false); // Too old
      expect(validateYear(currentYear + 2)).toBe(false); // Too far in future
      expect(validateYear(0)).toBe(false);
      expect(validateYear(-2024)).toBe(false);
    });
  });

  describe('formatDateISO', () => {
    it('should format dates to ISO 8601 format', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      expect(formatDateISO(date1)).toBe('2024-01-01');

      const date2 = new Date('2024-12-31T23:59:59.999Z');
      expect(formatDateISO(date2)).toBe('2024-12-31');
    });

    it('should handle different timezones consistently', () => {
      const date = new Date('2024-06-15T10:30:00.000Z');
      expect(formatDateISO(date)).toBe('2024-06-15');
    });
  });

  describe('getYearStart', () => {
    it('should return January 1st for given year', () => {
      expect(getYearStart(2024)).toBe('2024-01-01');
      expect(getYearStart(2000)).toBe('2000-01-01');
    });
  });

  describe('getYearEnd', () => {
    it('should return December 31st for given year', () => {
      expect(getYearEnd(2024)).toBe('2024-12-31');
      expect(getYearEnd(2000)).toBe('2000-12-31');
    });
  });
});