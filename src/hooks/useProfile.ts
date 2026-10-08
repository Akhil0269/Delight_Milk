import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_blocked: boolean | null;
  blocked_at: string | null;
  blocked_by: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery<Profile | null, Error>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "full_name" | "phone" | "address" | "avatar_url">>) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Whitelist only editable profile fields to prevent unauthorized mutations
      const safeUpdates: Partial<Pick<Profile, "full_name" | "phone" | "address" | "avatar_url">> = {};
      if (updates.full_name !== undefined) safeUpdates.full_name = updates.full_name;
      if (updates.phone !== undefined) safeUpdates.phone = updates.phone;
      if (updates.address !== undefined) safeUpdates.address = updates.address;
      if (updates.avatar_url !== undefined) safeUpdates.avatar_url = updates.avatar_url;

      const { data, error } = await supabase
        .from("profiles")
        .update(safeUpdates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
