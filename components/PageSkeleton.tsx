import { Skeleton } from '@/components/ui/skeleton';

export default function PageSkeleton({ minHeight = '50vh' }: { minHeight?: string }) {
  return (
    <div className="flex flex-col gap-4" style={{ minHeight }}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
