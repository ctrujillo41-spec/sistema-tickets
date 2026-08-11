import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, phase, desc }: { title: string; phase: string; desc: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este módulo se construye en la {phase}. Por ahora, el menú y el acceso ya están
          protegidos por rol.
        </CardContent>
      </Card>
    </div>
  );
}
