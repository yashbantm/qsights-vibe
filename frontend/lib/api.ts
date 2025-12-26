// API Integration Layer for QSights 2.0
// Handles all backend communication with Laravel API

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://prod.qsights.com/api';
export const API_BASE_URL = API_URL.replace('/api', '');

// Helper to build query string with program-level filtering
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(`${key}[]`, v));
      } else {
        query.append(key, value);
      }
    }
  });
  
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

// Types
export interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  programId?: string;
}

export interface Organization {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  description?: string;
  location?: string;
  contact_email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Relationships from backend
  group_heads_count?: number;
  programs_count?: number;
  active_participants_count?: number;
  inactive_participants_count?: number;
  guest_participants_count?: number;
}

export interface GroupHead {
  id: string;
  organization_id: string;
  user_id: string;
  name?: string; // For create operation (will be used to create user)
  email?: string; // For create operation (will be used to create user)
  phone?: string;
  department?: string;
  designation?: string;
  status: 'active' | 'inactive';
  logo?: string; // Logo URL or path
  created_at: string;
  updated_at: string;
  // Relationships from backend
  organization?: Organization;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  programs_count?: number;
}

export interface Program {
  id: string;
  organization_id: string;
  group_head_id?: string;
  name: string;
  code?: string;
  description?: string;
  logo?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'completed';
  generate_admin?: boolean; // For create operation
  generate_manager?: boolean; // For create operation
  generate_moderator?: boolean; // For create operation
  generated_users?: Array<{ // Response from create operation
    email: string;
    password: string;
    role: string;
  }>;
  created_at: string;
  updated_at: string;
  // Relationships from backend
  organization?: Organization;
  group_head?: {
    id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
  participants_count?: number;
  authenticated_participants_count?: number;
  guest_participants_count?: number;
  activities_count?: number;
}

export interface ProgramUser {
  id: string;
  program_id: string;
  name: string;
  email: string;
  role: 'program-admin' | 'program-manager' | 'program-moderator';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone?: string;
  language_preference?: string;
  status: 'active' | 'inactive';
  is_guest?: boolean;
  guest_code?: string;
  program_ids?: string[]; // For create/update operations
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
  programs?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  programs_count?: number;
  activities_count?: number;
}

export interface Questionnaire {
  id: string;
  organization_id: string;
  program_id?: string;
  title: string;
  description?: string;
  type?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: any;
  created_at: string;
  updated_at: string;
  // Relationships from backend
  program?: {
    id: string;
    name: string;
  };
  sections?: Array<{
    id: string;
    title: string;
    description?: string;
    questions?: Array<any>;
  }>;
  responses_count?: number;
  authenticated_responses_count?: number;
  guest_responses_count?: number;
}

export interface Activity {
  id: string;
  organization_id: string;
  program_id: string;
  questionnaire_id?: string;
  name: string;
  description?: string;
  type: 'survey' | 'poll' | 'assessment';
  status: 'draft' | 'upcoming' | 'live' | 'expired' | 'closed' | 'archived';
  start_date?: string;
  end_date?: string;
  allow_guests?: boolean;
  is_multilingual?: boolean;
  languages?: string[]; // Array of language codes (e.g., ["EN", "HI"])
  settings?: {
    display_mode?: string;
    [key: string]: any;
  };
  time_limit_enabled?: boolean;
  time_limit_minutes?: number;
  pass_percentage?: number;
  max_retakes?: number | null;
  // Additional fields
  sender_email?: string;
  manager_name?: string;
  manager_email?: string;
  project_code?: string;
  configuration_date?: string;
  configuration_price?: number;
  subscription_price?: number;
  subscription_frequency?: string;
  tax_percentage?: number;
  number_of_participants?: number;
  questions_to_randomize?: number;
  // Approval audit fields
  approved_by?: string;
  approved_at?: string;
  approval_comments?: string;
  participants_count?: number;
  active_participants_count?: number;
  anonymous_participants_count?: number;
  authenticated_participants_count?: number;
  guest_participants_count?: number;
  inactive_participants_count?: number;
  responses_count?: number;
  authenticated_responses_count?: number;
  guest_responses_count?: number;
  participants_responded_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityApprovalRequest {
  id: string;
  program_id: string;
  questionnaire_id?: string;
  requested_by: string | {
    id: string;
    name: string;
    email: string;
  };
  reviewed_by?: string | {
    id: string;
    name: string;
    email: string;
  } | null;
  name: string;
  sender_email?: string;
  description?: string;
  type: 'survey' | 'poll' | 'assessment';
  start_date?: string;
  end_date?: string;
  close_date?: string;
  manager_name?: string;
  manager_email?: string;
  project_code?: string;
  configuration_date?: string;
  configuration_price?: number;
  subscription_price?: number;
  subscription_frequency?: string;
  tax_percentage?: number;
  number_of_participants?: number;
  questions_to_randomize?: number;
  allow_guests?: boolean;
  is_multilingual?: boolean;
  languages?: string[];
  settings?: any;
  registration_form_fields?: any[];
  landing_config?: any;
  time_limit_enabled?: boolean;
  time_limit_minutes?: number;
  pass_percentage?: number;
  max_retakes?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  reviewed_at?: string;
  created_activity_id?: string;
  created_at: string;
  updated_at: string;
  // Relationships - Laravel returns these as snake_case
  program?: Program;
  questionnaire?: Questionnaire;
  requested_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  reviewed_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  requestedBy?: User;
  reviewedBy?: User;
  createdActivity?: Activity;
}

export interface Response {
  id: string;
  activity_id: string;
  participant_id: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  answers?: Array<{
    id: string;
    question_id: string;
    response_id: string;
    answer_text?: string;
    answer_value?: any;
    created_at: string;
    updated_at: string;
  }>;
}

// Utility function to get backend token from cookies
function getBackendToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('backendToken='));
  
