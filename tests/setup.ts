/**
 * Jest test setup
 * Global test configuration and mocks
 */

// Mock environment variables for testing
process.env.MOCO_API_KEY = 'test-api-key';
process.env.MOCO_SUBDOMAIN = 'test-company';

// Mock fetch globally for API tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});