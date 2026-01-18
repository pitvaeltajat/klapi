import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaChevronCircleRight } from 'react-icons/fa';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb spacing="8px" separator={<FaChevronCircleRight color="gray.500" />} mb={4}>
      <BreadcrumbItem>
        <BreadcrumbLink as={NextLink} href="/">
          Etusivu
        </BreadcrumbLink>
      </BreadcrumbItem>
      {items.map((item, index) => {
        const isCurrentPage = index === items.length - 1;
        return (
          <BreadcrumbItem key={index} isCurrentPage={isCurrentPage}>
            {isCurrentPage || !item.href ? (
              <BreadcrumbLink>{item.label}</BreadcrumbLink>
            ) : (
              <BreadcrumbLink as={NextLink} href={item.href}>
                {item.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}
