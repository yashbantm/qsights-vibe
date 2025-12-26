<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\GroupHeadController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\QuestionnaireController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ActivityApprovalRequestController;
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\ProgramRoleController;
use App\Http\Controllers\Api\DashboardController;

// Public Authentication Routes
Route::post('/auth/validate-email', [AuthController::class, 'validateEmail']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Password Reset Routes (Public)
Route::post('/auth/forgot-password', [App\Http\Controllers\Api\PasswordResetController::class, 'requestOTP']);
Route::post('/auth/verify-otp', [App\Http\Controllers\Api\PasswordResetController::class, 'verifyOTP']);
Route::post('/auth/reset-password', [App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword']);

// Protected Authentication Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Dashboard Routes (Super Admin only)
Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('dashboard')->group(function () {
    Route::get('/global-statistics', [DashboardController::class, 'globalStatistics']);
    Route::get('/organization-performance', [DashboardController::class, 'organizationPerformance']);
    Route::get('/subscription-metrics', [DashboardController::class, 'subscriptionMetrics']);
});

// Theme/Landing Config Routes
Route::prefix('landing-config')->group(function () {
    // Public read endpoint (for loading landing page)
    Route::get('/', function () {
        $configPath = storage_path('app/landing-config.json');
        if (file_exists($configPath)) {
            return response()->json(json_decode(file_get_contents($configPath), true));
        }
        // Return default config
        return response()->json([
            'general' => [
                'template_style' => ['value' => 'advanced']
            ]
        ]);
    });
    
    // Admin only endpoints
    Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
        Route::post('/', function (\Illuminate\Http\Request $request) {
            $configPath = storage_path('app/landing-config.json');
            file_put_contents($configPath, json_encode($request->all(), JSON_PRETTY_PRINT));
            return response()->json(['message' => 'Configuration saved successfully']);
        });
    });
});

// Organization Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users)
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);
    
    // Admin-only operations
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
        Route::patch('/organizations/{id}', [OrganizationController::class, 'update']);
        Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
        Route::post('/organizations/{id}/deactivate', [OrganizationController::class, 'deactivate']);
        Route::post('/organizations/{id}/activate', [OrganizationController::class, 'activate']);
        Route::post('/organizations/{id}/restore', [OrganizationController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/organizations/{id}/force', [OrganizationController::class, 'forceDestroy']);
    });
});

// Group Head Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users)
    Route::get('/group-heads', [GroupHeadController::class, 'index']);
    Route::get('/group-heads/{id}', [GroupHeadController::class, 'show']);
    
    // Admin-only operations (super-admin and admin can manage group heads)
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::post('/group-heads', [GroupHeadController::class, 'store']);
        Route::put('/group-heads/{id}', [GroupHeadController::class, 'update']);
        Route::patch('/group-heads/{id}', [GroupHeadController::class, 'update']);
        Route::delete('/group-heads/{id}', [GroupHeadController::class, 'destroy']);
        Route::post('/group-heads/{id}/deactivate', [GroupHeadController::class, 'deactivate']);
        Route::post('/group-heads/{id}/activate', [GroupHeadController::class, 'activate']);
        Route::post('/group-heads/{id}/reset-password', [GroupHeadController::class, 'resetPassword']);
        Route::post('/group-heads/{id}/restore', [GroupHeadController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/group-heads/{id}/force', [GroupHeadController::class, 'forceDestroy']);
    });
});

