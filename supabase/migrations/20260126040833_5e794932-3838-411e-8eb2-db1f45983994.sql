-- Phase 4: Customer Engagement

-- 4.1 Live Chat System
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'assigned', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_conversations_customer ON public.chat_conversations(customer_id);
CREATE INDEX idx_chat_conversations_agent ON public.chat_conversations(assigned_agent_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.chat_conversations FOR SELECT
TO authenticated
USING (customer_id = auth.uid() OR assigned_agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own conversations"
ON public.chat_conversations FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Agents can update assigned conversations"
ON public.chat_conversations FOR UPDATE
TO authenticated
USING (assigned_agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL, -- 'customer', 'agent', 'bot'
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE customer_id = auth.uid() OR assigned_agent_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can send messages to their conversations"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE customer_id = auth.uid() OR assigned_agent_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- 4.2 Product Waitlist
CREATE TABLE public.product_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_waitlist_product ON public.product_waitlist(product_id);
CREATE INDEX idx_waitlist_user ON public.product_waitlist(user_id);

ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own waitlist entries"
ON public.product_waitlist FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all waitlist entries"
ON public.product_waitlist FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4.3 Social Sharing & Wishlists Sharing
CREATE TABLE public.shared_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_code TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'My Wishlist',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shared_wishlists_user ON public.shared_wishlists(user_id);
CREATE INDEX idx_shared_wishlists_code ON public.shared_wishlists(share_code);

ALTER TABLE public.shared_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their shared wishlists"
ON public.shared_wishlists FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view public wishlists"
ON public.shared_wishlists FOR SELECT
USING (is_public = true);

-- 4.4 Customer Stories / User Generated Content
CREATE TABLE public.customer_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_stories_user ON public.customer_stories(user_id);
CREATE INDEX idx_customer_stories_product ON public.customer_stories(product_id);
CREATE INDEX idx_customer_stories_featured ON public.customer_stories(is_featured) WHERE is_featured = true;

ALTER TABLE public.customer_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stories"
ON public.customer_stories FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view approved stories"
ON public.customer_stories FOR SELECT
USING (is_approved = true);

CREATE POLICY "Admins can manage all stories"
ON public.customer_stories FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Story likes
CREATE TABLE public.story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.customer_stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can like stories"
ON public.story_likes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Triggers
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shared_wishlists_updated_at
  BEFORE UPDATE ON public.shared_wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_stories_updated_at
  BEFORE UPDATE ON public.customer_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();