  if (!tokenCookie) return null;
  
  const encodedToken = tokenCookie.split('=')[1];
  // Decode URL-encoded token
  return decodeURIComponent(encodedToken);
}

// Get CSRF token cookie from Laravel
async function getCsrfCookie(): Promise<void> {
  try {
    await fetch(`${API_URL.replace('/api', '')}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to get CSRF cookie:', error);
  }
}

// Get CSRF token from cookie
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('XSRF-TOKEN='));
  
  if (!csrfCookie) return null;
  
  return decodeURIComponent(csrfCookie.split('=')[1]);
}

// Fetch wrapper with authentication and error handling
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getBackendToken();
  
  // Get CSRF cookie for state-changing requests
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    await getCsrfCookie();
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token to headers
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const responseText = await response.text();
  
  // Extract JSON from response (may contain PHP warnings/errors)
  let data;
  try {
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    console.error('Failed to parse API response:', responseText.substring(0, 200));
    throw new Error('Invalid server response');
  }

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

// Organizations API
export const organizationsApi = {
  async getAll(): Promise<Organization[]> {
    const data = await fetchWithAuth('/organizations?withCount=groupHeads,programs');
    return data.data || data;
  },

  async getById(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}`);
    return data.data || data;
  },

  async create(organization: Partial<Organization>): Promise<Organization> {
    const data = await fetchWithAuth('/organizations', {
      method: 'POST',
      body: JSON.stringify(organization),
    });
    return data.data || data;
  },

  async update(id: string, organization: Partial<Organization>): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(organization),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/organizations/${id}`, {
      method: 'DELETE',
    });
  },

  async deactivate(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/deactivate`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async activate(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/activate`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async restore(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/restore`, {
      method: 'POST',
    });
    return data.data || data;
  },
};

// Group Heads API
export const groupHeadsApi = {
  async getAll(): Promise<GroupHead[]> {
    const data = await fetchWithAuth('/group-heads?with=organization&withCount=programs');
    return data.data || data;
  },

  async getById(id: string): Promise<GroupHead> {
    const data = await fetchWithAuth(`/group-heads/${id}`);
    return data.data || data;
  },

  async create(groupHead: Partial<GroupHead>): Promise<GroupHead> {
    const data = await fetchWithAuth('/group-heads', {
      method: 'POST',
      body: JSON.stringify(groupHead),
    });
    return data.data || data;
  },

  async update(id: string, groupHead: Partial<GroupHead>): Promise<GroupHead> {
    const data = await fetchWithAuth(`/group-heads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupHead),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/group-heads/${id}`, {
      method: 'DELETE',
    });
  },

  async resetPassword(id: string): Promise<{ message: string }> {
    return await fetchWithAuth(`/group-heads/${id}/reset-password`, {
      method: 'POST',
    });
  },
};

