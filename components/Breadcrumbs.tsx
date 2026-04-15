import NextLink from 'next/link';
import { FaChevronCircleRight } from 'react-icons/fa';
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li>
          <NextLink href="/" className="text-muted-foreground hover:text-foreground">
            Etusivu
          </NextLink>
        </li>
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <li aria-hidden className="text-muted-foreground">
                <FaChevronCircleRight />
              </li>
              <li aria-current={isCurrentPage ? 'page' : undefined}>
                {isCurrentPage || !item.href ? (
                  <span className="text-foreground">{item.label}</span>
                ) : (
                  <NextLink href={item.href} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                  </NextLink>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
