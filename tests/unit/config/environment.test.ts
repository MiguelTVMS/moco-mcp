/**
 * Unit tests for environment configuration
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getMocoConfig } from '../../../src/config/environment';

describe('environment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getMocoConfig', () => {
    it('should return valid config when environment variables are set', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'test-company';

      const config = getMocoConfig();

      expect(config).toEqual({
        apiKey: 'test-api-key',
        subdomain: 'test-company',
        baseUrl: 'https://test-company.mocoapp.com/api/v1'
      });
    });

    it('should throw error when MOCO_API_KEY is missing', () => {
      delete process.env.MOCO_API_KEY;
      process.env.MOCO_SUBDOMAIN = 'test-company';

      expect(() => getMocoConfig()).toThrow('MOCO_API_KEY environment variable is required');
    });

    it('should throw error when MOCO_SUBDOMAIN is missing', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      delete process.env.MOCO_SUBDOMAIN;

      expect(() => getMocoConfig()).toThrow('MOCO_SUBDOMAIN environment variable is required');
    });

    it('should throw error when both environment variables are missing', () => {
      delete process.env.MOCO_API_KEY;
      delete process.env.MOCO_SUBDOMAIN;

      expect(() => getMocoConfig()).toThrow('MOCO_API_KEY environment variable is required');
    });

    it('should throw error when subdomain contains invalid characters', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'test-company.mocoapp.com';

      expect(() => getMocoConfig()).toThrow(
        'MOCO_SUBDOMAIN should only contain the subdomain name (e.g., "yourcompany", not "yourcompany.mocoapp.com")'
      );
    });

    it('should throw error when subdomain contains http protocol', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'https://test-company';

      expect(() => getMocoConfig()).toThrow(
        'MOCO_SUBDOMAIN should only contain the subdomain name (e.g., "yourcompany", not "yourcompany.mocoapp.com")'
      );
    });

    it('should accept valid subdomain names', () => {
      process.env.MOCO_API_KEY = 'test-api-key';

      // Test various valid subdomain formats
      const validSubdomains = [
        'company',
        'test-company',
        'company123',
        'my_company',
        'company-name-with-dashes'
      ];

      validSubdomains.forEach(subdomain => {
        process.env.MOCO_SUBDOMAIN = subdomain;
        const config = getMocoConfig();
        expect(config.subdomain).toBe(subdomain);
        expect(config.baseUrl).toBe(`https://${subdomain}.mocoapp.com/api/v1`);
      });
    });

    it('should handle empty string environment variables', () => {
      process.env.MOCO_API_KEY = '';
      process.env.MOCO_SUBDOMAIN = 'test-company';

      expect(() => getMocoConfig()).toThrow('MOCO_API_KEY environment variable is required');

      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = '';

      expect(() => getMocoConfig()).toThrow('MOCO_SUBDOMAIN environment variable is required');
    });
  });
});