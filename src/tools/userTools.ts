/**
 * MCP tools for user directory management
 * Provides search capabilities across the MoCo staff directory
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';
import type { User } from '../types/mocoTypes.js';

const SearchUsersSchema = z.object({
    query: z
        .string()
        .describe('Search query to match against name, email, unit, role, tags, or phone numbers'),
    includeArchived: z
        .boolean()
        .optional()
        .describe('Include deactivated users in the search results (default: false)'),
    tags: z
        .array(z.string().min(1).describe('User tag to match'))
        .nonempty({ message: 'At least one tag is required when filtering by tags.' })
        .optional()
        .describe('Filter users by one or more tags (comma-separated). Matches any of the provided tags')
});

/**
 * Tool: search_users
 * Performs a flexible search across the MoCo user directory
 */
export const searchUsersTool = {
    name: 'search_users',
    description: 'Search the staff directory by name, email, unit, role, tags, or phone numbers.',
    inputSchema: zodToJsonSchema(SearchUsersSchema),
    handler: async (params: z.infer<typeof SearchUsersSchema>): Promise<string> => {
        const { query, includeArchived = false, tags } = params;

        if (!query || !query.trim()) {
            return createValidationErrorMessage({
                field: 'query',
                value: query,
                reason: 'empty_search_query'
            });
        }

        try {
            const apiService = new MocoApiService();
            const users = await apiService.searchUsers(query.trim(), {
                includeArchived,
                tags
            });

            if (users.length === 0) {
                return createEmptyResultMessage({
                    type: 'users',
                    query: query.trim()
                });
            }

            return formatUserSearchResults(users, query.trim(), includeArchived, tags);
        } catch (error) {
            return `Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
};

function formatUserSearchResults(
    users: User[],
    query: string,
    includeArchived: boolean,
    tags?: string[]
): string {
    const lines: string[] = [];

    lines.push(`Search results for "${query}" (${users.length} found)${includeArchived ? ' (including archived users)' : ''}`);

    if (tags && tags.length > 0) {
        lines.push(`Filtered by tags: ${tags.join(', ')}`);
    }

    lines.push('');

    users.forEach(user => {
        const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || '(no name provided)';

        lines.push(`ID: ${user.id}`);
        lines.push(`Name: ${highlightSearchTerm(fullName, query)}`);
        lines.push(`Status: ${user.active ? 'Active' : 'Archived'}`);

        if (user.email) {
            lines.push(`Email: ${highlightSearchTerm(user.email, query)}`);
        }

        if (user.role?.name) {
            lines.push(`Role: ${highlightSearchTerm(user.role.name, query)}`);
        }

        if (user.unit?.name) {
            lines.push(`Unit: ${highlightSearchTerm(user.unit.name, query)}`);
        }

        if (user.tags && user.tags.length > 0) {
            const formattedTags = user.tags.map(tag => highlightSearchTerm(tag, query)).join(', ');
            lines.push(`Tags: ${formattedTags}`);
        }

        if (user.mobile_phone) {
            lines.push(`Mobile: ${user.mobile_phone}`);
        }

        if (user.work_phone) {
            lines.push(`Work phone: ${user.work_phone}`);
        }

        if (user.info) {
            lines.push(`Info: ${highlightSearchTerm(user.info, query)}`);
        }

        lines.push('');
    });

    return lines.join('\n').trimEnd();
}

function highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm.trim()) {
        return text;
    }

    try {
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        return text.replace(regex, '**$1**');
    } catch {
        // Fallback in case the search term cannot be converted to regex
        return text;
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
