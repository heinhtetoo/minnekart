'use client';

import { drag } from 'd3-drag';
import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { useEffect, useRef } from 'react';
import { feature, mesh } from 'topojson-client';

import worldData from '@/data/world-110m.json';
import { isPinVisible, Rotation } from '@/lib/globe/projection';

import styles from './Globe.module.css';

export interface GlobePin {
  id: string;
  lng: number;
  lat: number;
  placeName: string;
}

interface GlobeProps {
  pins: GlobePin[];
  accent?: string;
  autoSpin?: boolean;
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

/* eslint-disable @typescript-eslint/no-explicit-any */
const topology = worldData as any;
const land = feature(topology, topology.objects.countries) as any;
const borders = mesh(
  topology,
  topology.objects.countries,
  (a: any, b: any) => a !== b,
);
/* eslint-enable @typescript-eslint/no-explicit-any */

const COLORS = {
  water: '#9ecdb6',
  land: '#e4dcd0',
  border: '#66a07e',
  graticule: '#86b89a',
  stroke: '#fff',
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.2;

export default function Globe({
  pins,
  accent = '#c4693a',
  autoSpin = true,
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
    appendAtmosphere(defs);
    appendVignette(defs);
    appendShadowFilter(defs);

    const root = svg.append('g');
    root
      .append('ellipse')
      .attr('class', 'shadow')
      .attr('cx', width / 2)
      .attr('cy', height / 2 + base * 0.9)
      .attr('rx', base * 0.86)
      .attr('ry', base * 0.11)
      .attr('fill', 'rgba(10,30,50,.13)')
      .attr('filter', 'url(#globe-shadow)');
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
        .attr('opacity', 0.7);
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
      .attr('class', 'atmosphere')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', view.scale)
      .attr('fill', 'url(#globe-atmosphere)')
      .attr('pointer-events', 'none');
    root
      .append('circle')
      .attr('class', 'vignette')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', view.scale)
      .attr('fill', 'url(#globe-vignette)')
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
      svg.select('.atmosphere').attr('r', r);
      svg.select('.vignette').attr('r', r);
      drawPins();
    }

    function drawPins() {
      pinLayer.selectAll('*').remove();
      for (const pin of pinsRef.current) {
        if (!isPinVisible(pin.lng, pin.lat, view.rotation)) continue;
        const point = projection([pin.lng, pin.lat]);
        if (!point) continue;
        pinLayer
          .append('circle')
          .attr('cx', point[0])
          .attr('cy', point[1])
          .attr('r', 15)
          .attr('fill', toRgba(accent, 0.2))
          .attr('pointer-events', 'none');
        pinLayer
          .append('circle')
          .attr('cx', point[0])
          .attr('cy', point[1])
          .attr('r', 6)
          .attr('fill', accent)
          .attr('stroke', COLORS.stroke)
          .attr('stroke-width', 2)
          .attr('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            appliedFocusRef.current = pin.id;
            focusPin(pin);
          })
          .on('mouseenter', function () {
            select(this).attr('r', 9);
          })
          .on('mouseleave', function () {
            select(this).attr('r', 6);
          });
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
    // Skip the idle auto-spin on touch devices: its per-frame redraw runs
    // continuously (nothing resets lastInteraction while the user taps the
    // page, not the globe) and starves tap/click dispatch on iOS Safari.
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (autoSpin && !coarsePointer) {
      raf = requestAnimationFrame(spin);
    }

    return () => {
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
  }, [accent, autoSpin, showGraticule, width, height]);

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
function appendAtmosphere(defs: any) {
  const gradient = defs
    .append('radialGradient')
    .attr('id', 'globe-atmosphere')
    .attr('cx', '36%')
    .attr('cy', '30%')
    .attr('r', '64%');
  gradient
    .append('stop')
    .attr('offset', '50%')
    .attr('stop-color', '#fff')
    .attr('stop-opacity', 0);
  gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#fff')
    .attr('stop-opacity', 0.22);
}

function appendVignette(defs: any) {
  const gradient = defs
    .append('radialGradient')
    .attr('id', 'globe-vignette')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');
  gradient
    .append('stop')
    .attr('offset', '58%')
    .attr('stop-color', 'rgba(0,0,0,0)');
  gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(0,20,40,.14)');
}

function appendShadowFilter(defs: any) {
  defs
    .append('filter')
    .attr('id', 'globe-shadow')
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
