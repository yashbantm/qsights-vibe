<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ProgramController extends Controller
{
    /**
     * Display a listing of programs.
     */
    public function index(Request $request)
    {
        $query = Program::with(['organization', 'groupHead', 'groupHead.user'])
            ->withCount([
                'participants as participants_count' => function($q) {
                    $q->whereNull('participants.deleted_at');
                },
                'participants as active_participants_count' => function($q) {
                    $q->where('participants.status', 'active')
                      ->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as inactive_participants_count' => function($q) {
                    $q->where('participants.status', 'inactive')
                      ->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as authenticated_participants_count' => function($q) {
                    $q->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as guest_participants_count' => function($q) {
                    $q->where('participants.is_guest', true)
                      ->whereNull('participants.deleted_at');
                },
                'activities as activities_count' => function($q) {
                    $q->whereNull('activities.deleted_at');
                }
            ]);
        
        // Only include active, non-deleted programs
        if (!$request->boolean('with_trashed')) {
            $query->where('status', 'active')
                  ->whereNull('deleted_at');
        }
        
        // Auto-update expired programs
        $this->updateExpiredPrograms();

        // Filter by organization
        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }        // Filter by group head
        if ($request->has('group_head_id')) {
            $query->where('group_head_id', $request->group_head_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('end_date', '<=', $request->end_date);
        }

        // Include trashed
        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $programs = $query->paginate($request->input('per_page', 15));
        
        // Add calculated fields for each program
        $programs->getCollection()->transform(function ($program) {
            // Calculate progress based on activities completion
            $totalActivities = \App\Models\Activity::where('program_id', $program->id)
                ->whereNull('deleted_at')
                ->count();
            
            $completedActivities = \App\Models\Activity::where('program_id', $program->id)
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->count();
            
            $program->progress = $totalActivities > 0 
                ? round(($completedActivities / $totalActivities) * 100, 2)
                : 0;
            
            return $program;
        });

        return response()->json($programs);
    }

    /**
     * Store a newly created program with auto-generated users.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|uuid|exists:organizations,id',
            'group_head_id' => 'nullable|uuid|exists:group_heads,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:programs,code',
            'description' => 'nullable|string',
            'logo' => 'nullable|string|max:500',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'languages.*' => 'string|max:10',
            'status' => 'nullable|in:active,inactive',
            // User generation flags
            'generate_admin' => 'nullable|boolean',
            'generate_manager' => 'nullable|boolean',
            'generate_moderator' => 'nullable|boolean',
        ]);

        // Create program
        $program = Program::create([
            'id' => Str::uuid(),
            'organization_id' => $validated['organization_id'],
            'group_head_id' => $validated['group_head_id'] ?? null,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'logo' => $validated['logo'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'is_multilingual' => $validated['is_multilingual'] ?? false,
            'languages' => $validated['languages'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        // Auto-generate users if requested
        $generatedUsers = [];
        
        if ($request->boolean('generate_admin', true)) {
            $generatedUsers['admin'] = $this->generateProgramUser($program, 'program-admin');
        }
        
        if ($request->boolean('generate_manager', true)) {
            $generatedUsers['manager'] = $this->generateProgramUser($program, 'program-manager');
        }
        
        if ($request->boolean('generate_moderator', true)) {
            $generatedUsers['moderator'] = $this->generateProgramUser($program, 'program-moderator');
        }

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program created successfully',
            'data' => $program,
            'generated_users' => $generatedUsers,
            'note' => 'Please save all user credentials. Passwords will not be shown again.'
        ], 201);
    }

    /**
     * Generate a user for a specific program role.
     */
    private function generateProgramUser(Program $program, string $role)
    {
        $roleNames = [
            'program-admin' => 'Admin',
            'program-manager' => 'Manager',
            'program-moderator' => 'Moderator',
        ];

        $roleName = $roleNames[$role] ?? 'User';
        $generatedPassword = Str::random(12);
        $email = strtolower(str_replace(' ', '.', $program->name)) . ".{$roleName}@" . parse_url(config('app.url'), PHP_URL_HOST);
        
        // Ensure unique email
        $counter = 1;
        $originalEmail = $email;
        while (User::where('email', $email)->exists()) {
            $email = str_replace('@', $counter . '@', $originalEmail);
            $counter++;
        }

        $user = User::create([
            'id' => Str::uuid(),
            'name' => $program->name . ' ' . $roleName,
            'email' => $email,
            'password' => Hash::make($generatedPassword),
            'role' => $role,
            'program_id' => $program->id,
        ]);

        return [
            'role' => $role,
            'name' => $user->name,
            'email' => $user->email,
            'password' => $generatedPassword,
        ];
    }

    /**
     * Display the specified program.
     */
    public function show(string $id)
    {
        $program = Program::with([
            'organization', 
            'groupHead', 
            'groupHead.user',
            'activities',
            'participants'
        ])->findOrFail($id);

        // Check if expired
        $this->checkAndUpdateExpiry($program);

        return response()->json(['data' => $program]);
    }

    /**
     * Update the specified program.
     */
    public function update(Request $request, string $id)
    {
        $program = Program::findOrFail($id);

        $validated = $request->validate([
            'organization_id' => 'sometimes|required|uuid|exists:organizations,id',
            'group_head_id' => 'nullable|uuid|exists:group_heads,id',
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:programs,code,' . $id,
            'description' => 'nullable|string',
            'logo' => 'nullable|string|max:500',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'languages.*' => 'string|max:10',
            'status' => 'sometimes|in:active,inactive,expired',
        ]);

        $program->update($validated);

        // Check expiry after update
        $this->checkAndUpdateExpiry($program);

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program updated successfully',
            'data' => $program
        ]);
    }

    /**
     * Soft delete the specified program.
     */
    public function destroy(string $id)
    {
        $program = Program::findOrFail($id);
        $program->delete();

        return response()->json([
            'message' => 'Program deleted successfully'
        ]);
    }

    /**
     * Deactivate program.
     */
    public function deactivate(string $id)
    {
        $program = Program::findOrFail($id);
        $program->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Program deactivated successfully',
            'data' => $program
        ]);
    }

    /**
     * Activate program.
     */
    public function activate(string $id)
    {
        $program = Program::findOrFail($id);
        
        // Check if not expired
        if ($program->end_date && Carbon::parse($program->end_date)->isPast()) {
            return response()->json([
                'message' => 'Cannot activate expired program',
                'error' => 'Program end date has passed'
            ], 422);
        }

        $program->update(['status' => 'active']);

        return response()->json([
            'message' => 'Program activated successfully',
            'data' => $program
        ]);
    }

    /**
     * Permanently delete program.
     */
    public function forceDestroy(string $id)
    {
        $program = Program::withTrashed()->findOrFail($id);
        
        // Delete associated program users
        User::where('program_id', $program->id)->forceDelete();
        
        $program->forceDelete();

        return response()->json([
            'message' => 'Program permanently deleted'
        ]);
    }

    /**
     * Restore soft deleted program.
     */
    public function restore(string $id)
    {
        $program = Program::withTrashed()->findOrFail($id);
        $program->restore();

        // Restore associated users
        User::withTrashed()->where('program_id', $program->id)->restore();

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program restored successfully',
            'data' => $program
        ]);
    }

    /**
     * Check and update program expiry status.
     */
    private function checkAndUpdateExpiry(Program $program)
    {
        if ($program->end_date && Carbon::parse($program->end_date)->isPast() && $program->status !== 'expired') {
            $program->update(['status' => 'expired']);
        }
    }

    /**
     * Update all expired programs.
     */
    private function updateExpiredPrograms()
    {
        Program::where('status', '!=', 'expired')
            ->whereNotNull('end_date')
            ->where('end_date', '<', Carbon::now())
            ->update(['status' => 'expired']);
    }

    /**
     * Get program statistics.
     */

    public function statistics(string $id)
    {
        $program = Program::withCount(['activities', 'participants'])
            ->findOrFail($id);

        $stats = [
            'total_activities' => $program->activities_count,
            'total_participants' => $program->participants_count,
            'is_multilingual' => $program->is_multilingual,
            'languages' => $program->languages,
            'status' => $program->status,
            'days_remaining' => $program->end_date ? Carbon::now()->diffInDays(Carbon::parse($program->end_date), false) : null,
        ];

        return response()->json([
            'data' => $program,
            'statistics' => $stats
        ]);
    }

    /**
     * Get all users assigned to a specific program
     */
    public function getProgramUsers(string $programId)
    {
        try {
            $program = Program::findOrFail($programId);
            
            $users = User::where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->select('id', 'name', 'email', 'role', 'program_id', 'status', 'created_at', 'updated_at')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch program users',
                'error' => $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset password for a program user
     */
    public function resetProgramUserPassword(string $programId, string $userId)
    {
        try {
            $program = Program::findOrFail($programId);
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            $newPassword = Str::random(12);
            $user->password = Hash::make($newPassword);
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully',
                'credentials' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'password' => $newPassword,
                    'note' => 'Please save this password securely.'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a program user
     * Super admin can update any user
     * Program admin can only update users in their program
     */
    public function updateProgramUser(Request $request, string $programId, string $userId)
    {
        try {
            $authUser = $request->user();
            $program = Program::findOrFail($programId);
            
            // Authorization check
            if ($authUser->role !== 'super-admin' && $authUser->program_id !== $programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only manage users in your program.',
                ], 403);
            }
            
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            // Validate request
            $validated = $request->validate([
                'username' => 'sometimes|string|max:255',
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $userId,
                'password' => 'sometimes|string|min:8',
            ]);
            
            // Update user fields
            if (isset($validated['username'])) {
                $user->name = $validated['username'];
            }
            if (isset($validated['name'])) {
                $user->name = $validated['name'];
            }
            if (isset($validated['email'])) {
                $user->email = $validated['email'];
            }
            if (isset($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }
            
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a program user
     * Super admin can delete any user
     * Program admin can only delete users in their program
     */
    public function deleteProgramUser(Request $request, string $programId, string $userId)
    {
        try {
            $authUser = $request->user();
            $program = Program::findOrFail($programId);
            
            // Authorization check
            if ($authUser->role !== 'super-admin' && $authUser->program_id !== $programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only manage users in your program.',
                ], 403);
            }
            
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            // Prevent self-deletion
            if ($authUser->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account.',
                ], 403);
            }
            
            $user->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
