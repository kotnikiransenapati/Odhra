import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function WholesalePlaceholder({
  title, desc,
}: { title: string; desc?: string }) {
  return (
    <Card className="p-10 text-center">
      <Construction className="h-10 w-10 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold mt-4">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {desc ?? "This module rolls out in the next batch of the wholesale program."}
      </p>
    </Card>
  );
}
