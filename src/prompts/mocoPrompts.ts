import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export interface MocoPrompt extends Prompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export const MOCO_PROMPTS: MocoPrompt[] = [
  {
    name: 'weekly_time_report',
    description: 'Generates a detailed weekly time tracking report with project breakdown and productivity analysis',
    arguments: [
      {
        name: 'week_start',
        description: 'Start date of the week (YYYY-MM-DD format). Default: current Monday',
        required: false
      },
      {
        name: 'include_billable_analysis',
        description: 'Whether to include breakdown of billable vs non-billable hours',
        required: false
      }
    ]
  },
  {
    name: 'vacation_planning_assistant',
    description: 'Assists with vacation planning by analyzing available vacation days, holidays, and team capacity',
    arguments: [
      {
        name: 'planned_start_date',
        description: 'Planned vacation start date (YYYY-MM-DD)',
        required: true
      },
      {
        name: 'planned_end_date',
        description: 'Planned vacation end date (YYYY-MM-DD)',
        required: true
      },
      {
        name: 'year',
        description: 'Year for vacation planning (default: current year)',
        required: false
      }
    ]
  },
  {
    name: 'personal_productivity_insights',
    description: 'Analyzes personal work habits and provides recommendations for productivity improvement',
    arguments: [
      {
        name: 'analysis_period',
        description: 'Time period for analysis (last_month, last_quarter, current_year)',
        required: false
      },
      {
        name: 'focus_area',
        description: 'Focus area for analysis (time_distribution, project_efficiency, work_patterns)',
        required: false
      }
    ]
  },
  {
    name: 'monthly_business_review',
    description: 'Creates comprehensive business report with project progress, time utilization, and trends',
    arguments: [
      {
        name: 'month',
        description: 'Month for the report (1-12, default: current month)',
        required: false
      },
      {
        name: 'year',
        description: 'Year for the report (default: current year)',
        required: false
      },
      {
        name: 'include_comparisons',
        description: 'Whether to include comparisons with previous month/year',
        required: false
      }
    ]
  },
  {
    name: 'smart_work_life_balance_advisor',
    description: 'Evaluates work-life balance based on working hours, breaks, and overtime, providing personalized recommendations',
    arguments: [
      {
        name: 'analysis_weeks',
        description: 'Number of weeks to analyze (default: 4)',
        required: false
      },
      {
        name: 'target_hours_per_week',
        description: 'Target hours per week (default: 40)',
        required: false
      }
    ]
  },
  {
    name: 'project_time_analysis',
    description: 'Detailed analysis of time distribution across projects with efficiency and profitability metrics',
    arguments: [
      {
        name: 'project_ids',
        description: 'Specific project IDs to analyze (comma-separated). Empty = all active projects',
        required: false
      },
      {
        name: 'time_period',
        description: 'Time period for analysis (last_month, last_quarter, current_year)',
        required: false
      }
    ]
  },
  {
    name: 'team_capacity_overview',
    description: 'Overview of team capacity, planned absences, and resource allocation',
    arguments: [
      {
        name: 'planning_horizon',
        description: 'Planning horizon in weeks (default: 8)',
        required: false
      },
      {
        name: 'include_holidays',
        description: 'Whether to include holidays in capacity planning',
        required: false
      }
    ]
  },
  {
    name: 'work_hours_compliance_check',
    description: 'Checks compliance with working time regulations and identifies potential compliance issues',
    arguments: [
      {
        name: 'check_period',
        description: 'Period for compliance check (last_month, last_quarter)',
        required: false
      },
      {
        name: 'max_weekly_hours',
        description: 'Maximum weekly hours per employment contract (default: 48)',
        required: false
      },
      {
        name: 'max_daily_hours',
        description: 'Maximum daily hours per employment contract (default: 10)',
        required: false
      }
    ]
  }
];

export function getMocoPromptByName(name: string): MocoPrompt | undefined {
  return MOCO_PROMPTS.find(prompt => prompt.name === name);
}

export function getMocoPromptNames(): string[] {
  return MOCO_PROMPTS.map(prompt => prompt.name);
}