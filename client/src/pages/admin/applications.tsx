import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SellerApplication, User } from "@shared/schema";
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
  CheckCircle,
  XCircle,
  FilterX,
  Calendar,
  ClipboardList,
  Building,
  FileCheck,
  Info
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminApplications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  
  // Fetch all seller applications
  const { data: applications = [], isLoading: isLoadingApplications } = useQuery<SellerApplication[]>({
    queryKey: ["/api/seller-applications"],
  });
  
  // Fetch all users (for reference)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const isLoading = isLoadingApplications || isLoadingUsers;
  
  // Update application status mutation
  const { mutate: updateApplicationStatus, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { id: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/seller-applications/${data.id}`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Updated",
        description: "The seller application status has been updated.",
      });
      
      setSelectedApplication(null);
      
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/seller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "There was an error updating the application.",
        variant: "destructive",
      });
    }
  });
  
  // Filter applications based on search and filter
  const filteredApplications = applications.filter(app => {
    // Filter by search term
    if (searchTerm && !`${app.companyName} ${app.contactEmail} ${app.contactPhone}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== "all" && app.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  // Get user for an application
  const getUserForApplication = (userId: number) => {
    return users.find(user => user.id === userId);
  };
  
  const handleApprove = (application: SellerApplication) => {
    updateApplicationStatus({
      id: application.id,
      status: "approved"
    });
  };
  
  const handleReject = (application: SellerApplication) => {
    updateApplicationStatus({
      id: application.id,
      status: "rejected"
    });
  };
  
  const clearFilters = () => {
    setSearchTerm("");
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
              Seller Applications
            </h1>
            <p className="text-gray-500 mt-1">
              Review and manage seller applications
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>All Applications</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search applications..."
                    className="pl-10 min-w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                {(searchTerm || statusFilter !== "all") && (
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
            ) : filteredApplications.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Inventory Type</TableHead>
                      <TableHead>Years in Business</TableHead>
                      <TableHead>Date Applied</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => {
                      const applicant = getUserForApplication(application.userId);
                      
                      return (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div className="font-medium">{application.companyName}</div>
                            {applicant && (
                              <div className="text-sm text-gray-500">
                                by {applicant.firstName} {applicant.lastName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{application.contactEmail}</div>
                            <div className="text-sm text-gray-500">{application.contactPhone}</div>
                          </TableCell>
                          <TableCell>{application.inventoryType}</TableCell>
                          <TableCell>{application.yearsInBusiness}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{formatDate(application.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {application.status === "pending" ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Pending
                              </Badge>
                            ) : application.status === "approved" ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setSelectedApplication(application)}
                                className="h-8 px-2 flex items-center"
                              >
                                <Info className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                              
                              {application.status === "pending" && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleApprove(application)}
                                    disabled={isUpdating}
                                    className="h-8 px-2 flex items-center text-green-600 border-green-200 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleReject(application)}
                                    disabled={isUpdating}
                                    className="h-8 px-2 flex items-center text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No applications found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Application Details Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review seller application information
              </DialogDescription>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-primary text-white rounded-full flex items-center justify-center mr-4">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedApplication.companyName}</h3>
                    <p className="text-gray-500">
                      {selectedApplication.status === "pending" ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Pending Review
                        </Badge>
                      ) : selectedApplication.status === "approved" ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Rejected
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Contact Email</p>
                    <p className="font-medium">{selectedApplication.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact Phone</p>
                    <p className="font-medium">{selectedApplication.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Inventory Type</p>
                    <p className="font-medium">{selectedApplication.inventoryType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Years in Business</p>
                    <p className="font-medium">{selectedApplication.yearsInBusiness}</p>
                  </div>
                  {selectedApplication.website && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Website</p>
                      <p className="font-medium">
                        <a 
                          href={selectedApplication.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selectedApplication.website}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedApplication.additionalInfo && (
                  <div>
                    <p className="text-sm text-gray-500">Additional Information</p>
                    <p className="mt-1 text-gray-900 p-3 bg-gray-50 rounded-md">
                      {selectedApplication.additionalInfo}
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Application Date</p>
                  <p className="font-medium">{formatDate(selectedApplication.createdAt)}</p>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <div>
                {selectedApplication?.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 mr-2"
                      onClick={() => {
                        if (selectedApplication) {
                          handleReject(selectedApplication);
                        }
                      }}
                      disabled={isUpdating}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        if (selectedApplication) {
                          handleApprove(selectedApplication);
                        }
                      }}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </>
  );
}
