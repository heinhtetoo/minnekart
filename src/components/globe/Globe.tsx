'use client';

import { drag } from 'd3-drag';
import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { useEffect, useId, useRef } from 'react';

import { isPinVisible, Rotation } from '@/lib/globe/projection';
import { shouldAutoSpin } from '@/lib/globe/spin';
import {
  borders,
  GLOBE_COLORS as COLORS,
  GLOBE_VIGNETTE,
  land,
} from '@/lib/globe/world';
import { coverGradientPair } from '@/lib/photos/gradient';

import styles from './Globe.module.css';

export interface GlobePin {
  // The caller's array index, round-tripped through onSelect — not a trip id,
  // so it cannot be used to seed the gradient.
  id: string;
  lng: number;
  lat: number;
  placeName: string;
  thumbUrl?: string | null;
  gradientSeed?: string;
}

interface GlobeProps {
  pins: GlobePin[];
  accent?: string;
  autoSpin?: boolean;
  // Set false where the globe shares a page with controls a user taps
  // straight away, e.g. the auth card. The idle spin's redraw delays tap
  // dispatch on iOS, and a sign-in form is the worst place to lose a tap.
  spinOnTouch?: boolean;
  showGraticule?: boolean;
  onSelect?: (id: string) => void;
  focusId?: string | null;
  width?: number;
  height?: number;
}

interface GlobeApi {
  focusPin: (pin: GlobePin) => void;
  resetView: () => void;
}

const IDLE_RESUME_MS = 5000;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.2;

const PIN_RADIUS = 11;
const PIN_HOVER_RADIUS = 14;
const PIN_HALO_RADIUS = 20;

