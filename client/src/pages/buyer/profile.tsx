import { useQuery } from "@tanstack/react-query";
import { Address, Order } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { EditProfileDialog } from "@/components/account/edit-profile-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

export default function BuyerProfilePage() {
  const { user } = useAuth();

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });


  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-6">Profile</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <h3 className="text-xl font-semibold mb-1">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-gray-500 mb-4">{user?.email}</p>

                <EditProfileDialog>
                  <Button className="w-full mb-2">Edit Profile</Button>
                </EditProfileDialog>
                <ChangePasswordDialog>
                  <Button variant="outline" className="w-full">Change Password</Button>
                </ChangePasswordDialog>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Username</h4>
                  <p className="mt-1">{user?.username}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email Address</h4>
                  <p className="mt-1">{user?.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Company</h4>
                  <p className="mt-1">{user?.company || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Account Type</h4>
                  <p className="mt-1 capitalize">{user?.role}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Member Since</h4>
                  <p className="mt-1">{user?.createdAt ? formatDate(user.createdAt) : "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Saved Addresses</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {addresses.length === 0 ? (
                <p className="text-sm text-gray-500">No saved addresses</p>
              ) : (
                <RadioGroup className="space-y-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="flex items-start space-x-2 border rounded-md p-4">
                      <RadioGroupItem value={String(addr.id)} id={`addr-${addr.id}`} />
                      <label htmlFor={`addr-${addr.id}`} className="text-sm leading-none cursor-pointer">
                        {addr.name} - {addr.address}, {addr.city}, {addr.state} {addr.zipCode}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              <Button variant="outline" className="mt-4">Add New Address</Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loadingOrders ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex justify-between items-center border rounded-md p-4">
                      <div>
                        <h4 className="font-medium">Order #{order.code}</h4>
                        <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {orders.length > 0 && (
                <Link href="/buyer/orders">
                  <Button variant="outline" className="mt-4 w-full">View All Orders</Button>
                </Link>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </>
  );
}
