// Day 7 demo — a living component gallery (the "documentation" for our design
// system). Everything here is a shadcn/ui component (copy-in source in
// src/components/ui/), built on Radix primitives, themed by our @theme tokens.
// This page is a Server Component; the interactive pieces (Dialog, toasts, form)
// are client components rendered as children.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ToastDemo from "@/components/toast-demo";
// Day 9: the form is lazy-loaded (react-hook-form + zod ship in their own chunk
// that downloads after hydration, not in this route's initial JS). See the wrapper.
import ContactForm from "@/components/lazy-contact-form";

export const metadata = {
  title: "Design System — Pace",
  description: "shadcn/ui + Radix component gallery, themed via Tailwind v4 @theme.",
};

const buttonVariants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Design System</h1>
        <p className="text-sm text-muted-foreground">
          Copy-in shadcn/ui components on Radix primitives — accessible by default,
          themeable via <code>@theme</code>, variants via <code>cva</code>.
        </p>
      </header>

      {/* BUTTON — variants + sizes come from a cva() config in button.tsx */}
      <Row title="Button — cva variants">
        <div className="flex flex-wrap items-center gap-2">
          {buttonVariants.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">small</Button>
          <Button size="default">default</Button>
          <Button size="lg">large</Button>
          <Button disabled>disabled</Button>
        </div>
      </Row>

      {/* DIALOG — Radix primitive: focus trap, ESC to close, aria wiring built in */}
      <Row title="Dialog — Radix (accessible modal)">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm publish</DialogTitle>
              <DialogDescription>
                This pushes the page live. Radix handles focus trapping, ESC, and
                the aria-modal wiring for you.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Publish</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Row>

      {/* SONNER — toasts (replaces the deprecated toast component) */}
      <Row title="Sonner — toasts">
        <ToastDemo />
      </Row>

      {/* FORM — react-hook-form + zod + accessible <Form*> wiring */}
      <Row title="Form — react-hook-form + zod (accessible)">
        <ContactForm />
      </Row>

      {/* FIGMA → CODE — how a design spec maps onto our tokens */}
      <Row title="Figma → code: tokens">
        <p className="text-sm text-muted-foreground">
          A design spec maps 1:1 to <code>@theme</code> tokens — no magic values.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-6">Figma style</th>
                <th className="py-1 pr-6">Token</th>
                <th className="py-1">Utility</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr><td className="py-1 pr-6">Brand/600</td><td className="py-1 pr-6">--color-brand-600</td><td className="py-1">bg-brand-600</td></tr>
              <tr><td className="py-1 pr-6">Radius/Card</td><td className="py-1 pr-6">--radius-card</td><td className="py-1">rounded-card</td></tr>
              <tr><td className="py-1 pr-6">Space/Section</td><td className="py-1 pr-6">--spacing-section</td><td className="py-1">py-section</td></tr>
              <tr><td className="py-1 pr-6">Surface</td><td className="py-1 pr-6">--color-surface</td><td className="py-1">bg-surface</td></tr>
            </tbody>
          </table>
        </div>
      </Row>
    </div>
  );
}