// Programs API
export const programsApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Program[]> {
    const query = buildQueryString({ with: 'organization', withCount: 'participants,activities', ...filters });
    const data = await fetchWithAuth(`/programs${query}`);
    return data.data || data;
  },

  async getById(id: string): Promise<Program> {
    const data = await fetchWithAuth(`/programs/${id}`);
    return data.data || data;
  },

  async create(program: Partial<Program>): Promise<Program> {
    const data = await fetchWithAuth('/programs', {
      method: 'POST',
      body: JSON.stringify(program),
    });
    return data.data || data;
  },

  async update(id: string, program: Partial<Program>): Promise<Program> {
    const data = await fetchWithAuth(`/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(program),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/programs/${id}`, {
      method: 'DELETE',
    });
  },

  async getStatistics(id: string): Promise<any> {
    return await fetchWithAuth(`/programs/${id}/statistics`);
  },

  async getProgramUsers(programId: string): Promise<ProgramUser[]> {
    const data = await fetchWithAuth(`/programs/${programId}/users`);
    return data.data || data;
  },

  async resetProgramUserPassword(programId: string, userId: string): Promise<{ credentials: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/users/${userId}/reset-password`, {
      method: 'POST',
    });
    return data;
  },
};

// Program Roles API
export const programRolesApi = {
  async getAll(programId: string): Promise<{ roles: any[]; program: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles`);
    return data;
  },

  async getById(programId: string, roleId: string): Promise<{ role: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/${roleId}`);
    return data;
  },

  async create(programId: string, roleData: any): Promise<{ role: any; message: string }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles`, {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return data;
  },

  async update(programId: string, roleId: string, roleData: any): Promise<{ role: any; message: string }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
    return data;
  },

  async delete(programId: string, roleId: string): Promise<void> {
    await fetchWithAuth(`/programs/${programId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async getAvailableActivities(programId: string): Promise<{ services: any[]; events: any[] }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    return data;
  },

  async getServices(programId: string): Promise<any[]> {
    console.log("🔍 API: Fetching services for programId:", programId);
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    console.log("✅ API: Received data:", data);
    return data.services || [];
  },

  async getEvents(programId: string): Promise<any[]> {
    console.log("🔍 API: Fetching events for programId:", programId);
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    return data.events || [];
  },
};

// Participants API
export const participantsApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Participant[]> {
    const query = buildQueryString({ per_page: 1000, ...filters });
    const response = await fetchWithAuth(`/participants${query}`);
    // Backend returns paginated response with { data: [...], meta: {...} }
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback for non-paginated response
    return Array.isArray(response) ? response : [];
  },

  async getById(id: string): Promise<Participant> {
    const data = await fetchWithAuth(`/participants/${id}`);
    return data.data || data;
  },

  async create(participant: Partial<Participant>): Promise<Participant> {
    const data = await fetchWithAuth('/participants', {
      method: 'POST',
      body: JSON.stringify(participant),
    });
    return data.data || data;
  },

  async update(id: string, participant: Partial<Participant>): Promise<Participant> {
    const data = await fetchWithAuth(`/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(participant),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/participants/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDelete(ids: string[]): Promise<{ message: string; deleted_count: number }> {
    const data = await fetchWithAuth('/participants/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return data;
  },

  async bulkImport(file: File): Promise<{ 
    message: string; 
    successCount: number; 
    skippedCount: number; 
    skippedRows: Array<{ rowNumber: number; reason: string }> 
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/participants/bulk-import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async downloadTemplate(): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/participants/download-template`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.blob();
  },
};

// Questionnaires API
export const questionnairesApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Questionnaire[]> {
    const query = buildQueryString(filters || {});
    const response = await fetchWithAuth(`/questionnaires${query}`);
    
    // Handle Laravel pagination structure: response has 'data' property with items array
    // Laravel returns { data: [...items], current_page: 1, ... }
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[questionnairesApi] Unexpected response format, returning empty array');
    return [];
  },

  async getById(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}`);
    return data.data || data;
  },

  async create(questionnaire: Partial<Questionnaire>): Promise<Questionnaire> {
    const data = await fetchWithAuth('/questionnaires', {
      method: 'POST',
      body: JSON.stringify(questionnaire),
    });
    return data.data || data;
  },

  async update(id: string, questionnaire: Partial<Questionnaire>): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionnaire),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/questionnaires/${id}`, {
      method: 'DELETE',
    });
  },

  async publish(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/publish`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async archive(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/archive`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async duplicate(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/duplicate`, {
      method: 'POST',
    });
    return data.data || data;
  },
};

