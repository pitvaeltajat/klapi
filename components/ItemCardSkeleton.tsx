import { Skeleton } from '@/components/ui/skeleton';

export default function ItemCardSkeleton() {
  return (
    <div className="relative flex overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs sm:flex-col sm:shadow-lg">
      <Skeleton className="aspect-square w-28 shrink-0 rounded-none sm:aspect-5/3 sm:w-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4 xl:p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-auto h-11 w-full sm:mt-3" />
      </div>
    </div>
  );
}

export function ItemCardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
}
