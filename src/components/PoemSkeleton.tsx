import { cn } from "@/lib/utils";
import { card } from "./kit";

/** A card-shaped placeholder that reserves the real card's height. */
export function PoemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(card, "animate-pulse p-4 sm:p-6 md:p-8", className)} aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded-full bg-slate-100" />
          <div className="h-4 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="h-6 w-40 rounded-full bg-slate-100" />
      </div>
      <div className="space-y-3 py-10 sm:py-12">
        <div className="mx-auto h-5 w-4/5 rounded-full bg-slate-100" />
        <div className="mx-auto h-5 w-3/5 rounded-full bg-slate-100" />
        <div className="mx-auto h-5 w-2/3 rounded-full bg-slate-100" />
      </div>
      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <div className="h-7 w-24 rounded-full bg-slate-100" />
        <div className="h-7 w-20 rounded-full bg-slate-100" />
        <div className="h-7 w-16 rounded-full bg-slate-100" />
        <div className="h-7 w-24 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function PoemSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4 sm:space-y-6" aria-label="Loading verses" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <PoemSkeleton key={i} />
      ))}
      <span className="sr-only">Loading verses…</span>
    </div>
  );
}
