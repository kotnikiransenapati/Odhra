import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  is_anonymous: boolean;
  is_answered: boolean;
  answer_count: number;
  status: "visible" | "hidden" | "pending";
  created_at: string;
  updated_at: string;
  asker?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface ProductAnswer {
  id: string;
  question_id: string;
  user_id: string;
  answer: string;
  is_vendor: boolean;
  helpful_count: number;
  status: "visible" | "hidden" | "pending";
  created_at: string;
  updated_at: string;
  responder?: { full_name: string | null; avatar_url: string | null } | null;
}

const QKEY = (productId: string) => ["product_questions", productId] as const;
const AKEY = (questionId: string) => ["product_answers", questionId] as const;

export function useProductQuestions(productId: string | undefined) {
  return useQuery({
    queryKey: QKEY(productId ?? ""),
    enabled: !!productId,
    queryFn: async (): Promise<ProductQuestion[]> => {
      const { data, error } = await supabase
        .from("product_questions")
        .select(
          `id, product_id, user_id, question, is_anonymous, is_answered, answer_count,
           status, created_at, updated_at,
           asker:profiles!product_questions_user_id_fkey(full_name, avatar_url)`
        )
        .eq("product_id", productId!)
        .eq("status", "visible")
        .order("is_answered", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ProductQuestion[];
    },
  });
}

export function useProductAnswers(questionId: string | undefined) {
  return useQuery({
    queryKey: AKEY(questionId ?? ""),
    enabled: !!questionId,
    queryFn: async (): Promise<ProductAnswer[]> => {
      const { data, error } = await supabase
        .from("product_answers")
        .select(
          `id, question_id, user_id, answer, is_vendor, helpful_count, status,
           created_at, updated_at,
           responder:profiles!product_answers_user_id_fkey(full_name, avatar_url)`
        )
        .eq("question_id", questionId!)
        .eq("status", "visible")
        .order("is_vendor", { ascending: false })
        .order("helpful_count", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProductAnswer[];
    },
  });
}

export function useAskQuestion(productId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { question: string; is_anonymous?: boolean }) => {
      if (!user) throw new Error("Sign in to ask a question");
      const q = input.question.trim();
      if (q.length < 5) throw new Error("Question must be at least 5 characters");
      if (q.length > 500) throw new Error("Question too long (max 500)");
      const { data, error } = await supabase
        .from("product_questions")
        .insert({
          product_id: productId,
          user_id: user.id,
          question: q,
          is_anonymous: input.is_anonymous ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY(productId) });
      toast.success("Question posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePostAnswer(questionId: string, productId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (answer: string) => {
      if (!user) throw new Error("Sign in to answer");
      const a = answer.trim();
      if (a.length < 1) throw new Error("Answer cannot be empty");
      if (a.length > 1000) throw new Error("Answer too long (max 1000)");
      const { data, error } = await supabase
        .from("product_answers")
        .insert({ question_id: questionId, user_id: user.id, answer: a })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AKEY(questionId) });
      if (productId) qc.invalidateQueries({ queryKey: QKEY(productId) });
      toast.success("Answer posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteQuestion(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QKEY(productId) }),
  });
}
