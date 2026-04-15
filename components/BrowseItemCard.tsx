import { Item, Category, ItemType, Announcement } from '@prisma/client';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';
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
  const imageSrc = useItemImage(item.id);
  const placeholder = usePlaceholder();

  return (
    <ItemCardShell
      name={item.name}
      imageSrc={imageSrc}
      placeholder={placeholder}
      subtitle={`${item.amount} kpl`}
      categoryLine={item.categories.map((cat) => cat.name).join(', ')}
      announcements={item.announcements}
      href={`/item/${item.id}`}
    />
  );
}