export default function Globe({
  pins,
  accent = '#a55931',
  autoSpin = true,
  spinOnTouch = true,
  showGraticule = true,
  onSelect,
  focusId = null,
  width = 540,
  height = 480,
}: GlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pinsRef = useRef(pins);
  const selectRef = useRef(onSelect);
  const focusIdRef = useRef(focusId);
  const appliedFocusRef = useRef<string | null>(focusId);
  const apiRef = useRef<GlobeApi | null>(null);
  // Namespaces this globe's <defs>, so two globes on one page cannot collide.
  // useId's own format is not safe inside url(#…), hence the strip.
  const defsPrefix = `globe-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    pinsRef.current = pins;
    selectRef.current = onSelect;
    focusIdRef.current = focusId;
  });

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const base = (Math.min(width, height) / 2 - 20) / MAX_ZOOM;
    const view = { rotation: [0, -25, 0] as Rotation, scale: base };
    let lastInteraction = -Infinity;
    let dragging = false;
    let animating = false;
    let raf = 0;
    let animationFrame = 0;
    let pinching = false;
    let pinchStartDist = 0;
    let pinchStartScale = base;

    const projection = geoOrthographic()
      .scale(view.scale)
      .translate([width / 2, height / 2])
      .rotate(view.rotation)
      .clipAngle(90);
    const path = geoPath(projection);
    const graticule = geoGraticule().step([20, 20])();

    const svg = select(svgEl);
    svg.selectAll('*').remove();
    const defs = svg.append('defs');
    appendVignette(defs, defsPrefix);
    appendShadowFilter(defs, defsPrefix);

    const root = svg.append('g');
    root
      .append('ellipse')
      .attr('class', 'shadow')
      .attr('cx', width / 2)
      .attr('cy', height / 2 + base * 0.9)
      .attr('rx', base * 0.86)
      .attr('ry', base * 0.11)
      .attr('fill', 'rgba(44,78,70,.22)')
      .attr('filter', `url(#${defsPrefix}-shadow)`);
    root
      .append('circle')
      .attr('class', 'water')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', view.scale)
      .attr('fill', COLORS.water)
      .attr('stroke', COLORS.border)
      .attr('stroke-width', 0.9);
    if (showGraticule) {
      root
        .append('path')
        .attr('class', 'graticule')
        .datum(graticule)
        .attr('fill', 'none')
        .attr('stroke', COLORS.graticule)
        .attr('stroke-width', 0.45)
        .attr('opacity', 0.16);
    }
    root
      .append('g')
      .attr('class', 'land')
      .selectAll('path')
      .data(land.features)
      .join('path')
      .attr('fill', COLORS.land)
      .attr('stroke', COLORS.border)
      .attr('stroke-width', 0.5)
      .attr('stroke-linejoin', 'round');
    root
      .append('path')
      .attr('class', 'borders')
      .datum(borders)
      .attr('fill', 'none')
      .attr('stroke', COLORS.border)
      .attr('stroke-width', 0.35)
      .attr('opacity', 0.55);
    root
      .append('circle')
      .attr('class', 'vignette')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', view.scale)
      .attr('fill', `url(#${defsPrefix}-vignette)`)
      .attr('pointer-events', 'none');
    const pinLayer = root.append('g').attr('class', 'pins');

    function redraw() {
      projection.scale(view.scale).rotate(view.rotation);
      const r = view.scale;
      svg
        .select('.shadow')
        .attr('rx', r * 0.86)
        .attr('ry', r * 0.11)
        .attr('cy', height / 2 + r * 0.9);
      svg.select('.water').attr('r', r);
      svg.select('.graticule').attr('d', path as never);
      svg
        .select('.land')
        .selectAll<SVGPathElement, unknown>('path')
        .attr('d', path as never);
      svg.select('.borders').attr('d', path as never);
      svg.select('.vignette').attr('r', r);
      drawPins();
    }

    // drawPins runs every frame, so the gradient and the thumbnail live in
    // <defs> and are created once. Appending an <image> per pin per frame
    // would re-fetch and re-decode the thumbnails at 60fps. Idempotent, and
    // called from drawPins rather than set up once above, because `pins`
    // changes through pinsRef without re-running this effect.
    function ensurePinFills(pin: GlobePin): {
      base: string;
      photo: string | null;
    } {
      const gradientId = `${defsPrefix}-grad-${pin.id}`;
      const patternId = `${defsPrefix}-photo-${pin.id}`;

      if (pin.gradientSeed && defs.select(`#${gradientId}`).empty()) {
        const [from, to] = coverGradientPair(pin.gradientSeed);
        const gradient = defs
          .append('linearGradient')
          .attr('id', gradientId)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '100%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', from);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', to);
      }

      if (pin.thumbUrl && defs.select(`#${patternId}`).empty()) {
        defs
          .append('pattern')
          .attr('id', patternId)
          .attr('patternContentUnits', 'objectBoundingBox')
          .attr('width', 1)
          .attr('height', 1)
          .append('image')
          .attr('href', pin.thumbUrl)
          .attr('width', 1)
          .attr('height', 1)
          .attr('preserveAspectRatio', 'xMidYMid slice');
      }

      return {
        base: pin.gradientSeed ? `url(#${gradientId})` : accent,
        photo: pin.thumbUrl ? `url(#${patternId})` : null,
      };
    }

    function drawPins() {
      pinLayer.selectAll('*').remove();
      for (const pin of pinsRef.current) {
        if (!isPinVisible(pin.lng, pin.lat, view.rotation)) continue;
        const point = projection([pin.lng, pin.lat]);
        if (!point) continue;
        const fills = ensurePinFills(pin);

        // One group per pin, so hover can grow the whole face without having
        // to work out which circles belong together.
        const group = pinLayer.append('g');
        const circle = (radius: number, fill: string) =>
          group
            .append('circle')
            .attr('cx', point[0])
            .attr('cy', point[1])
            .attr('r', radius)
            .attr('fill', fill)
            .attr('pointer-events', 'none');

        circle(PIN_HALO_RADIUS, toRgba(accent, 0.2));
        // The gradient sits under the photo rather than beside it, so a
        // thumbnail that is still loading — or whose signed URL has expired
        // after its hour — falls back on its own with no error handling.
        circle(PIN_RADIUS, fills.base).attr('class', 'pin-face');
        if (fills.photo) {
          circle(PIN_RADIUS, fills.photo).attr('class', 'pin-face');
        }

        const setRadius = (radius: number) =>
          group.selectAll('.pin-face, .pin-ring').attr('r', radius);

        group
          .append('circle')
          .attr('class', 'pin-ring')
          .attr('cx', point[0])
          .attr('cy', point[1])
          .attr('r', PIN_RADIUS)
          .attr('fill', 'none')
          .attr('stroke', COLORS.stroke)
          .attr('stroke-width', 2)
          // fill is none, so without this only the 2px stroke would be
          // clickable rather than the whole face.
          .attr('pointer-events', 'all')
          .attr('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            appliedFocusRef.current = pin.id;
            focusPin(pin);
          })
          .on('mouseenter', () => setRadius(PIN_HOVER_RADIUS))
          .on('mouseleave', () => setRadius(PIN_RADIUS));
      }
    }

    function animateTo(
      targetRotation: Rotation,
      targetScale: number,
      onDone?: () => void,
    ) {
      cancelAnimationFrame(animationFrame);
      const startRotation: Rotation = [...view.rotation];
      const startScale = view.scale;
      const deltaLng =
        ((((targetRotation[0] - startRotation[0]) % 360) + 540) % 360) - 180;
      const deltaLat = targetRotation[1] - startRotation[1];
      const duration = 950;
      const start = performance.now();
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      animating = true;
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = easeOut(progress);
        view.rotation = [
          startRotation[0] + deltaLng * eased,
          startRotation[1] + deltaLat * eased,
          0,
        ];
        view.scale = startScale + (targetScale - startScale) * eased;
        redraw();
        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          animating = false;
          animationFrame = 0;
          onDone?.();
        }
      };
      animationFrame = requestAnimationFrame(step);
    }

    function focusPin(pin: GlobePin) {
      animateTo([-pin.lng, -pin.lat, 0], base * MAX_ZOOM, () => {
        selectRef.current?.(pin.id);
      });
    }

    function resetView() {
      animateTo([...view.rotation], base);
    }

    function zoomTo(next: number) {
      view.scale = Math.max(base * MIN_ZOOM, Math.min(base * MAX_ZOOM, next));
      redraw();
    }

    function touchDistance(touches: TouchList): number {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    }

    // Register the pinch handlers before d3-drag: on touchstart d3-drag calls
    // stopImmediatePropagation(), which would block any later-registered
    // touchstart listener on the same element.
    svg.on(
      'touchstart',
      (event: TouchEvent) => {
        if (event.touches.length !== 2) return;
        event.preventDefault();
        pinching = true;
        pinchStartDist = touchDistance(event.touches);
        pinchStartScale = view.scale;
        lastInteraction = performance.now();
      },
      { passive: false } as never,
    );
    svg.on(
      'touchmove',
      (event: TouchEvent) => {
        if (!pinching || event.touches.length !== 2) return;
        event.preventDefault();
        const ratio = touchDistance(event.touches) / pinchStartDist;
        zoomTo(pinchStartScale * ratio);
        lastInteraction = performance.now();
      },
      { passive: false } as never,
    );
    const endPinch = (event: TouchEvent) => {
      if (event.touches.length < 2) pinching = false;
    };
    svg.on('touchend', endPinch);
    svg.on('touchcancel', endPinch);

    const dragBehavior = drag<SVGSVGElement, unknown>()
      .on('start', () => {
        dragging = true;
        lastInteraction = performance.now();
      })
      .on('drag', (event) => {
        if (pinching) return;
        view.rotation = [
          view.rotation[0] + event.dx * 0.26,
          Math.max(-80, Math.min(80, view.rotation[1] - event.dy * 0.26)),
          0,
        ];
        lastInteraction = performance.now();
        redraw();
      })
      .on('end', () => {
        dragging = false;
        lastInteraction = performance.now();
      });
    svg.call(dragBehavior);

    svg.on(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();
        lastInteraction = performance.now();
        const factor = event.deltaY < 0 ? 1.09 : 0.92;
        zoomTo(view.scale * factor);
      },
      { passive: false } as never,
    );

    apiRef.current = { focusPin, resetView };

    const spin = () => {
      if (
        autoSpin &&
        focusIdRef.current === null &&
        !dragging &&
        !animating &&
        performance.now() - lastInteraction >= IDLE_RESUME_MS
      ) {
        view.rotation = [view.rotation[0] + 0.16, view.rotation[1], 0];
        redraw();
      }
      raf = requestAnimationFrame(spin);
    };

    redraw();

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const spins = shouldAutoSpin({
      autoSpin,
      spinOnTouch,
      coarsePointer,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
    });
    if (spins) {
      raf = requestAnimationFrame(spin);
    }

    // Only the globe's own handlers reset lastInteraction, so without this the
    // spin never pauses while the user is busy elsewhere on the page — the
    // continuous redraw is what starved tap dispatch on iOS. Capture phase,
    // because d3-drag stops propagation on the events it handles. Touch only:
    // on desktop this would park the spin on every click, for no benefit.
    const noteInteraction = () => {
      lastInteraction = performance.now();
    };
    if (spins && coarsePointer) {
      document.addEventListener('pointerdown', noteInteraction, {
        capture: true,
        passive: true,
      });
    }

    return () => {
      // The capture flag is part of the listener's identity; without it here
      // the removal silently does nothing.
      document.removeEventListener('pointerdown', noteInteraction, {
        capture: true,
      });
      cancelAnimationFrame(raf);
      cancelAnimationFrame(animationFrame);
      svg.on('wheel', null);
      svg.on('touchstart', null);
      svg.on('touchmove', null);
      svg.on('touchend', null);
      svg.on('touchcancel', null);
      svg.on('.drag', null);
      apiRef.current = null;
    };
  }, [accent, autoSpin, spinOnTouch, defsPrefix, showGraticule, width, height]);

  useEffect(() => {
    if (focusId === appliedFocusRef.current) return;
    appliedFocusRef.current = focusId;
    const api = apiRef.current;
    if (!api) return;
    if (focusId === null) {
      api.resetView();
      return;
    }
    const pin = pinsRef.current.find((item) => item.id === focusId);
    if (pin) {
      api.focusPin(pin);
    }
  }, [focusId]);

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="Interactive globe of pinned places"
      />
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function appendVignette(defs: any, prefix: string) {
  const gradient = defs
    .append('radialGradient')
    .attr('id', `${prefix}-vignette`)
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');
  gradient
    .append('stop')
    .attr('offset', '58%')
    .attr('stop-color', GLOBE_VIGNETTE.inner);
  gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', GLOBE_VIGNETTE.outer);
}

function appendShadowFilter(defs: any, prefix: string) {
  defs
    .append('filter')
    .attr('id', `${prefix}-shadow`)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
    .append('feGaussianBlur')
    .attr('stdDeviation', 14);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function toRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
