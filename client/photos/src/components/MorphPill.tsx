import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A container whose width and height animate smoothly to fit whatever content
 * it currently holds. Swapping the children (e.g. a "3 Selected" bar for a
 * "Delete these? …" confirm bar) grows or shrinks the pill rather than snapping.
 *
 * The shared Edit Mode action-bar primitive: delete uses it today; tag / untag
 * will reuse it, so their bars morph the same way. Visual chrome (border, bg,
 * rounded, shadow) belongs on `className`; the children carry their own padding
 * and layout. Pair a keyed `animate-fadeInFast` on the content with the size
 * morph for a crossfade as the pill resizes.
 */
export default function MorphPill({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width?: number; height?: number }>({});

  // Track the natural size of the (width-fit) content and mirror it onto the
  // animating wrapper. A ResizeObserver catches every content swap and reflow;
  // we only publish a new size when it actually changed, so this can't loop.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () =>
      setDims((prev) =>
        prev.width === el.offsetWidth && prev.height === el.offsetHeight
          ? prev
          : { width: el.offsetWidth, height: el.offsetHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`overflow-hidden transition-[width,height] duration-300 ease-out ${className}`}
      style={{ width: dims.width, height: dims.height }}
    >
      <div ref={inner} className="w-max">
        {children}
      </div>
    </div>
  );
}