// Program Routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Public read operations (all authenticated users)
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::get('/programs/{id}', [ProgramController::class, 'show']);
    Route::get('/programs/{id}/statistics', [ProgramController::class, 'statistics']);
    Route::get('/programs/{id}/users', [ProgramController::class, 'getProgramUsers']);
    
    // Program Users Management (Super Admin and Program Admin only)
    Route::middleware(['role:super-admin,program-admin'])->group(function () {
        Route::put('/programs/{id}/users/{userId}', [ProgramController::class, 'updateProgramUser']);
        Route::patch('/programs/{id}/users/{userId}', [ProgramController::class, 'updateProgramUser']);
        Route::delete('/programs/{id}/users/{userId}', [ProgramController::class, 'deleteProgramUser']);
        Route::post('/programs/{id}/users/{userId}/reset-password', [ProgramController::class, 'resetProgramUserPassword']);
    });
    
    // Program Roles Routes (Super Admin and Program Admin only)
    Route::middleware(['role:super-admin,program-admin'])->group(function () {
        Route::get('/programs/{programId}/roles', [ProgramRoleController::class, 'index']);
        Route::get('/programs/{programId}/roles/available-activities', [ProgramRoleController::class, 'getAvailableActivities']);
        Route::get('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'show']);
        Route::post('/programs/{programId}/roles', [ProgramRoleController::class, 'store']);
        Route::put('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'update']);
        Route::patch('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'update']);
        Route::delete('/programs/{programId}/roles/{roleId}', [ProgramRoleController::class, 'destroy']);
        Route::post('/programs/{programId}/roles/{roleId}/restore', [ProgramRoleController::class, 'restore']);
    });
    
    // Admin and Group Head can manage programs
    Route::middleware(['role:super-admin,admin'])->group(function () {
        Route::post('/programs', [ProgramController::class, 'store']);
        Route::put('/programs/{id}', [ProgramController::class, 'update']);
        Route::patch('/programs/{id}', [ProgramController::class, 'update']);
        Route::delete('/programs/{id}', [ProgramController::class, 'destroy']);
        Route::post('/programs/{id}/deactivate', [ProgramController::class, 'deactivate']);
        Route::post('/programs/{id}/activate', [ProgramController::class, 'activate']);
        Route::post('/programs/{id}/restore', [ProgramController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/programs/{id}/force', [ProgramController::class, 'forceDestroy']);
    });
});

// Participant Routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Public read operations
    Route::get('/participants', [ParticipantController::class, 'index']);
    Route::get('/participants/{id}', [ParticipantController::class, 'show']);
    Route::get('/participants/template/download', [ParticipantController::class, 'downloadTemplate']);
    
    // Admin and Program roles can manage participants
    Route::middleware(['role:super-admin,admin,program-admin,program-manager'])->group(function () {
        Route::post('/participants', [ParticipantController::class, 'store']);
        Route::post('/participants/bulk-import', [ParticipantController::class, 'bulkImport']);
        Route::post('/participants/bulk-delete', [ParticipantController::class, 'bulkDelete']);
        Route::put('/participants/{id}', [ParticipantController::class, 'update']);
        Route::patch('/participants/{id}', [ParticipantController::class, 'update']);
        Route::delete('/participants/{id}', [ParticipantController::class, 'destroy']);
        Route::post('/participants/{id}/activate', [ParticipantController::class, 'activate']);
        Route::post('/participants/{id}/deactivate', [ParticipantController::class, 'deactivate']);
        Route::post('/participants/{id}/assign-programs', [ParticipantController::class, 'assignPrograms']);
        Route::post('/participants/{id}/unassign-programs', [ParticipantController::class, 'unassignPrograms']);
        Route::post('/participants/{id}/restore', [ParticipantController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/participants/{id}/force', [ParticipantController::class, 'forceDestroy']);
    });
});

// Questionnaire Routes
Route::middleware(['auth:sanctum'])->group(function () {

    
    // Public read operations
    Route::get('/questionnaires', [QuestionnaireController::class, 'index']);
    Route::get('/questionnaires/{id}', [QuestionnaireController::class, 'show']);
    
    // Admin and Program roles can manage questionnaires
    Route::middleware(['role:super-admin,admin,program-admin,program-manager'])->group(function () {
        Route::post('/questionnaires', [QuestionnaireController::class, 'store']);
        Route::put('/questionnaires/{id}', [QuestionnaireController::class, 'update']);
        Route::patch('/questionnaires/{id}', [QuestionnaireController::class, 'update']);
        Route::delete('/questionnaires/{id}', [QuestionnaireController::class, 'destroy']);
        Route::post('/questionnaires/{id}/publish', [QuestionnaireController::class, 'publish']);
        Route::post('/questionnaires/{id}/archive', [QuestionnaireController::class, 'archive']);
        Route::post('/questionnaires/{id}/duplicate', [QuestionnaireController::class, 'duplicate']);
        Route::post('/questionnaires/{id}/restore', [QuestionnaireController::class, 'restore']);
        
        // Section management
        Route::post('/questionnaires/{id}/sections', [QuestionnaireController::class, 'addSection']);
        Route::put('/questionnaires/{questionnaire}/sections/{section}', [QuestionnaireController::class, 'updateSection']);
        Route::delete('/questionnaires/{questionnaire}/sections/{section}', [QuestionnaireController::class, 'deleteSection']);
        
        // Question management
        Route::post('/questionnaires/{questionnaire}/sections/{section}/questions', [QuestionnaireController::class, 'addQuestion']);
        Route::put('/questionnaires/{questionnaire}/sections/{section}/questions/{question}', [QuestionnaireController::class, 'updateQuestion']);
        Route::delete('/questionnaires/{questionnaire}/sections/{section}/questions/{question}', [QuestionnaireController::class, 'deleteQuestion']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/questionnaires/{id}/force', [QuestionnaireController::class, 'forceDestroy']);
    });
});

// Activity Routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Activity Approval Requests
    Route::prefix('activity-approvals')->group(function () {
        Route::get('/', [ActivityApprovalRequestController::class, 'index']);
        Route::get('/statistics', [ActivityApprovalRequestController::class, 'statistics']);
        Route::get('/{id}', [ActivityApprovalRequestController::class, 'show']);
        Route::post('/', [ActivityApprovalRequestController::class, 'store'])
            ->middleware(['role:program-admin,program-manager']);
        Route::post('/{id}/review', [ActivityApprovalRequestController::class, 'review'])
            ->middleware(['role:super-admin,admin']);
    });
    
    // Public read operations
    Route::get('/activities', [ActivityController::class, 'index']);
    Route::get('/activities/statistics', [ActivityController::class, 'statistics']);
    Route::post('/activities/participant-counts', [ActivityController::class, 'getParticipantCounts']);
    Route::get('/activities/{id}/participants', [ActivityController::class, 'getParticipants']);
    Route::get('/activities/{id}', [ActivityController::class, 'show']);
    Route::get('/activities/{id}/links', [ActivityController::class, 'getActivityLinks']);
    
    // Admin and Program roles can manage activities
    Route::middleware(['role:super-admin,admin,program-admin,program-manager'])->group(function () {
        Route::post('/activities', [ActivityController::class, 'store']);
        Route::put('/activities/{id}', [ActivityController::class, 'update']);
        Route::patch('/activities/{id}', [ActivityController::class, 'update']);
        
        // Activity participant management
        Route::get('/activities/{id}/participants/available', [ActivityController::class, 'getAvailableParticipants']);
        Route::post('/activities/{id}/participants/new', [ActivityController::class, 'addNewParticipant']);
        Route::post('/activities/{id}/participants/existing', [ActivityController::class, 'addExistingParticipants']);
        Route::post('/activities/{id}/participants/import', [ActivityController::class, 'importParticipants']);
        Route::patch('/activities/{id}/participants/{participantId}', [ActivityController::class, 'updateActivityParticipant']);
        Route::delete('/activities/{id}/participants/{participantId}', [ActivityController::class, 'removeParticipant']);
        Route::patch('/participants/{participantId}/toggle-status', [ActivityController::class, 'toggleParticipantStatus']);
        
        // Landing page configuration
        Route::get('/activities/{id}/landing-config', [ActivityController::class, 'getLandingConfig']);
        Route::post('/activities/{id}/landing-config', [ActivityController::class, 'saveLandingConfig']);
        
        // Notification statistics
        Route::get('/activities/{id}/notification-stats', [ActivityController::class, 'getNotificationStats']);
        
        // Export routes
        Route::get('/activities/{id}/export', [App\Http\Controllers\Api\ExportController::class, 'exportActivityResults']);
        
        Route::delete('/activities/{id}', [ActivityController::class, 'destroy']);
        
        // Questionnaire assignment
        Route::post('/activities/{id}/assign-questionnaire', [ActivityController::class, 'assignQuestionnaire']);
        Route::delete('/activities/{id}/unassign-questionnaire', [ActivityController::class, 'unassignQuestionnaire']);
        
        // Status management
        Route::post('/activities/{id}/archive', [ActivityController::class, 'archive']);
        Route::post('/activities/{id}/activate', [ActivityController::class, 'activate']);
        Route::post('/activities/{id}/restore', [ActivityController::class, 'restore']);
    });
    
    // Super Admin only
    Route::middleware(['role:super-admin'])->group(function () {
        Route::delete('/activities/{id}/force', [ActivityController::class, 'forceDestroy']);
    });
});

// Response Submission Routes
Route::middleware('auth:sanctum')->group(function () {
    // Start/resume responses
    Route::post('/activities/{activity}/responses/start', [App\Http\Controllers\Api\ResponseController::class, 'start']);
    Route::post('/activities/{activity}/responses/resume', [App\Http\Controllers\Api\ResponseController::class, 'resume']);
    
    // Save and submit responses
    Route::post('/responses/{response}/save', [App\Http\Controllers\Api\ResponseController::class, 'saveProgress']);
    Route::post('/responses/{response}/submit', [App\Http\Controllers\Api\ResponseController::class, 'submit']);
    
    // Get progress
    Route::get('/responses/{response}/progress', [App\Http\Controllers\Api\ResponseController::class, 'getProgress']);
    
    // Admin/Moderator routes
    Route::middleware('role:super-admin,admin,program-admin,program-manager,program-moderator')->group(function () {
        Route::get('/activities/{activity}/responses', [App\Http\Controllers\Api\ResponseController::class, 'index']);
        Route::get('/activities/{activity}/responses/statistics', [App\Http\Controllers\Api\ResponseController::class, 'statistics']);
    });
});

// Report Routes
Route::middleware(['auth:sanctum'])->prefix('reports')->group(function () {
    // Activity-level reports
    Route::get('/participation/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'participationMetrics']);
    Route::get('/completion/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'completionMetrics']);
    Route::get('/responses/{activityId}', [App\Http\Controllers\Api\ReportController::class, 'drillDownResponses']);
    Route::get('/question/{activityId}/{questionId}', [App\Http\Controllers\Api\ReportController::class, 'questionAnalytics']);
    
    // Program-level reports
    Route::get('/program/{programId}', [App\Http\Controllers\Api\ReportController::class, 'programOverview']);
    
    // Export endpoints
    Route::get('/export/{activityId}/{format}', [App\Http\Controllers\Api\ReportController::class, 'exportReport'])->where('format', 'csv|excel|pdf');
    Route::get('/export/program/{programId}', [App\Http\Controllers\Api\ReportController::class, 'exportProgramReport']);
});

// Public Activity Routes (no authentication required)
Route::prefix('public')->group(function () {
    Route::get('activities/{id}', [App\Http\Controllers\Api\PublicActivityController::class, 'show']);
    Route::post('activities/{id}/register', [App\Http\Controllers\Api\PublicActivityController::class, 'registerParticipant']);
    Route::post('activities/{id}/save-progress', [App\Http\Controllers\Api\PublicActivityController::class, 'saveProgress']);
    Route::get('activities/{id}/load-progress/{participantId}', [App\Http\Controllers\Api\PublicActivityController::class, 'loadProgress']);
    Route::post('activities/{id}/submit', [App\Http\Controllers\Api\PublicActivityController::class, 'submitResponse']);
    Route::get('questionnaires/{id}', [App\Http\Controllers\Api\PublicQuestionnaireController::class, 'show']);
    Route::get('questionnaire/{id}', [App\Http\Controllers\Api\PublicQuestionnaireController::class, 'show']); // Singular alias for compatibility
    
    // Token-based access routes
    Route::get('access-tokens/{token}/validate', [App\Http\Controllers\Api\PublicActivityController::class, 'validateAccessToken']);
    Route::post('access-tokens/{token}/mark-used', [App\Http\Controllers\Api\PublicActivityController::class, 'markTokenAsUsed']);
});

// Email Notification routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/notifications/send', [App\Http\Controllers\Api\NotificationController::class, 'send']);
    Route::post('/notifications/send-bulk', [App\Http\Controllers\Api\NotificationController::class, 'sendBulk']);
    
    // New SendGrid notification routes
    Route::post('/notifications/send-emails', [App\Http\Controllers\Api\NotificationController::class, 'sendNotifications']);
    Route::get('/notifications/reports', [App\Http\Controllers\Api\NotificationController::class, 'getAllReports']);
    Route::get('/notifications/reports/{activityId}', [App\Http\Controllers\Api\NotificationController::class, 'getReports']);
    Route::get('/notifications/test', [App\Http\Controllers\Api\NotificationController::class, 'testEndpoint']);
});

// User Notifications (In-App) Routes
Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\UserNotificationController::class, 'index']);
    Route::get('/unread-count', [App\Http\Controllers\Api\UserNotificationController::class, 'unreadCount']);
    Route::post('/{id}/read', [App\Http\Controllers\Api\UserNotificationController::class, 'markAsRead']);
    Route::post('/mark-all-read', [App\Http\Controllers\Api\UserNotificationController::class, 'markAllAsRead']);
    Route::delete('/{id}', [App\Http\Controllers\Api\UserNotificationController::class, 'destroy']);
    
    // Internal/System routes for creating notifications
    Route::post('/create', [App\Http\Controllers\Api\UserNotificationController::class, 'store']);
    Route::post('/bulk-create', [App\Http\Controllers\Api\UserNotificationController::class, 'bulkStore']);
});

