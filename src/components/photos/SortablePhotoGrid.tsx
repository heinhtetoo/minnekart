'use client';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { SignedPhoto } from '@/lib/photos/dto';

import styles from './PhotoUploader.module.css';

interface SortablePhotoGridProps {
  photos: SignedPhoto[];
  onReorder: (next: SignedPhoto[]) => void;
  onRemove: (photoId: string) => void;
}

export default function SortablePhotoGrid({
  photos,
  onReorder,
  onRemove,
}: SortablePhotoGridProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }
    const from = photos.findIndex((photo) => photo.id === active.id);
    const to = photos.findIndex((photo) => photo.id === over.id);
    if (from < 0 || to < 0) {
      return;
    }
    onReorder(arrayMove(photos, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={photos.map((photo) => photo.id)}
        strategy={rectSortingStrategy}
      >
        <div className={styles.grid}>
          {photos.map((photo) => (
            <SortablePhotoTile
              key={photo.id}
              photo={photo}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortablePhotoTileProps {
  photo: SignedPhoto;
  onRemove: (photoId: string) => void;
}

function SortablePhotoTile({ photo, onRemove }: SortablePhotoTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const tileClass = isDragging
    ? `${styles.tile} ${styles.tileDragging}`
    : styles.tile;

  return (
    <div
      ref={setNodeRef}
      className={tileClass}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.thumbUrl} alt="" loading="lazy" />
      <button
        type="button"
        className={styles.remove}
        onClick={() => onRemove(photo.id)}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label="Remove photo"
      >
        ×
      </button>
    </div>
  );
}
