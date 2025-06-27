import { useState, useEffect } from "react";
import { Order } from "@shared/schema";
import { 
  Calendar, 
  Package, 
  Truck, 
  Home,
  CheckCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface OrderStatusProps {
  order: Order;
}

export default function OrderStatus({ order }: OrderStatusProps) {
  const [currentStatus, setCurrentStatus] = useState(0);
  
  const statuses = [
    { name: "Awaiting Wire", icon: Calendar, color: "bg-yellow-500", date: order.createdAt },
    { name: "Ordered", icon: Calendar, color: "bg-primary", date: order.createdAt },
    { name: "Shipped", icon: Package, color: "bg-blue-500", date: order.status === "shipped" || order.status === "out_for_delivery" || order.status === "delivered" ? new Date(new Date(order.createdAt).getTime() + 1 * 24 * 60 * 60 * 1000) : null },
    { name: "Out for Delivery", icon: Truck, color: "bg-purple-500", date: order.status === "out_for_delivery" || order.status === "delivered" ? new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000) : null },
    { name: "Delivered", icon: Home, color: "bg-green-500", date: order.status === "delivered" ? new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000) : null },
  ];
  
  useEffect(() => {
    // Map order status to index
    const statusMap: Record<string, number> = {
      awaiting_wire: 0,
      ordered: 1,
      shipped: 2,
      out_for_delivery: 3,
      delivered: 4,
    };

    setCurrentStatus(statusMap[order.status] ?? 0);
  }, [order.status]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Order Status</h3>
        {order.estimatedDeliveryDate && (
          <div className="text-sm text-gray-500 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
            Estimated Delivery: {formatDate(order.estimatedDeliveryDate)}
          </div>
        )}
      </div>
      
      <div className="relative">
        {/* Progress Bar */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStatus / (statuses.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Status Points */}
        <div className="flex justify-between relative">
          {statuses.map((status, index) => {
            const StatusIcon = status.icon;
            const isActive = index <= currentStatus;
            
            return (
              <div key={status.name} className="flex flex-col items-center relative z-10">
                <div className={`${isActive ? status.color : 'bg-gray-300'} w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors duration-300`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <p className={`mt-2 text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {status.name}
                </p>
                {status.date && (
                  <p className="text-xs text-gray-500">
                    {formatDate(status.date)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {order.trackingNumber && (
        <div className="mt-4 text-sm">
          <span className="font-medium">Tracking Number:</span> {order.trackingNumber}
        </div>
      )}
    </div>
  );
}