// Notification Template Management Routes
Route::middleware(['auth:sanctum'])->prefix('activities/{activityId}/notification-templates')->group(function () {
    // List all templates for an activity
    Route::get('/', [App\Http\Controllers\Api\NotificationTemplateController::class, 'index']);
    
    // Get template by notification type
    Route::get('/type/{type}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getByType']);
    
    // Create or update template
    Route::post('/', [App\Http\Controllers\Api\NotificationTemplateController::class, 'store']);
    
    // Get specific template
    Route::get('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'show']);
    
    // Update specific template
    Route::put('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'update']);
    
    // Delete template (revert to default)
    Route::delete('/{templateId}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'destroy']);
    
    // Reset template to default
    Route::post('/reset/{type}', [App\Http\Controllers\Api\NotificationTemplateController::class, 'resetToDefault']);
    
    // Preview template with sample data
    Route::post('/preview', [App\Http\Controllers\Api\NotificationTemplateController::class, 'preview']);
    
    // Bulk create default templates
    Route::post('/create-defaults', [App\Http\Controllers\Api\NotificationTemplateController::class, 'createDefaults']);
});

// Notification template utilities
Route::middleware(['auth:sanctum'])->prefix('notification-templates')->group(function () {
    Route::get('/types', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getNotificationTypes']);
    Route::get('/placeholders', [App\Http\Controllers\Api\NotificationTemplateController::class, 'getPlaceholders']);
});

// Profile and Account Management Routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/profile/update', [ProfileController::class, 'update']);
    Route::post('/account/change-password', [ProfileController::class, 'changePassword']);
    Route::put('/account/preferences', [ProfileController::class, 'updatePreferences']);
});

// App Settings Routes
Route::prefix('app-settings')->group(function () {
    // Public endpoint for getting app settings
    Route::get('/', [\App\Http\Controllers\Api\AppSettingsController::class, 'get']);
    
    // Protected endpoint for updating app settings - accessible to authenticated users
    Route::put('/', [\App\Http\Controllers\Api\AppSettingsController::class, 'update'])->middleware('auth:sanctum');
});

// CMS Content Routes
Route::prefix('cms')->group(function () {
    // Public endpoints (no auth required for reading CMS content)
    Route::get('/content', [App\Http\Controllers\Api\CmsContentController::class, 'index']);
    Route::get('/content/{pageKey}', [App\Http\Controllers\Api\CmsContentController::class, 'show']);
    
    // Admin only endpoints (Super Admin and Admin)
    Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(function () {
        Route::put('/content/{pageKey}', [App\Http\Controllers\Api\CmsContentController::class, 'update']);
        Route::post('/content/bulk', [App\Http\Controllers\Api\CmsContentController::class, 'bulkUpdate']);
    });
});

// Theme Settings Routes
Route::prefix('theme')->group(function () {
    // Public endpoints (no auth required for reading theme settings)
    Route::get('/settings', [App\Http\Controllers\Api\ThemeSettingController::class, 'index']);
    Route::get('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'show']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::put('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'update']);
        Route::post('/settings/bulk', [App\Http\Controllers\Api\ThemeSettingController::class, 'bulkUpdate']);
        Route::post('/upload', [App\Http\Controllers\Api\ThemeSettingController::class, 'uploadImage']);
        Route::delete('/settings/{key}', [App\Http\Controllers\Api\ThemeSettingController::class, 'destroy']);
    });
});

