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
          {photos.map((photo, index) => (
            <SortablePhotoTile
              key={photo.id}
              photo={photo}
              position={index + 1}
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
  position: number;
  onRemove: (photoId: string) => void;
}

// Each photo as a small print: a grip to show it can be dragged, its frame
// number, and × to remove it.
function SortablePhotoTile({
  photo,
  position,
  onRemove,
}: SortablePhotoTileProps) {
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
      <span className={styles.tileFoot}>
        <svg
          className={styles.grip}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
        <span className={`serif ${styles.frameNo}`}>
          {String(position).padStart(2, '0')}
        </span>
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
      </span>
    </div>
  );
}