// Activities API
export const activitiesApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Activity[]> {
    const query = buildQueryString({ withCount: 'participants,responses', ...filters });
    const response = await fetchWithAuth(`/activities${query}`);
    
    // Handle Laravel pagination structure: response has 'data' property with items array
    // Laravel returns { data: [...items], current_page: 1, ... }
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[activitiesApi] Unexpected response format, returning empty array');
    return [];
  },

  async getById(id: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}`);
    return data.data || data;
  },

  async create(activity: Partial<Activity>): Promise<Activity> {
    const data = await fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    return data.data || data;
  },

  async update(id: string, activity: Partial<Activity>): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(activity),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/activities/${id}`, {
      method: 'DELETE',
    });
  },

  async assignQuestionnaire(id: string, questionnaireId: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}/assign-questionnaire`, {
      method: 'POST',
      body: JSON.stringify({ questionnaire_id: questionnaireId }),
    });
    return data.data || data;
  },

  async updateStatus(id: string, status: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.data || data;
  },

  async getParticipants(id: string): Promise<any[]> {
    const data = await fetchWithAuth(`/activities/${id}/participants`);
    return data.data || [];
  },

  async getLandingPageConfig(id: string): Promise<any> {
    const data = await fetchWithAuth(`/activities/${id}/landing-config`);
    return data.data || data;
  },

  async saveLandingPageConfig(id: string, config: any): Promise<any> {
    const data = await fetchWithAuth(`/activities/${id}/landing-config`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
    return data.data || data;
  },

  async uploadLandingImage(id: string, file: File, field: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('field', field);

    const response = await fetch(`${API_URL}/activities/${id}/landing-config/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.data || data;
  },
};

// Responses API
export const responsesApi = {
  async start(activityId: string): Promise<Response> {
    const data = await fetchWithAuth('/responses/start', {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId }),
    });
    return data.data || data;
  },

  async resume(responseId: string): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/resume`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async saveProgress(responseId: string, answers: any[]): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/save`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return data.data || data;
  },

  async submit(responseId: string, answers: any[]): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return data.data || data;
  },

  async getProgress(responseId: string): Promise<any> {
    return await fetchWithAuth(`/responses/${responseId}/progress`);
  },

  async getStatistics(activityId: string): Promise<any> {
    return await fetchWithAuth(`/activities/${activityId}/responses/statistics`);
  },

  async getByActivity(activityId: string): Promise<Response[]> {
    // Request all responses by setting high per_page (Laravel will handle the limit)
    // This ensures Question-wise Analysis shows the same data as summary statistics
    const data = await fetchWithAuth(`/activities/${activityId}/responses?per_page=10000`);
    
    console.log('🔍 [responsesApi.getByActivity] Raw API response:', {
      hasData: data && typeof data === 'object' && 'data' in data,
      isArray: Array.isArray(data),
      dataType: typeof data,
      keys: data ? Object.keys(data) : [],
      firstItemKeys: data?.data?.[0] ? Object.keys(data.data[0]) : (data?.[0] ? Object.keys(data[0]) : [])
    });
    
    // Handle Laravel pagination structure - extract data array from paginated response
    // Response format: { data: [...], current_page: 1, total: X, ... }
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      console.log(`✅ Loaded ${data.data.length} responses (Total: ${data.total || data.data.length})`);
      if (data.data.length > 0) {
        console.log('🔍 First response has answers?', {
          hasAnswers: 'answers' in data.data[0],
          answersLength: data.data[0].answers?.length || 0,
          answersType: typeof data.data[0].answers,
          sampleKeys: Object.keys(data.data[0])
        });
      }
      return data.data;
    }
    
    // Fallback for non-paginated response
    if (Array.isArray(data)) {
      console.log(`✅ Loaded ${data.length} responses (direct array)`);
      if (data.length > 0) {
        console.log('🔍 First response has answers?', {
          hasAnswers: 'answers' in data[0],
          answersLength: data[0].answers?.length || 0,
          sampleKeys: Object.keys(data[0])
        });
      }
      return data;
    }
    
    console.warn('[responsesApi.getByActivity] Unexpected response format, returning empty array');
    return [];
  },
};

