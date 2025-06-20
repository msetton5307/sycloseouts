import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Search, 
  Loader2, 
  UserCog, 
  Users,
  CheckCircle,
  XCircle,
  FilterX,
  Mail,
  ShieldCheck,
  ShieldX
} from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Update user mutation
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { id: number, userData: Partial<User> }) => {
      const res = await apiRequest("PUT", `/api/users/${data.id}`, data.userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      
      setSelectedUser(null);
      
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "There was an error updating the user.",
        variant: "destructive",
      });
    }
  });
  
  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    // Filter by search term
    if (searchTerm && !`${user.firstName} ${user.lastName} ${user.email} ${user.username}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by role
    if (roleFilter !== "all" && user.role !== roleFilter) {
      return false;
    }
    
    // Filter by status (for sellers)
    if (statusFilter !== "all") {
      if (statusFilter === "approved" && (!user.isApproved || user.role !== "seller")) {
        return false;
      }
      if (statusFilter === "pending" && (user.isApproved || user.role !== "seller")) {
        return false;
      }
    }
    
    return true;
  });
  
  const handleApproveSeller = (user: User) => {
    updateUser({
      id: user.id,
      userData: {
        isApproved: true
      }
    });
  };
  
  const handleRevokeSeller = (user: User) => {
    updateUser({
      id: user.id,
      userData: {
        isApproved: false
      }
    });
  };
  
  const handleRoleChange = (userId: number, role: string) => {
    updateUser({
      id: userId,
      userData: {
        role: role as "buyer" | "seller" | "admin"
      }
    });
  };
  
  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </a>
          </Link>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              User Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage platform users and their permissions
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>All Users</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10 min-w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="buyer">Buyers</SelectItem>
                    <SelectItem value="seller">Sellers</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                
                {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={clearFilters}
                    className="h-10 w-10"
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buyer">Buyer</SelectItem>
                              <SelectItem value="seller">Seller</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.role === "seller" ? (
                            user.isApproved ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Pending
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                              className="h-8 px-2 flex items-center"
                            >
                              <UserCog className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="border rounded px-2 h-8 flex items-center text-sm"
                            >
                              Profile
                            </Link>
                            
                            {user.role === "seller" && !user.isApproved && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleApproveSeller(user)}
                                disabled={isUpdating}
                                className="h-8 px-2 flex items-center text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            
                            {user.role === "seller" && user.isApproved && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRevokeSeller(user)}
                                disabled={isUpdating}
                                className="h-8 px-2 flex items-center text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View and manage user account
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center mr-4 text-lg font-medium flex-shrink-0">
                    {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <p className="text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium">{selectedUser.company || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <div className="flex items-center mt-1">
                      <Select
                        value={selectedUser.role}
                        onValueChange={(value) => {
                          setSelectedUser({...selectedUser, role: value as "buyer" | "seller" | "admin"});
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium mt-1">
                      {selectedUser.role === "seller" ? (
                        selectedUser.isApproved ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Approved Seller
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Active {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                
                {selectedUser.role === "seller" && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Seller Settings</h4>
                    <div className="flex items-center">
                      <Checkbox
                        id="seller-approved"
                        checked={selectedUser.isApproved}
                        onCheckedChange={(checked) => {
                          setSelectedUser({...selectedUser, isApproved: !!checked});
                        }}
                      />
                      <label htmlFor="seller-approved" className="ml-2 text-sm font-medium">
                        Approved to sell on platform
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    updateUser({
                      id: selectedUser.id,
                      userData: {
                        role: selectedUser.role,
                        isApproved: selectedUser.isApproved
                      }
                    });
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </>
  );
}
