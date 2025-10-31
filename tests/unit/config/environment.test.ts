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
        baseUrl: 'https://test-company.mocoapp.com/api/v1',
        cacheTtlSeconds: 300
      });
    });

    it('should use custom cache ttl when MOCO_API_CACHE_TIME is provided', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'test-company';
      process.env.MOCO_API_CACHE_TIME = '120';

      const config = getMocoConfig();

      expect(config.cacheTtlSeconds).toBe(120);
    });

    it('should allow disabling cache by setting ttl to zero', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'test-company';
      process.env.MOCO_API_CACHE_TIME = '0';

      const config = getMocoConfig();

      expect(config.cacheTtlSeconds).toBe(0);
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

    it('should throw when cache ttl is invalid', () => {
      process.env.MOCO_API_KEY = 'test-api-key';
      process.env.MOCO_SUBDOMAIN = 'test-company';
      process.env.MOCO_API_CACHE_TIME = '-5';

      expect(() => getMocoConfig()).toThrow('MOCO_API_CACHE_TIME must be a non-negative integer representing seconds.');

      process.env.MOCO_API_CACHE_TIME = 'abc';

      expect(() => getMocoConfig()).toThrow('MOCO_API_CACHE_TIME must be a non-negative integer representing seconds.');
    });
  });
});