import { useQuery } from "@tanstack/react-query";
import { Address, PaymentMethod } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { EditProfileDialog } from "@/components/account/edit-profile-dialog";
import { formatDate } from "@/lib/utils";

export default function BuyerProfilePage() {
  const { user } = useAuth();

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
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
                  <AvatarImage src={user?.avatarUrl || "https://github.com/shadcn.png"} alt={user?.username} />
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
                        {addr.name} - {addr.address}, {addr.city}
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
              <CardTitle>Saved Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-gray-500">No saved payment methods</p>
              ) : (
                <RadioGroup className="space-y-4">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-start space-x-2 border rounded-md p-4">
                      <RadioGroupItem value={String(pm.id)} id={`pm-${pm.id}`} />
                      <label htmlFor={`pm-${pm.id}`} className="text-sm leading-none cursor-pointer">
                        {pm.brand} ending in {pm.cardLast4}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              <Button variant="outline" className="mt-4">Add New Payment Method</Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
