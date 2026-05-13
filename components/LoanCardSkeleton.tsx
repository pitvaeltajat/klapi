import { Skeleton } from '@/components/ui/skeleton';

export default function LoanCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function LoanCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <LoanCardSkeleton key={i} />
      ))}
    </div>
  );
}
