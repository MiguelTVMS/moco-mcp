/**
 * Unit tests for errorHandler
 */

import { describe, it, expect } from '@jest/globals';
import {
  handleMocoApiError,
  createValidationErrorMessage,
  createEmptyResultMessage
} from '../../../src/utils/errorHandler';

describe('errorHandler', () => {
  describe('handleMocoApiError', () => {
    it('should handle fetch network errors', () => {
      const fetchError = new TypeError('fetch failed');
      const result = handleMocoApiError(fetchError);
      expect(result).toBe('Network error accessing MoCo API. Please check your internet connection.');
    });

    it('should handle HTTP status errors', () => {
      const http400Error = new Error('HTTP 400: Bad Request');
      expect(handleMocoApiError(http400Error)).toBe('Invalid parameters. Please check your inputs.');

      const http401Error = new Error('HTTP 401: Unauthorized');
      expect(handleMocoApiError(http401Error)).toBe('API authentication failed. Please check MOCO_API_KEY.');

      const http403Error = new Error('HTTP 403: Forbidden');
      expect(handleMocoApiError(http403Error)).toBe('Access denied. Please check your API permissions.');

      const http404Error = new Error('HTTP 404: Not Found');
      expect(handleMocoApiError(http404Error)).toBe('Resource not found. Please check the provided IDs.');

      const http422Error = new Error('HTTP 422: Unprocessable Entity');
      expect(handleMocoApiError(http422Error)).toBe('Invalid data. Please check date formats and value ranges.');

      const http429Error = new Error('HTTP 429: Too Many Requests');
      expect(handleMocoApiError(http429Error)).toBe('API limit reached. Please try again in a few seconds.');

      const http500Error = new Error('HTTP 500: Internal Server Error');
      expect(handleMocoApiError(http500Error)).toBe('MoCo server error. Please try again later.');

      const http502Error = new Error('HTTP 502: Bad Gateway');
      expect(handleMocoApiError(http502Error)).toBe('MoCo server error. Please try again later.');

      const http999Error = new Error('HTTP 999: Unknown Status');
      expect(handleMocoApiError(http999Error)).toBe('HTTP error 999. Please contact support.');
    });

    it('should handle generic errors with messages', () => {
      const genericError = new Error('Some API error');
      expect(handleMocoApiError(genericError)).toBe('MoCo API error: Some API error');
    });

    it('should handle unknown errors', () => {
      const unknownError = { something: 'weird' };
      expect(handleMocoApiError(unknownError)).toBe('Unknown error accessing MoCo API.');
    });
  });

  describe('createValidationErrorMessage', () => {
    it('should create messages for different validation errors', () => {
      expect(createValidationErrorMessage({
        field: 'startDate',
        value: '2024-1-1',
        reason: 'invalid_date_format'
      })).toBe('Invalid date format for startDate: "2024-1-1". Expected: YYYY-MM-DD (e.g. 2024-01-15)');

      expect(createValidationErrorMessage({
        field: 'dateRange',
        value: '2024-02-01 to 2024-01-01',
        reason: 'invalid_date_range'
      })).toBe('Invalid date range: Start date must be before or equal to end date.');

      const currentYear = new Date().getFullYear();
      expect(createValidationErrorMessage({
        field: 'year',
        value: 1999,
        reason: 'invalid_year'
      })).toBe(`Invalid year: "1999". Years between 2000 and ${currentYear + 1} are allowed.`);

      expect(createValidationErrorMessage({
        field: 'apiKey',
        value: undefined,
        reason: 'missing_parameter'
      })).toBe('Required parameter missing: apiKey');

      expect(createValidationErrorMessage({
        field: 'projectId',
        value: -5,
        reason: 'invalid_project_id'
      })).toBe('Invalid project ID: "-5". Project ID must be a positive number.');

      expect(createValidationErrorMessage({
        field: 'query',
        value: '',
        reason: 'empty_search_query'
      })).toBe('Search query cannot be empty.');

      expect(createValidationErrorMessage({
        field: 'someField',
        value: 'someValue',
        reason: 'unknown_reason'
      })).toBe('Validation error for someField: unknown_reason');
    });
  });

  describe('createEmptyResultMessage', () => {
    it('should create messages for different empty result types', () => {
      expect(createEmptyResultMessage({
        type: 'activities',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      })).toBe('No activities found in the period 2024-01-01 to 2024-01-31.');

      expect(createEmptyResultMessage({
        type: 'projects'
      })).toBe('No projects found.');

      expect(createEmptyResultMessage({
        type: 'projects',
        query: 'nonexistent'
      })).toBe('No projects found for search term "nonexistent".');

      expect(createEmptyResultMessage({
        type: 'tasks',
        projectId: 123
      })).toBe('No tasks found for project 123.');

      expect(createEmptyResultMessage({
        type: 'holidays',
        year: 2024
      })).toBe('No holidays found for year 2024.');

      expect(createEmptyResultMessage({
        type: 'presences',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      })).toBe('No presences found in the period 2024-01-01 to 2024-01-31.');

      expect(createEmptyResultMessage({
        type: 'users',
        query: 'doe'
      })).toBe('No users found for search term "doe".');
    });

    it('should handle unknown types', () => {
      expect(createEmptyResultMessage({
        type: 'unknown' as any
      })).toBe('No results found.');
    });
  });
});