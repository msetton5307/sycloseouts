import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface SiteSettings {
  commissionRate: number;
  logo?: string | null;
}

export const DEFAULT_SERVICE_FEE_RATE = 0.035;

let serviceFeeRate = DEFAULT_SERVICE_FEE_RATE;
export function setServiceFeeRate(rate: number) {
  serviceFeeRate = rate;
}
export function getServiceFeeRate() {
  return serviceFeeRate;
}

export function useSettings() {
  return useQuery<SiteSettings>({ queryKey: ["/api/settings"] });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<SiteSettings>) =>
      apiRequest("PUT", "/api/admin/settings", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/settings"] }),
  });
}
