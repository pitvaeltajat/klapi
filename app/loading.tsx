'use client';

import { usePathname } from 'next/navigation';
import { LoanCardSkeletonGrid } from '@/components/LoanCardSkeleton';
import PageSkeleton from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function Loading() {
  const pathname = usePathname() ?? '/';

  if (pathname === '/') {
    // First content on `/` is always the DateSelector calendar card: any
    // persisted range is only restored after mount, so `datesSet` is still
    // false at this point. Mirror DateSelector's layout, not the item grid.
    return (
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Card padding="md">
          <Skeleton className="h-5 w-40" />
          <div className="mt-2 flex justify-center">
            <Skeleton className="h-[300px] w-[280px]" />
          </div>
          <Skeleton className="mt-4 h-10 w-full" />
        </Card>
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
        <Card>
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
        <Card>
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
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
        <Card>
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (pathname.startsWith('/item/')) {
    // Mirrors ItemView's own stack — title, description, the two/three-column
    // metadata row, then the photo in its 5:3 box. The photo box in particular
    // has to match: this skeleton hands over to ItemView's, and the two used to
    // disagree about both shape and place on the page.
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[1lh] w-2/3 text-base md:text-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="aspect-5/3 w-full max-w-2xl" />
      </div>
    );
  }

  if (pathname.startsWith('/return')) {
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
