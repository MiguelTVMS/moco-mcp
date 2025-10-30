/**
 * MCP tools for Projects management
 * Provides project listing, searching, and task retrieval functionality
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';
import type { Project, Task } from '../types/mocoTypes.js';

// Schema for get_projects tool with optional search query
const GetProjectsSchema = z.object({
  query: z.string().optional().describe('Optional search query to find projects by name or description (case-insensitive)')
});

// Schema for get_project_tasks tool
const GetProjectTasksSchema = z.object({
  projectId: z.number().positive().describe('Project ID to retrieve tasks for')
});

/**
 * Tool: get_user_projects
 * Retrieves all assigned projects or searches for assigned projects by name/description
 */
export const getUserProjectsTool = {
  name: 'get_user_projects',
  description: 'Get all projects assigned to the current user or search within assigned projects by name/description. If no query is provided, returns all assigned projects.',
  inputSchema: zodToJsonSchema(GetProjectsSchema),
  handler: async (params: z.infer<typeof GetProjectsSchema>): Promise<string> => {
    const { query } = params;

    try {
      const apiService = new MocoApiService();
      
      // If query is provided and not empty, search; otherwise list all
      if (query && query.trim()) {
        const projects = await apiService.searchProjects(query.trim());

        if (projects.length === 0) {
          return createEmptyResultMessage({ 
            type: 'projects',
            query: query.trim()
          });
        }

        return formatProjectsSearchResults(projects, query.trim());
      } else {
        const projects = await apiService.getProjects();

        if (projects.length === 0) {
          return createEmptyResultMessage({ type: 'projects' });
        }

        return formatProjectsList(projects);
      }

    } catch (error) {
      return `Error retrieving projects: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Tool: get_user_project_tasks
 * Retrieves all tasks for a specific assigned project
 */
export const getUserProjectTasksTool = {
  name: 'get_user_project_tasks',
  description: 'Get all tasks for a specific assigned project by project ID. Only works for projects assigned to the current user.',
  inputSchema: zodToJsonSchema(GetProjectTasksSchema),
  handler: async (params: z.infer<typeof GetProjectTasksSchema>): Promise<string> => {
    const { projectId } = params;

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return createValidationErrorMessage({
        field: 'projectId',
        value: projectId,
        reason: 'invalid_project_id'
      });
    }

    try {
      const apiService = new MocoApiService();
      const tasks = await apiService.getProjectTasks(projectId);

      if (tasks.length === 0) {
        return createEmptyResultMessage({ 
          type: 'tasks',
          projectId 
        });
      }

      return formatProjectTasks(tasks, projectId);

    } catch (error) {
      return `Error retrieving tasks for project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Formats a list of projects into a readable string
 */
function formatProjectsList(projects: Project[]): string {
  const lines: string[] = [];
  
  lines.push(`Assigned projects (${projects.length}):\n`);

  projects.forEach(project => {
    lines.push(`ID: ${project.id}`);
    lines.push(`Name: ${project.name}`);
    
    if (project.description) {
      lines.push(`Description: ${project.description}`);
    }
    
    lines.push(`Status: ${project.active ? 'Active' : 'Inactive'}`);
    
    if (project.customer) {
      lines.push(`Customer: ${project.customer.name}`);
    }
    
    if (project.leader) {
      lines.push(`Leader: ${project.leader.firstname} ${project.leader.lastname}`);
    }
    
    if (project.budget) {
      lines.push(`Budget: ${project.budget} ${project.currency}`);
    }
    
    lines.push(''); // Empty line between projects
  });

  return lines.join('\\n');
}

/**
 * Formats search results with highlighting of the search term
 */
function formatProjectsSearchResults(projects: Project[], query: string): string {
  const lines: string[] = [];
  
  lines.push(`Search results for "${query}" (${projects.length} found):\n`);

  projects.forEach(project => {
    lines.push(`ID: ${project.id}`);
    lines.push(`Name: ${highlightSearchTerm(project.name, query)}`);
    
    if (project.description) {
      lines.push(`Description: ${highlightSearchTerm(project.description, query)}`);
    }
    
    lines.push(`Status: ${project.active ? 'Active' : 'Inactive'}`);
    
    if (project.customer) {
      lines.push(`Customer: ${project.customer.name}`);
    }
    
    lines.push(''); // Empty line between projects
  });

  return lines.join('\\n');
}

/**
 * Formats project tasks into a readable string
 */
function formatProjectTasks(tasks: Task[], projectId: number): string {
  const lines: string[] = [];
  
  lines.push(`Tasks for project ${projectId} (${tasks.length} found):\n`);

  tasks.forEach(task => {
    lines.push(`ID: ${task.id}`);
    lines.push(`Name: ${task.name}`);
    lines.push(`Status: ${task.active ? 'Active' : 'Inactive'}`);
    lines.push(`Billable: ${task.billable ? 'Yes' : 'No'}`);
    lines.push(''); // Empty line between tasks
  });

  return lines.join('\\n');
}

/**
 * Highlights search terms in text (simple text-based highlighting)
 * @param text - Text to highlight in
 * @param searchTerm - Term to highlight
 * @returns Text with highlighted search terms
 */
function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) {
    return text;
  }

  // Case-insensitive replacement with markers
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '**$1**'); // Using markdown-style bold for highlighting
}

/**
 * Escapes special regex characters in a string
 * @param string - String to escape
 * @returns Escaped string safe for regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}