// Landing Pages Routes
Route::prefix('landing-pages')->group(function () {
    // Public endpoints (no auth required for viewing landing pages)
    Route::get('/', [App\Http\Controllers\Api\LandingPageController::class, 'index']);
    Route::get('/{slug}', [App\Http\Controllers\Api\LandingPageController::class, 'show']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::post('/', [App\Http\Controllers\Api\LandingPageController::class, 'store']);
        Route::put('/{id}', [App\Http\Controllers\Api\LandingPageController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\Api\LandingPageController::class, 'destroy']);
        
        // Section management
        Route::post('/{pageId}/sections', [App\Http\Controllers\Api\LandingPageController::class, 'addSection']);
        Route::put('/{pageId}/sections/{sectionId}', [App\Http\Controllers\Api\LandingPageController::class, 'updateSection']);
        Route::delete('/{pageId}/sections/{sectionId}', [App\Http\Controllers\Api\LandingPageController::class, 'deleteSection']);
    });
});

// Demo Request Routes
Route::prefix('demo-requests')->group(function () {
    // Public endpoint (no auth required for submitting demo request)
    Route::post('/', [App\Http\Controllers\Api\DemoRequestController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\DemoRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\DemoRequestController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\DemoRequestController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\DemoRequestController::class, 'destroy']);
    });
});

// Contact Sales Routes
Route::prefix('contact-sales')->group(function () {
    // Public endpoint (no auth required for submitting contact sales request)
    Route::post('/', [App\Http\Controllers\Api\ContactSalesController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\ContactSalesController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\ContactSalesController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\ContactSalesController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\ContactSalesController::class, 'destroy']);
    });
});

// Contact Us Routes
Route::prefix('contact-requests')->group(function () {
    // Public endpoint (no auth required for submitting contact request)
    Route::post('/', [App\Http\Controllers\Api\ContactRequestController::class, 'store']);
    
    // Admin only endpoints (Super Admin only)
    Route::middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/', [App\Http\Controllers\Api\ContactRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\ContactRequestController::class, 'show']);
        Route::patch('/{id}/status', [App\Http\Controllers\Api\ContactRequestController::class, 'updateStatus']);
        Route::delete('/{id}', [App\Http\Controllers\Api\ContactRequestController::class, 'destroy']);
    });
});
