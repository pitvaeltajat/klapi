'use client';

import { Item, Category, ItemType, Announcement } from '@prisma/client';
import { useItemImageState } from '../hooks/useItemImage';
import ItemCardShell from './ItemCardShell';

interface ItemWithCategories extends Item {
  categories: Category[];
  type: ItemType;
  announcements: Announcement[];
}

interface BrowseItemCardProps {
  item: ItemWithCategories;
}

export default function BrowseItemCard({ item }: BrowseItemCardProps) {
  const image = useItemImageState(item.id);

  return (
    <ItemCardShell
      name={item.name}
      imageSrc={image.src}
      placeholder={image.placeholder}
      loading={image.status === 'loading'}
      subtitle={`${item.amount} kpl`}
      categoryLine={item.categories.map((cat) => cat.name).join(', ')}
      announcements={item.announcements}
      href={`/item/${item.id}`}
    />
  );
}
