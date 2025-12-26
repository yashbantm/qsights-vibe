<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProgramRole;
use App\Models\Program;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ProgramRoleController extends Controller
{
    /**
     * Get all roles for a specific program
     */
    public function index(Request $request, $programId)
    {
        // Check authorization
        $user = $request->user();
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            // If program-admin, verify they belong to this program
            if ($user->role === 'program-admin' && $user->program_id !== $programId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $program = Program::findOrFail($programId);
        
        $roles = ProgramRole::where('program_id', $programId)
            ->with(['program'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'roles' => $roles,
            'program' => $program
        ]);
    }

    /**
     * Get a single program role
     */
    public function show(Request $request, $programId, $roleId)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = ProgramRole::where('program_id', $programId)
            ->with(['program'])
            ->findOrFail($roleId);

        return response()->json(['role' => $role]);
    }

    /**
     * Create a new program role with services and events
     */
    public function store(Request $request, $programId)
    {
        $user = $request->user();
        
        // Authorization check
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // If program-admin, verify they belong to this program
        if ($user->role === 'program-admin' && $user->program_id !== $programId) {
            return response()->json(['message' => 'Unauthorized - You can only manage roles in your own program'], 403);
        }

        // Verify program exists
        $program = Program::findOrFail($programId);

        // Validation
        $validator = Validator::make($request->all(), [
            'role_name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:program_roles,username',
            'email' => 'required|email|max:255|unique:program_roles,email',
            'password' => 'required|string|min:8',
            'description' => 'nullable|string',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'string',
            'event_ids' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if role_name is unique within this program
        $existingRole = ProgramRole::where('program_id', $programId)
            ->where('role_name', $request->role_name)
            ->first();

        if ($existingRole) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['role_name' => ['A role with this name already exists in this program']]
            ], 422);
        }

        // Create the program role
        $role = ProgramRole::create([
            'program_id' => $programId,
            'role_name' => $request->role_name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'description' => $request->description,
            'status' => 'active',
        ]);

        // NOTE: service_ids from frontend are permission strings (like "dashboard", "list_organization")
        // These are NOT UUIDs and should NOT be stored in the database activities table
        // They're just frontend permission identifiers that control UI visibility
        // We skip storing them since they're not foreign keys
        
        // Assign events - Only if they're actual activity UUIDs from the database
        if ($request->has('event_ids') && is_array($request->event_ids)) {
            // Validate these are actual UUIDs from activities table
            $validEventIds = Activity::whereIn('id', $request->event_ids)->pluck('id')->toArray();
            if (!empty($validEventIds)) {
                $role->events()->attach($validEventIds);
            }
        }

        // Load relationships for response (excluding activities since service_ids are not stored in DB)
        $role->load(['program']);
        
        // Only load events if we actually attached any
        if ($request->has('event_ids') && !empty($request->event_ids)) {
            $role->load(['events']);
        }

        // Send email notification
        try {
            $this->sendRoleCreationEmail($role, $request->password, $program, $user);
        } catch (\Exception $e) {
            \Log::error('Failed to send role creation email: ' . $e->getMessage());
            // Continue even if email fails
        }

        return response()->json([
            'message' => 'Role created successfully',
            'role' => $role
        ], 201);
    }

    /**
     * Update a program role
     */
    public function update(Request $request, $programId, $roleId)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'program-admin' && $user->program_id !== $programId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = ProgramRole::where('program_id', $programId)->findOrFail($roleId);

        // Validation
        $validator = Validator::make($request->all(), [
            'role_name' => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|max:255|unique:program_roles,username,' . $roleId,
            'email' => 'sometimes|required|email|max:255|unique:program_roles,email,' . $roleId,
            'password' => 'sometimes|nullable|string|min:8',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'string',
            'event_ids' => 'nullable|array',
            'event_ids.*' => 'exists:activities,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check role_name uniqueness within program
        if ($request->has('role_name')) {
            $existingRole = ProgramRole::where('program_id', $programId)
                ->where('role_name', $request->role_name)
                ->where('id', '!=', $roleId)
                ->first();

            if ($existingRole) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['role_name' => ['A role with this name already exists in this program']]
                ], 422);
            }
        }

        // Update basic fields
        $updateData = $request->only(['role_name', 'username', 'email', 'description', 'status']);
        
        if ($request->has('password') && $request->password) {
            $updateData['password'] = Hash::make($request->password);
        }

        $role->update($updateData);

        // Update service assignments
        if ($request->has('service_ids')) {
            $role->activities()->sync($request->service_ids);
        }

        // Update event assignments
        if ($request->has('event_ids')) {
            $role->events()->sync($request->event_ids);
        }

        $role->load(['activities', 'events', 'program']);

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => $role
        ]);
    }

    /**
     * Delete a program role
     */
    public function destroy(Request $request, $programId, $roleId)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'program-admin' && $user->program_id !== $programId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = ProgramRole::where('program_id', $programId)->findOrFail($roleId);
        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    /**
     * Restore a deleted program role
     */
    public function restore(Request $request, $programId, $roleId)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $role = ProgramRole::where('program_id', $programId)
            ->withTrashed()
            ->findOrFail($roleId);
            
        $role->restore();

        return response()->json(['message' => 'Role restored successfully', 'role' => $role]);
    }

    /**
     * Get available services (system permissions) and events for a program
     */
    public function getAvailableActivities(Request $request, $programId)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // System-level permissions/services
        $services = [
            // Dashboard & Overview
            ['id' => 'dashboard', 'name' => 'Dashboard', 'category' => 'Overview', 'description' => 'View dashboard and statistics'],
            
            // Organizations
            ['id' => 'list_organization', 'name' => 'List Organizations', 'category' => 'Organizations', 'description' => 'View organization list'],
            ['id' => 'add_organization', 'name' => 'Add Organization', 'category' => 'Organizations', 'description' => 'Create new organizations'],
            ['id' => 'edit_organization', 'name' => 'Edit Organization', 'category' => 'Organizations', 'description' => 'Modify organization details'],
            ['id' => 'disable_organization', 'name' => 'Disable Organization', 'category' => 'Organizations', 'description' => 'Disable organizations'],
            
            // Programs
            ['id' => 'list_programs', 'name' => 'List Programs', 'category' => 'Programs', 'description' => 'View programs list'],
            ['id' => 'add_programs', 'name' => 'Add Programs', 'category' => 'Programs', 'description' => 'Create new programs'],
            ['id' => 'edit_programs', 'name' => 'Edit Programs', 'category' => 'Programs', 'description' => 'Modify program details'],
            ['id' => 'disable_programs', 'name' => 'Disable Programs', 'category' => 'Programs', 'description' => 'Disable programs'],
            
            // Group Heads
            ['id' => 'list_group_head', 'name' => 'List Group Head', 'category' => 'Group Management', 'description' => 'View group heads'],
            ['id' => 'add_group_head', 'name' => 'Add Group Head', 'category' => 'Group Management', 'description' => 'Create group heads'],
            ['id' => 'edit_group_head', 'name' => 'Edit Group Head', 'category' => 'Group Management', 'description' => 'Modify group heads'],
            ['id' => 'disable_group_head', 'name' => 'Disable Group Head', 'category' => 'Group Management', 'description' => 'Disable group heads'],
            
            // Groups
            ['id' => 'add_group', 'name' => 'Add Group', 'category' => 'Group Management', 'description' => 'Create groups'],
            ['id' => 'edit_group', 'name' => 'Edit Group', 'category' => 'Group Management', 'description' => 'Modify groups'],
            ['id' => 'group_map', 'name' => 'Group Map', 'category' => 'Group Management', 'description' => 'View group mappings'],
            ['id' => 'group_list', 'name' => 'Group List', 'category' => 'Group Management', 'description' => 'View group lists'],
            ['id' => 'group_status', 'name' => 'Group Status', 'category' => 'Group Management', 'description' => 'View group status'],
            ['id' => 'bulk_upload', 'name' => 'Bulk Upload', 'category' => 'Group Management', 'description' => 'Upload groups in bulk'],
            
            // Participants
            ['id' => 'add_program_participants', 'name' => 'Add Program Participants', 'category' => 'Participants', 'description' => 'Add participants to program'],
            ['id' => 'add_participants', 'name' => 'Add Participants', 'category' => 'Participants', 'description' => 'Create participants'],
            ['id' => 'edit_participants', 'name' => 'Edit Participants', 'category' => 'Participants', 'description' => 'Modify participant details'],
            ['id' => 'disable_participants', 'name' => 'Disable Participants', 'category' => 'Participants', 'description' => 'Disable participants'],
            ['id' => 'list_program_participants', 'name' => 'List Program Participants', 'category' => 'Participants', 'description' => 'View program participants'],
            ['id' => 'list_participants', 'name' => 'List Participants', 'category' => 'Participants', 'description' => 'View all participants'],
            
            // Activities/Events
            ['id' => 'list_activity', 'name' => 'List Activity', 'category' => 'Activities', 'description' => 'View activities list'],
            ['id' => 'activity_status', 'name' => 'Activity Status', 'category' => 'Activities', 'description' => 'View activity status'],
            ['id' => 'delete_activity_files', 'name' => 'Delete Activity Files', 'category' => 'Activities', 'description' => 'Remove activity files'],
            ['id' => 'activity_files_upload', 'name' => 'Activity Files Upload', 'category' => 'Activities', 'description' => 'Upload activity files'],
            ['id' => 'generate_activity_link', 'name' => 'Generate Activity Link', 'category' => 'Activities', 'description' => 'Create activity links'],
            ['id' => 'activity_add', 'name' => 'Activity Add', 'category' => 'Activities', 'description' => 'Create new activities'],
            ['id' => 'activity_files_listing', 'name' => 'Activity Files Listing', 'category' => 'Activities', 'description' => 'View activity files'],
            ['id' => 'activity_view_anonymous', 'name' => 'Activity View Anonymous', 'category' => 'Activities', 'description' => 'View anonymous activity data'],
            
            // Questionnaires
            ['id' => 'category_add', 'name' => 'Category Add', 'category' => 'Questionnaires', 'description' => 'Create question categories'],
            ['id' => 'category_edit', 'name' => 'Category Edit', 'category' => 'Questionnaires', 'description' => 'Modify categories'],
            ['id' => 'category_list', 'name' => 'Category List', 'category' => 'Questionnaires', 'description' => 'View categories'],
            ['id' => 'category_map', 'name' => 'Category Map', 'category' => 'Questionnaires', 'description' => 'Map categories'],
            ['id' => 'category_status', 'name' => 'Category Status', 'category' => 'Questionnaires', 'description' => 'View category status'],
            ['id' => 'question_add', 'name' => 'Question Add', 'category' => 'Questionnaires', 'description' => 'Create questions'],
            ['id' => 'question_edit', 'name' => 'Question Edit', 'category' => 'Questionnaires', 'description' => 'Modify questions'],
            ['id' => 'question_list', 'name' => 'Question List', 'category' => 'Questionnaires', 'description' => 'View questions'],
            ['id' => 'question_bank_list', 'name' => 'Question Bank List', 'category' => 'Questionnaires', 'description' => 'View question bank'],
            ['id' => 'question_bank_add', 'name' => 'Question Bank Add', 'category' => 'Questionnaires', 'description' => 'Add to question bank'],
            ['id' => 'question_bank_edit', 'name' => 'Question Bank Edit', 'category' => 'Questionnaires', 'description' => 'Edit question bank'],
            ['id' => 'question_bank_status', 'name' => 'Question Bank Status', 'category' => 'Questionnaires', 'description' => 'View question bank status'],
            ['id' => 'question_header_list', 'name' => 'Question Header List', 'category' => 'Questionnaires', 'description' => 'View question headers'],
            ['id' => 'question_header_add', 'name' => 'Question Header Add', 'category' => 'Questionnaires', 'description' => 'Create question headers'],
            ['id' => 'question_header_edit', 'name' => 'Question Header Edit', 'category' => 'Questionnaires', 'description' => 'Edit question headers'],
            ['id' => 'question_header_tables', 'name' => 'Question Header Tables', 'category' => 'Questionnaires', 'description' => 'View header tables'],
            
            // Reports & Analytics
            ['id' => 'sms_edit', 'name' => 'SMS Edit', 'category' => 'Communications', 'description' => 'Modify SMS'],
            ['id' => 'sms_status', 'name' => 'SMS Status', 'category' => 'Communications', 'description' => 'View SMS status'],
            ['id' => 'send_sms', 'name' => 'Send SMS', 'category' => 'Communications', 'description' => 'Send SMS messages'],
            ['id' => 'email_status', 'name' => 'Email Status', 'category' => 'Communications', 'description' => 'View email status'],
            ['id' => 'send_email', 'name' => 'Send Email', 'category' => 'Communications', 'description' => 'Send emails'],
            ['id' => 'list_email', 'name' => 'List Email', 'category' => 'Communications', 'description' => 'View email list'],
            ['id' => 'report_download', 'name' => 'Report Download', 'category' => 'Reports', 'description' => 'Download reports'],
            ['id' => 'edit_dynamic_report', 'name' => 'Edit Dynamic Report', 'category' => 'Reports', 'description' => 'Modify dynamic reports'],
            ['id' => 'dynamic_report_status', 'name' => 'Dynamic Report Status', 'category' => 'Reports', 'description' => 'View report status'],
            ['id' => 'dynamic_report_list', 'name' => 'Dynamic Report List', 'category' => 'Reports', 'description' => 'View reports list'],
            ['id' => 'generate_dynamic_report', 'name' => 'Generate Dynamic Report', 'category' => 'Reports', 'description' => 'Create dynamic reports'],
            ['id' => 'theme_customization', 'name' => 'Theme Customization', 'category' => 'Settings', 'description' => 'Customize theme'],
            ['id' => 'page_edit', 'name' => 'Page Edit', 'category' => 'Settings', 'description' => 'Edit pages'],
            ['id' => 'page_list', 'name' => 'Page List', 'category' => 'Settings', 'description' => 'View pages'],
            ['id' => 'page_add', 'name' => 'Page Add', 'category' => 'Settings', 'description' => 'Create pages'],
            ['id' => 'filter_report', 'name' => 'Filter Report', 'category' => 'Reports', 'description' => 'Filter reports'],
            ['id' => 'view_report', 'name' => 'View Report', 'category' => 'Reports', 'description' => 'View reports'],
            
            // Users & Roles
            ['id' => 'edit_read', 'name' => 'Edit Read', 'category' => 'Permissions', 'description' => 'Edit read permissions'],
            ['id' => 'login', 'name' => 'Login', 'category' => 'Authentication', 'description' => 'Login access'],
            ['id' => 'list_user', 'name' => 'List User', 'category' => 'Users', 'description' => 'View users list'],
            ['id' => 'add_user', 'name' => 'Add User', 'category' => 'Users', 'description' => 'Create users'],
            ['id' => 'edit_user', 'name' => 'Edit User', 'category' => 'Users', 'description' => 'Modify users'],
            ['id' => 'map_user', 'name' => 'Map User', 'category' => 'Users', 'description' => 'Map users to programs'],
            ['id' => 'edit_roles', 'name' => 'Edit Roles', 'category' => 'Roles', 'description' => 'Modify roles'],
            ['id' => 'list_roles', 'name' => 'List Roles', 'category' => 'Roles', 'description' => 'View roles'],
            ['id' => 'add_roles', 'name' => 'Add Roles', 'category' => 'Roles', 'description' => 'Create roles'],
            ['id' => 'settings', 'name' => 'Settings', 'category' => 'Settings', 'description' => 'Access settings'],
            
            // Additional
            ['id' => 'is_group_head', 'name' => 'Is Group Head', 'category' => 'Special Access', 'description' => 'Group head privileges'],
            ['id' => 'is_organization', 'name' => 'Is Organization', 'category' => 'Special Access', 'description' => 'Organization privileges'],
            ['id' => 'is_manager', 'name' => 'Is Manager', 'category' => 'Special Access', 'description' => 'Manager privileges'],
            ['id' => 'is_moderator', 'name' => 'Is Moderator', 'category' => 'Special Access', 'description' => 'Moderator privileges'],
            ['id' => 'is_support_admin', 'name' => 'Is Support Admin', 'category' => 'Special Access', 'description' => 'Support admin privileges'],
            ['id' => 'is_admin', 'name' => 'Is Admin', 'category' => 'Special Access', 'description' => 'Admin privileges'],
            ['id' => 'profile', 'name' => 'Profile', 'category' => 'User', 'description' => 'View/edit profile'],
        ];

        // Get actual events/activities for this program
        $events = Activity::where('program_id', $programId)
            ->select('id', 'name', 'type', 'status', 'start_date', 'end_date')
            ->orderBy('name')
            ->get();

        return response()->json([
            'services' => $services,
            'events' => $events
        ]);
    }

    /**
     * Send role creation email
     */
    private function sendRoleCreationEmail($role, $plainPassword, $program, $creator)
    {
        $emailData = [
            'role_name' => $role->role_name,
            'username' => $role->username,
            'password' => $plainPassword,
            'email' => $role->email,
            'program_name' => $program->name,
            'organization_name' => $program->organization->name ?? 'QSights',
            'login_url' => config('app.frontend_url', 'https://prod.qsights.com'),
            'created_by' => $creator->name,
        ];

        Mail::send('emails.role-created', $emailData, function ($message) use ($role) {
            $message->to($role->email)
                    ->subject('Your Role Access Has Been Created - ' . $role->program->name);
        });
    }
}
