import NextLink from 'next/link';
import { Item, Category, ItemType, Announcement } from '@prisma/client';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';
import { LuTriangleAlert } from 'react-icons/lu';

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
    <div className="w-full">
      <div className="relative max-w-sm rounded-lg border bg-card text-card-foreground shadow-lg transition-all hover:z-10 hover:scale-[1.01] hover:shadow-2xl">
        <div className="relative aspect-[5/3] overflow-hidden rounded-t-lg">
          <img
            src={imageSrc}
            alt={`Picture of ${item.name}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = placeholder;
            }}
            className="h-full w-full object-cover object-center"
          />
        </div>

        <div className="m-6 mt-2">
          <div className="mt-1 flex items-center justify-between">
            <h4
              className="truncate text-2xl font-semibold leading-tight hover:underline"
              title={item.name}
            >
              <NextLink href={'/item/' + item.id}>{item.name}</NextLink>
            </h4>
          </div>
          <h5 className="text-base font-semibold">{item.amount} kpl</h5>
          <h5 className="text-base font-semibold">
            {item.categories.map((cat) => cat.name).join(', ')}
          </h5>

          {Array.isArray(item.announcements) &&
            item.announcements.length > 0 &&
            item.announcements.map((announcement) => (
              <div key={announcement.id} className="mt-2 text-sm font-semibold text-destructive">
                <NextLink href="/item/announcements" className="flex items-center gap-1">
                  <LuTriangleAlert className="mr-1" />
                  Sisältää ilmoituksen
                </NextLink>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