// Reports API
export const reportsApi = {
  async getParticipationMetrics(params?: {
    program_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/reports/participation-metrics${queryString}`);
  },

  async getCompletionMetrics(params?: {
    program_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/reports/completion-metrics${queryString}`);
  },

  async getDrillDownResponses(activityId: string): Promise<any> {
    return await fetchWithAuth(`/reports/drill-down/${activityId}`);
  },

  async getQuestionAnalytics(activityId: string): Promise<any> {
    return await fetchWithAuth(`/reports/question-analytics/${activityId}`);
  },

  async getProgramOverview(programId: string): Promise<any> {
    return await fetchWithAuth(`/reports/program-overview/${programId}`);
  },

  async exportReport(activityId: string, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': format === 'csv' 
        ? 'text/csv' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reports/export/${activityId}?format=${format}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    return response.blob();
  },

  async exportProgramReport(programId: string, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': format === 'csv' 
        ? 'text/csv' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reports/program-export/${programId}?format=${format}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    return response.blob();
  },
};

// Public Activity API (no auth required)
export const publicActivityApi = {
  async getActivity(activityId: string): Promise<Activity> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  async registerParticipant(activityId: string, name: string, email: string): Promise<{
    participant_id: string;
    participant_code: string | null;
    is_guest: boolean;
    activity: Activity;
  }> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ name, email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  async submitResponse(activityId: string, participantId: string, answers: any): Promise<Response> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        participant_id: participantId, 
        answers 
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Submission failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },
};

// Auth API
export const authApi = {
  async me(): Promise<User> {
    const data = await fetchWithAuth('/auth/me');
    return data.user;
  },

  async logout(): Promise<void> {
    await fetchWithAuth('/auth/logout', {
      method: 'POST',
    });
  },

  async refresh(): Promise<{ token: string }> {
    return await fetchWithAuth('/auth/refresh', {
      method: 'POST',
    });
  },
};

// Theme Settings API
export const themeApi = {
  async getAll(): Promise<any> {
    // Public endpoint - no auth required for reading theme settings
    // Use Next.js API route which proxies to the backend
    try {
      const response = await fetch('/api/theme/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch theme settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching theme settings:', error);
      return {}; // Return empty object on error
    }
  },

  async get(key: string): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/theme/settings/${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch theme setting');
    }
    
    return await response.json();
  },

  async update(key: string, value: any, type?: string, category?: string): Promise<any> {
    return await fetchWithAuth(`/theme/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, type, category }),
    });
  },

  async bulkUpdate(settings: Array<{ key: string; value: any; type?: string; category?: string }>): Promise<any> {
    return await fetchWithAuth('/theme/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  },

  async uploadImage(file: File, key: string, category?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);
    if (category) formData.append('category', category);

    const response = await fetch(`${API_URL}/theme/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getBackendToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return await response.json();
  },

  async delete(key: string): Promise<any> {
    return await fetchWithAuth(`/theme/settings/${key}`, {
      method: 'DELETE',
    });
  },
};

