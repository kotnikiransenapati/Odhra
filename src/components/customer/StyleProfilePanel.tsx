import { useEffect, useState } from "react";
import { Shirt, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStyleProfile, useSaveStyleProfile, type StyleProfileInput } from "@/hooks/useStyleProfile";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const FIT_OPTIONS = ["slim", "regular", "loose"] as const;
const COLOR_SUGGESTIONS = ["Black", "White", "Beige", "Navy", "Pink", "Maroon", "Olive", "Mustard"];
const MATERIAL_SUGGESTIONS = ["Polyester", "Nylon", "Wool", "Silk", "Linen"];

export function StyleProfilePanel() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useStyleProfile();
  const save = useSaveStyleProfile();

  const [form, setForm] = useState<StyleProfileInput>({
    top_size: null,
    bottom_size: null,
    dress_size: null,
    shoe_size: null,
    preferred_fit: null,
    favorite_colors: [],
    avoid_materials: [],
    gifting_for_others: false,
  });
  const [colorInput, setColorInput] = useState("");
  const [materialInput, setMaterialInput] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        top_size: profile.top_size,
        bottom_size: profile.bottom_size,
        dress_size: profile.dress_size,
        shoe_size: profile.shoe_size,
        preferred_fit: profile.preferred_fit,
        favorite_colors: profile.favorite_colors ?? [],
        avoid_materials: profile.avoid_materials ?? [],
        gifting_for_others: profile.gifting_for_others,
      });
    }
  }, [profile]);

  if (!user) return null;

  const addTag = (key: "favorite_colors" | "avoid_materials", value: string) => {
    const v = value.trim();
    if (!v) return;
    const current = form[key] ?? [];
    if (current.includes(v) || current.length >= 12) return;
    setForm({ ...form, [key]: [...current, v] });
    haptic("selection");
  };

  const removeTag = (key: "favorite_colors" | "avoid_materials", value: string) => {
    setForm({ ...form, [key]: (form[key] ?? []).filter((v) => v !== value) });
  };

  const handleSave = async () => {
    haptic("light");
    await save.mutateAsync(form);
  };

  return (
    <section className="glass rounded-2xl p-5" aria-label="Size and style profile">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shirt className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">My size &amp; style</h2>
        </div>
        <Sparkles className="w-4 h-4 text-accent/60" />
      </header>

      <p className="text-xs text-muted-foreground mb-4">
        Help us tailor recommendations and gift suggestions. Saved privately to your account.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SizeField
              label="Top size"
              value={form.top_size}
              onChange={(v) => setForm({ ...form, top_size: v })}
            />
            <SizeField
              label="Bottom size"
              value={form.bottom_size}
              onChange={(v) => setForm({ ...form, bottom_size: v })}
            />
            <SizeField
              label="Dress size"
              value={form.dress_size}
              onChange={(v) => setForm({ ...form, dress_size: v })}
            />
            <div>
              <Label className="text-xs">Shoe size (UK)</Label>
              <Input
                value={form.shoe_size ?? ""}
                onChange={(e) => setForm({ ...form, shoe_size: e.target.value || null })}
                placeholder="e.g. 7"
                inputMode="decimal"
                maxLength={5}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Preferred fit</Label>
            <Select
              value={form.preferred_fit ?? ""}
              onValueChange={(v) =>
                setForm({ ...form, preferred_fit: (v || null) as StyleProfileInput["preferred_fit"] })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a fit" />
              </SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} className="capitalize">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TagField
            label="Favorite colors"
            tags={form.favorite_colors ?? []}
            suggestions={COLOR_SUGGESTIONS}
            input={colorInput}
            setInput={setColorInput}
            onAdd={(v) => {
              addTag("favorite_colors", v);
              setColorInput("");
            }}
            onRemove={(v) => removeTag("favorite_colors", v)}
          />

          <TagField
            label="Avoid materials"
            tags={form.avoid_materials ?? []}
            suggestions={MATERIAL_SUGGESTIONS}
            input={materialInput}
            setInput={setMaterialInput}
            onAdd={(v) => {
              addTag("avoid_materials", v);
              setMaterialInput("");
            }}
            onRemove={(v) => removeTag("avoid_materials", v)}
          />

          <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5">
            <Label htmlFor="gift-toggle" className="text-sm cursor-pointer">
              I often shop for others
            </Label>
            <Switch
              id="gift-toggle"
              checked={!!form.gifting_for_others}
              onCheckedChange={(v) => setForm({ ...form, gifting_for_others: v })}
            />
          </div>

          <Button onClick={handleSave} disabled={save.isPending} className="w-full">
            {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save preferences
          </Button>
        </div>
      )}
    </section>
  );
}

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {SIZE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TagField({
  label,
  tags,
  suggestions,
  input,
  setInput,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  suggestions: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(input);
            }
          }}
          placeholder="Type & press Enter"
          maxLength={30}
        />
        <Button type="button" variant="outline" onClick={() => onAdd(input)}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 pr-1">
            {t}
            <button
              type="button"
              onClick={() => onRemove(t)}
              className="ml-0.5 rounded-full hover:bg-background/60 p-0.5"
              aria-label={`Remove ${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 &&
          suggestions.slice(0, 5).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAdd(s)}
              className="text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-full px-2 py-0.5 hover:text-accent hover:border-accent"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}
