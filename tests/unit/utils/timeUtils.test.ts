/**
 * Unit tests for timeUtils  
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatHoursToHHMM,
  sumHours,
  hoursToDays,
  daysToHours,
  roundHours,
  createTimeFormat
} from '../../../src/utils/timeUtils';

describe('timeUtils', () => {
  describe('formatHoursToHHMM', () => {
    it('should format decimal hours to HH:MM', () => {
      expect(formatHoursToHHMM(0)).toBe('0:00');
      expect(formatHoursToHHMM(1)).toBe('1:00');
      expect(formatHoursToHHMM(1.5)).toBe('1:30');
      expect(formatHoursToHHMM(2.25)).toBe('2:15');
      expect(formatHoursToHHMM(8.75)).toBe('8:45');
      expect(formatHoursToHHMM(10.1)).toBe('10:06');
    });

    it('should handle edge cases', () => {
      expect(formatHoursToHHMM(0.9833333333333333)).toBe('0:59'); // 59 minutes
      expect(formatHoursToHHMM(0.9999999)).toBe('1:00'); // Rounds to 1 hour
      expect(formatHoursToHHMM(23.5)).toBe('23:30');
    });

    it('should handle rounding edge case where minutes = 60', () => {
      // This tests the edge case where rounding results in 60 minutes
      expect(formatHoursToHHMM(1.9999)).toBe('2:00');
    });

    it('should throw error for negative hours', () => {
      expect(() => formatHoursToHHMM(-1)).toThrow('Hours cannot be negative');
    });
  });

  describe('sumHours', () => {
    it('should sum array of hours', () => {
      expect(sumHours([])).toBe(0);
      expect(sumHours([1])).toBe(1);
      expect(sumHours([1, 2, 3])).toBe(6);
      expect(sumHours([1.5, 2.25, 0.75])).toBe(4.5);
    });

    it('should handle decimal precision', () => {
      expect(sumHours([0.1, 0.2])).toBeCloseTo(0.3);
      expect(sumHours([1.1, 2.2, 3.3])).toBeCloseTo(6.6);
    });
  });

  describe('hoursToDays', () => {
    it('should convert hours to days (8h = 1 day)', () => {
      expect(hoursToDays(0)).toBe(0);
      expect(hoursToDays(8)).toBe(1);
      expect(hoursToDays(4)).toBe(0.5);
      expect(hoursToDays(16)).toBe(2);
      expect(hoursToDays(6)).toBe(0.75);
    });
  });

  describe('daysToHours', () => {
    it('should convert days to hours (1 day = 8h)', () => {
      expect(daysToHours(0)).toBe(0);
      expect(daysToHours(1)).toBe(8);
      expect(daysToHours(0.5)).toBe(4);
      expect(daysToHours(2)).toBe(16);
      expect(daysToHours(0.25)).toBe(2);
    });
  });

  describe('roundHours', () => {
    it('should round hours to 2 decimal places', () => {
      expect(roundHours(1.234567)).toBe(1.23);
      expect(roundHours(1.235)).toBe(1.24); // Rounds up
      expect(roundHours(1.999)).toBe(2);
      expect(roundHours(1)).toBe(1);
      expect(roundHours(1.1)).toBe(1.1);
    });
  });

  describe('createTimeFormat', () => {
    it('should create time format object with hours and formatted string', () => {
      const result1 = createTimeFormat(2.5);
      expect(result1.hours).toBe(2.5);
      expect(result1.hoursFormatted).toBe('2:30');

      const result2 = createTimeFormat(8.75);
      expect(result2.hours).toBe(8.75);
      expect(result2.hoursFormatted).toBe('8:45');

      const result3 = createTimeFormat(1.234567);
      expect(result3.hours).toBe(1.23); // Rounded
      expect(result3.hoursFormatted).toBe('1:14'); // Formatted
    });

    it('should handle edge cases', () => {
      const result = createTimeFormat(0);
      expect(result.hours).toBe(0);
      expect(result.hoursFormatted).toBe('0:00');
    });
  });
});