// CMS Content API
export const cmsApi = {
  async getAll(): Promise<any[]> {
    const response = await fetch(`${API_URL}/cms/content`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CMS content');
    }

    const data = await response.json();
    return data.data;
  },

  async getByPageKey(pageKey: string): Promise<any> {
    const response = await fetch(`${API_URL}/cms/content/${pageKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CMS content');
    }

    const data = await response.json();
    return data.data;
  },

  async update(pageKey: string, content: any): Promise<any> {
    return await fetchWithAuth(`/cms/content/${pageKey}`, {
      method: 'PUT',
      body: JSON.stringify(content),
    });
  },

  async bulkUpdate(updates: any[]): Promise<any> {
    return await fetchWithAuth('/cms/content/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  },
};

// Landing Pages API
export const landingPagesApi = {
  async getAll(): Promise<any[]> {
    return await fetchWithAuth('/landing-pages/');
  },

  async get(slug: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${slug}`);
  },

  async create(data: any): Promise<any> {
    return await fetchWithAuth('/landing-pages/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${id}`, {
      method: 'DELETE',
    });
  },

  async addSection(pageId: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSection(pageId: string, sectionId: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSection(pageId: string, sectionId: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections/${sectionId}`, {
      method: 'DELETE',
    });
  },
};

// Activity Approval Requests API
export const activityApprovalsApi = {
  async getAll(filters?: { status?: string }): Promise<ActivityApprovalRequest[]> {
    const query = buildQueryString(filters || {});
    const response = await fetchWithAuth(`/activity-approvals${query}`);
    
    // Handle Laravel pagination
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[activityApprovalsApi] Unexpected response format');
    return [];
  },

  async getById(id: string): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth(`/activity-approvals/${id}`);
    return data.data || data;
  },

  async create(request: Partial<ActivityApprovalRequest>): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth('/activity-approvals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return data.data || data;
  },

  async review(id: string, action: 'approve' | 'reject', remarks: string): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth(`/activity-approvals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, remarks }),
    });
    return data.data || data;
  },

  async getStatistics(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
    const data = await fetchWithAuth('/activity-approvals/statistics');
    return data.data || data;
  },
};

// Demo Requests API
export const demoRequestsApi = {
  async getAll(params?: any): Promise<any> {
    return await fetchWithAuth(`/demo-requests${buildQueryString(params || {})}`);
  },

  async get(id: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}`);
  },

  async submit(data: any): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/demo-requests/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit demo request');
    }

    return await response.json();
  },

  async updateStatus(id: string, status: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}`, {
      method: 'DELETE',
    });
  },
};

// Contact Sales API
export const contactSalesApi = {
  async getAll(params?: any): Promise<any> {
    return await fetchWithAuth(`/contact-sales${buildQueryString(params || {})}`);
  },

  async get(id: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}`);
  },

  async submit(data: any): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/contact-sales/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit contact sales request');
    }

    return await response.json();
  },

  async updateStatus(id: string, status: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API (Super Admin)
export const dashboardApi = {
  async getGlobalStatistics(): Promise<any> {
    return await fetchWithAuth('/dashboard/global-statistics', {
      method: 'GET',
    });
  },

  async getOrganizationPerformance(): Promise<any> {
    return await fetchWithAuth('/dashboard/organization-performance', {
      method: 'GET',
    });
  },

  async getSubscriptionMetrics(): Promise<any> {
    return await fetchWithAuth('/dashboard/subscription-metrics', {
      method: 'GET',
    });
  },
};

// Notifications API
export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_pending' | 'approval_approved' | 'approval_rejected' | 'activity_assigned' | 'activity_completed' | 'reminder' | 'event_update' | 'demo_request' | 'contact_request' | 'contact_sales';
  title: string;
  message: string;
  entity_type: 'activity' | 'event' | 'approval' | 'program' | 'participant' | 'demo_request' | 'contact_request' | 'contact_sales';
  entity_id: string;
  entity_name?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    const data = await fetchWithAuth('/notifications');
    return data.data || data;
  },

  async getUnreadCount(): Promise<number> {
    const data = await fetchWithAuth('/notifications/unread-count');
    return data.count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    await fetchWithAuth(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllAsRead(): Promise<void> {
    await fetchWithAuth('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  // Email notification reports
  async getReportsForActivity(activityId: string): Promise<any> {
    return await fetchWithAuth(`/notifications/reports/${activityId}`);
  },

  async getAllReports(): Promise<any> {
    return await fetchWithAuth(`/notifications/reports`);
  },
};
