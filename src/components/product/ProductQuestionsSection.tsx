import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleQuestion, ShieldCheck, ChevronDown, Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProductQuestions,
  useProductAnswers,
  useAskQuestion,
  usePostAnswer,
  type ProductQuestion,
} from "@/hooks/useProductQA";
import { haptic } from "@/lib/haptics";

interface Props {
  productId: string;
}

export function ProductQuestionsSection({ productId }: Props) {
  const { user } = useAuth();
  const { data: questions, isLoading } = useProductQuestions(productId);
  const ask = useAskQuestion(productId);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    haptic("light");
    await ask.mutateAsync({ question: text, is_anonymous: anonymous });
    setText("");
    setAnonymous(false);
    setShowForm(false);
  };

  return (
    <section className="space-y-4" aria-label="Customer questions and answers">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-lg">Customer Q&amp;A</h3>
          {questions && questions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {questions.length}
            </Badge>
          )}
        </div>
        {user ? (
          <Button
            size="sm"
            variant={showForm ? "ghost" : "outline"}
            onClick={() => {
              haptic("selection");
              setShowForm((s) => !s);
            }}
          >
            {showForm ? "Cancel" : "Ask a question"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
              Sign in to ask
            </Link>
          </Button>
        )}
      </header>

      <AnimatePresence initial={false}>
        {showForm && user && (
          <motion.form
            key="ask-form"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="rounded-xl border border-border/50 p-3 space-y-3 bg-card"
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="e.g. Does this run true to size?"
              rows={3}
              className="resize-none"
              aria-label="Your question"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="flex items-center gap-2 text-xs cursor-pointer">
                <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                Ask anonymously
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {text.length}/500
                </span>
                <Button type="submit" size="sm" disabled={ask.isPending || text.trim().length < 5}>
                  {ask.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : !questions || questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions yet. Be the first to ask about this product.
        </p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <QuestionItem key={q.id} q={q} productId={productId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuestionItem({ q, productId }: { q: ProductQuestion; productId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const { data: answers, isLoading } = useProductAnswers(expanded ? q.id : undefined);
  const postAnswer = usePostAnswer(q.id, productId);
  const [replyText, setReplyText] = useState("");

  const askerName = q.is_anonymous
    ? "Anonymous shopper"
    : q.asker?.full_name?.trim() || "Shopper";

  const submitAnswer = async () => {
    if (!replyText.trim()) return;
    haptic("light");
    await postAnswer.mutateAsync(replyText);
    setReplyText("");
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 p-3"
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent"
          aria-hidden
        >
          Q
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium whitespace-pre-wrap">{q.question}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {askerName} · {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("selection");
          setExpanded((s) => !s);
        }}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        aria-expanded={expanded}
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
        {q.answer_count > 0
          ? `${q.answer_count} answer${q.answer_count > 1 ? "s" : ""}`
          : "Be the first to answer"}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 pl-8">
              {isLoading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : answers && answers.length > 0 ? (
                answers.map((a) => (
                  <div key={a.id} className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-sm whitespace-pre-wrap">{a.answer}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      {a.is_vendor && (
                        <Badge className="h-4 px-1.5 text-[10px] gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> Seller
                        </Badge>
                      )}
                      <span>{a.responder?.full_name?.trim() || "Shopper"}</span>
                      <span>· {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No answers yet.</p>
              )}

              {user ? (
                <form
                  className="flex gap-2 pt-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitAnswer();
                  }}
                >
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
                    placeholder="Share what you know…"
                    rows={2}
                    className="resize-none text-sm"
                    aria-label="Your answer"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={postAnswer.isPending || !replyText.trim()}
                    aria-label="Post answer"
                  >
                    {postAnswer.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              ) : (
                <p className="text-[11px] text-muted-foreground pt-1">
                  <Link
                    to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="underline"
                  >
                    Sign in
                  </Link>{" "}
                  to answer.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
