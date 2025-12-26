"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgramAdminLayout from "@/components/program-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Filter, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL } from "@/lib/api";

// Predefined list of services
const AVAILABLE_SERVICES = [
  { id: "dashboard", name: "Dashboard", category: "Overview" },
  { id: "list_organization", name: "List Organizations", category: "Organizations" },
  { id: "add_organization", name: "Add Organization", category: "Organizations" },
  { id: "edit_organization", name: "Edit Organization", category: "Organizations" },
  { id: "list_programs", name: "List Programs", category: "Programs" },
  { id: "add_programs", name: "Add Programs", category: "Programs" },
  { id: "edit_programs", name: "Edit Programs", category: "Programs" },
  { id: "list_activity", name: "List Activities", category: "Activities" },
  { id: "activity_add", name: "Add Activity", category: "Activities" },
  { id: "add_participants", name: "Add Participants", category: "Participants" },
  { id: "list_participants", name: "List Participants", category: "Participants" },
  { id: "view_report", name: "View Reports", category: "Reports" },
];

interface Role {
  id: string;
  role_name: string;
  username: string;
  email: string;
  program_id: string;
  created_at: string;
  program?: {
    id: string;
    name: string;
  };
}

interface ProgramOption {
  id: string;
  name: string;
}

function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"program-users" | "system-roles">("program-users");
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [programId, setProgramId] = useState<string>("");
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("all");
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [createFormProgramId, setCreateFormProgramId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  // Fetch roles on mount and when tab changes
  useEffect(() => {
    checkUserRole();
    loadPrograms();
    loadRoles();
  }, [activeTab]);

  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        
        // If not super-admin and trying to access system-roles, redirect to program-users
        if (data.user.role !== 'super-admin' && activeTab === 'system-roles') {
          setActiveTab('program-users');
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  // Handle query parameters
  useEffect(() => {
    const programIdFromQuery = searchParams.get('programId');
    if (programIdFromQuery) {
      setSelectedProgramFilter(programIdFromQuery);
    }
  }, [searchParams]);

  // Filter roles when program filter changes
  useEffect(() => {
    if (selectedProgramFilter === "all") {
      setRoles(allRoles);
    } else {
      setRoles(allRoles.filter(role => role.program_id === selectedProgramFilter));
    }
  }, [selectedProgramFilter, allRoles]);

  const getAuthHeaders = () => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('backendToken='));
    if (!tokenCookie) {
      throw new Error('Not authenticated');
    }
    const token = decodeURIComponent(tokenCookie.split('=')[1]);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  };

  const getProgramId = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return user?.programId || 'a0a77496-0fc0-4627-ba5b-9a1ea026623f';
  };

  const loadPrograms = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/programs`, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Programs data:', data);
        // Handle both array and object with programs property
        const programsList = Array.isArray(data) ? data : (data.programs || data.data || []);
        console.log('Programs list:', programsList);
        setPrograms(programsList);
      } else {
        console.error('Failed to load programs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const headers = getAuthHeaders();
      
      // Fetch all programs first to get roles from each
      const programsResponse = await fetch(`${API_URL}/programs`, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response for roles:', programsResponse.status);

      if (!programsResponse.ok) {
        throw new Error('Failed to fetch programs');
      }

      const programsData = await programsResponse.json();
      console.log('Programs data for roles:', programsData);
      
      // Handle both array and object with programs property
      const allPrograms = Array.isArray(programsData) ? programsData : (programsData.programs || programsData.data || []);
      console.log('All programs:', allPrograms);

      // Fetch roles from each program based on active tab
      const rolesPromises = allPrograms.map(async (prog: ProgramOption) => {
        try {
          console.log(`Fetching roles for program: ${prog.id}`);
          // Use /users endpoint for Program Users tab, /roles for System Roles tab
          const endpoint = activeTab === 'program-users' ? 'users' : 'roles';
          const rolesResponse = await fetch(`${API_URL}/programs/${prog.id}/${endpoint}`, {
            headers,
            credentials: 'include',
          });

          console.log(`${endpoint} response for ${prog.id}:`, rolesResponse.status);

          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            console.log(`${endpoint} data for ${prog.id}:`, rolesData);
            // Handle both array response and object with roles/data/users property
            const rolesList = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || rolesData.users || []);
            return rolesList.map((role: any) => ({
              id: role.id,
              role_name: role.role || role.role_name || 'User',
              username: role.username || role.name,
              email: role.email,
              program_id: prog.id,
              created_at: role.created_at,
              program: { id: prog.id, name: prog.name }
            }));
          }
          return [];
        } catch (error) {
          console.error(`Error loading roles for program ${prog.id}:`, error);
          return [];
        }
      });

      const rolesArrays = await Promise.all(rolesPromises);
      const allRolesData = rolesArrays.flat();
      
      console.log('All roles loaded:', allRolesData);
      setAllRoles(allRolesData);
      setRoles(allRolesData);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      if (error.message === 'Not authenticated') {
        window.location.href = '/';
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleAutoGeneratePassword = (isEdit = false) => {
    const newPassword = generatePassword();
    if (isEdit) {
      setEditPassword(newPassword);
    } else {
      setPassword(newPassword);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setEditUsername(role.username);
    setEditEmail(role.email);
    setEditPassword(""); // Don't show actual password
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const updateData: any = {
        username: editUsername,
        email: editEmail,
      };

      // Only include password if it's been changed
      if (editPassword) {
        updateData.password = editPassword;
      }

      const endpoint = activeTab === 'program-users' ? 'users' : 'roles';
      const response = await fetch(
        `${API_URL}/programs/${editingRole.program_id}/${endpoint}/${editingRole.id}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update role' }));
        
        // Handle validation errors with specific field messages
        if (error.errors) {
          const errorMessages = Object.entries(error.errors)
            .map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${messageArray.join(', ')}`;
            })
            .join('\n');
          
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "error"
          });
          setLoading(false);
          return;
        }
        
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Role updated successfully!",
        variant: "success"
      });
      setShowEditModal(false);
      setEditingRole(null);
      loadRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: `Failed to update role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (role: Role) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const endpoint = activeTab === 'program-users' ? 'users' : 'roles';
      const response = await fetch(
        `${API_URL}/programs/${roleToDelete.program_id}/${endpoint}/${roleToDelete.id}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete role' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Role deleted successfully!",
        variant: "success"
      });
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: `Failed to delete role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedRoleIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select roles to delete",
        variant: "warning"
      });
      return;
    }
    setBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRoleIds.length === 0) return;
    
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const endpoint = activeTab === 'program-users' ? 'users' : 'roles';

      // Delete each role individually
      const deletePromises = selectedRoleIds.map(async (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;
        
        const response = await fetch(
          `${API_URL}/programs/${role.program_id}/${endpoint}/${roleId}`,
          {
            method: 'DELETE',
            headers,
            credentials: 'include',
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to delete role ${role.role_name}`);
        }
      });

      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: `${selectedRoleIds.length} role(s) deleted successfully!`,
        variant: "success"
      });
      
      setSelectedRoleIds([]);
      setBulkDeleteModal(false);
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting roles:', error);
      toast({
        title: "Error",
        description: `Failed to delete roles: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRoleIds.length === roles.length) {
      setSelectedRoleIds([]);
    } else {
      setSelectedRoleIds(roles.map(r => r.id));
    }
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleName || !username || !email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "warning"
      });
      return;
    }

    if (selectedServices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one service",
        variant: "warning"
      });
      return;
    }

    setLoading(true);

    try {
      const headers = getAuthHeaders();
      // Use selected program from dropdown, or default to user's program if not selected (system-wide)
      const progId = createFormProgramId || getProgramId();

      // Create role (program user or system-wide)
      const endpoint = activeTab === 'program-users' ? 'users' : 'roles';
      const response = await fetch(`${API_URL}/programs/${progId}/${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          role_name: roleName,
          username: username,
          email: email,
          password: password,
          service_ids: selectedServices,
          event_ids: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create role' }));
        
        // Handle validation errors with specific field messages
        if (error.errors) {
          const errorMessages = Object.entries(error.errors)
            .map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${messageArray.join(', ')}`;
            })
            .join('\n');
          
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "error"
          });
          setLoading(false);
          return;
        }
        
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: `Role created successfully! Login credentials:\nEmail: ${email}\nPassword: ${password}`,
        variant: "success"
      });
      
      // Reset form
      setRoleName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSelectedServices([]);
      setCreateFormProgramId("");
      setShowForm(false);
      
      // Reload roles list
      loadRoles();
      
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: `Failed to create role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group services by category
  const servicesByCategory = AVAILABLE_SERVICES.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_SERVICES>);

  return (
    <ProgramAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Services</h1>
            <p className="text-gray-600 mt-1">
              {searchParams.get('programName') 
                ? `Manage roles for ${decodeURIComponent(searchParams.get('programName')!)}`
                : 'Create and manage custom roles with specific permissions'
              }
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Role
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('program-users');
                setShowForm(false);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'program-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Program Users
            </button>
            {currentUser?.role === 'super-admin' && (
              <button
                onClick={() => {
                  setActiveTab('system-roles');
                  setShowForm(false);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'system-roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Roles
              </button>
            )}
          </nav>
        </div>

        {/* Info Banner */}
        {!showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Roles Management</h3>
                <p className="text-sm text-blue-800">
                  Create custom roles with specific permissions for your organization. Assign program-specific access or create system-wide roles for administrators.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Program Filter - Only show for Program Users tab */}
        {!showForm && activeTab === 'program-users' && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium">Filter by Program:</Label>
            </div>
            <select 
              value={selectedProgramFilter} 
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="flex h-10 w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Programs</option>
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
            {selectedProgramFilter !== "all" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProgramFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        )}

        {/* Roles List Table */}
        {!showForm && (
          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Existing Roles</CardTitle>
                  {selectedRoleIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteClick}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedRoleIds.length})
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="text-center py-8 text-gray-500">Loading roles...</div>
              ) : roles.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roles Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Click "Create New Role" above to create your first custom role
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.length === roles.length && roles.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </TableHead>
                        <TableHead>Role Title</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Programs</TableHead>
                        <TableHead>Created On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={() => handleSelectRole(role.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{role.role_name}</TableCell>
                          <TableCell>{role.username}</TableCell>
                          <TableCell>
                            {role.program?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(role.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="relative flex justify-end">
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  if (showActionMenu === role.id) {
                                    setShowActionMenu(null);
                                    setActionMenuPosition(null);
                                  } else {
                                    setShowActionMenu(role.id);
                                    
                                    // Calculate dropdown height (approximate based on menu items)
                                    const dropdownHeight = 240;
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    
                                    // Position above if not enough space below
                                    const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
                                    
                                    setActionMenuPosition({
                                      top: shouldPositionAbove 
                                        ? rect.top + window.scrollY - dropdownHeight - 8
                                        : rect.bottom + window.scrollY + 8,
                                      right: window.innerWidth - rect.right + window.scrollX
                                    });
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                              </button>
                              {showActionMenu === role.id && actionMenuPosition && (
                                <>
                                  {/* Backdrop */}
                                  <div 
                                    className="fixed inset-0 z-[99998]" 
                                    onClick={() => {
                                      setShowActionMenu(null);
                                      setActionMenuPosition(null);
                                    }}
                                    style={{ position: 'fixed', zIndex: 99998 }}
                                  />
                                  
                                  {/* Menu Panel */}
                                  <div 
                                    className="w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
                                    style={{
                                      position: 'fixed',
                                      zIndex: 99999,
                                      top: `${actionMenuPosition.top}px`,
                                      right: `${actionMenuPosition.right}px`
                                    }}
                                  >
                                    <button 
                                      onClick={() => {
                                        setShowActionMenu(null);
                                        setActionMenuPosition(null);
                                        handleEdit(role);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setShowActionMenu(null);
                                        setActionMenuPosition(null);
                                        handleDelete(role);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roleName">Role Name *</Label>
                    <Input
                      id="roleName"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g., Program Manager"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., program.manager"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="program">Program (Optional)</Label>
                    <select
                      id="program"
                      value={createFormProgramId}
                      onChange={(e) => setCreateFormProgramId(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">System-wide (All Programs)</option>
                      {programs.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank for system-wide access
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAutoGeneratePassword(false)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Services Selection */}
                <div>
                  <Label className="text-lg font-semibold">
                    Select Services ({selectedServices.length} selected)
                  </Label>
                  <div className="mt-4 space-y-6">
                    {Object.entries(servicesByCategory).map(([category, services]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {services.map((service) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={service.id}
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => handleServiceToggle(service.id)}
                              />
                              <Label
                                htmlFor={service.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {service.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Edit Role Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role: {editingRole?.role_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Communication Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAutoGeneratePassword(true)}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to keep the current password
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={loading}>
                {loading ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setRoleToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Role"
          message={`Are you sure you want to delete the role "${roleToDelete?.role_name}"? This action cannot be undone.`}
        />

        {/* Bulk Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={bulkDeleteModal}
          onClose={() => setBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          title="Delete Multiple Roles"
          message={`Are you sure you want to delete ${selectedRoleIds.length} role(s)? This action cannot be undone.`}
        />
      </div>
    </ProgramAdminLayout>
  );
}

function RolesPageContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-lg">Loading...</div></div>}>
      <RolesPage />
    </Suspense>
  );
}

export default RolesPageContent;
