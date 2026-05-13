'use client';

import { usePathname } from 'next/navigation';
import { ItemCardSkeletonGrid } from '@/components/ItemCardSkeleton';
import { LoanCardSkeletonGrid } from '@/components/LoanCardSkeleton';
import PageSkeleton from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  const pathname = usePathname() ?? '/';

  if (pathname === '/') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <ItemCardSkeletonGrid />
      </div>
    );
  }

  if (pathname === '/loan') {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-40" />
        <LoanCardSkeletonGrid />
      </div>
    );
  }

  if (pathname.startsWith('/loan/')) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/admin')) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/item/')) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/kiosk/return')) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <LoanCardSkeletonGrid count={4} />
      </div>
    );
  }

  if (pathname.startsWith('/kiosk/startloan')) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return <PageSkeleton />;
}
