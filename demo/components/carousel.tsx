"use client";

import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, motion, MotionConfig, stagger, useMotionValue, useReducedMotion, type PanInfo, type Transition, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/helpers/utils";

interface CarouselProps<T> {
  items: T[] | null;
  mainCard?: ReactNode | null;
  renderItem: (item: T, index: number) => ReactNode;
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getIsMobile = () => window.matchMedia(MOBILE_QUERY).matches;
const getIsMobileOnServer = () => false;

const SLIDE_SPRING: Transition = { type: "spring", visualDuration: 0.35, bounce: 0.08 };
const DOT_SPRING: Transition = { type: "spring", visualDuration: 0.25, bounce: 0.15 };
const SWIPE_THRESHOLD = 0.2;
const SWIPE_VELOCITY_PROJECTION = 0.2;

const slideVariants: Variants = {
  inactive: {},
  active: { transition: { delayChildren: stagger(0.05, { startDelay: 0.08 }) } },
};

const revealVariants: Variants = {
  inactive: { opacity: 0, y: 10, transition: { duration: 0.12 } },
  active: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Wraps the text of a slide so it fades in upwards every time its slide becomes active.
 * Siblings are staggered in render order. Outside a carousel it renders as a plain block.
 */
export function CarouselReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={revealVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function Carousel<T>({ items, mainCard = null, renderItem }: CarouselProps<T>) {
  const slides: ReactNode[] = [];

  if (mainCard) {
    slides.push(mainCard);
  }

  if (items && items.length > 0) {
    slides.push(...items.map((item, index) => renderItem(item, index)));
  }

  if (slides.length === 0) return null;

  return (
    <MotionConfig reducedMotion="user">
      {slides.length === 1 ? (
        <motion.div initial="inactive" animate="active" variants={slideVariants}>
          {slides[0]}
        </motion.div>
      ) : (
        <SlideDeck slides={slides} />
      )}
    </MotionConfig>
  );
}

function SlideDeck({ slides }: { slides: ReactNode[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const indexRef = useRef(0);
  const widthRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useSyncExternalStore(subscribeToMobile, getIsMobile, getIsMobileOnServer);

  const goTo = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(count - 1, next));
      const offset = -target * widthRef.current;

      if (target !== indexRef.current) {
        indexRef.current = target;
        setIndex(target);
      }

      if (prefersReducedMotion) {
        x.jump(offset);
      } else {
        animate(x, offset, SLIDE_SPRING);
      }
    },
    [count, prefersReducedMotion, x],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      if (nextWidth === widthRef.current) return;

      widthRef.current = nextWidth;
      setWidth(nextWidth);
      x.jump(-indexRef.current * nextWidth);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [x]);

  useEffect(() => {
    if (indexRef.current > count - 1) goTo(count - 1);
  }, [count, goTo]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const slideWidth = widthRef.current;
    if (slideWidth === 0) return;

    const projected = (info.offset.x + info.velocity.x * SWIPE_VELOCITY_PROJECTION) / slideWidth;
    const current = indexRef.current;

    if (projected < -SWIPE_THRESHOLD) goTo(current + 1);
    else if (projected > SWIPE_THRESHOLD) goTo(current - 1);
    else goTo(current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(indexRef.current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(indexRef.current - 1);
    }
  };

  return (
    <section className="relative min-w-0" aria-roledescription="carrusel" aria-label="Carrusel" onKeyDown={handleKeyDown}>
      <div ref={viewportRef} className="relative w-full overflow-hidden">
        <motion.div
          className={cn("flex", isMobile && "cursor-grab select-none active:cursor-grabbing")}
          style={{ x, width: `${count * 100}%`, willChange: "transform" }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: -(count - 1) * width, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          aria-live="polite"
        >
          {slides.map((content, slideIndex) => {
            const isActive = slideIndex === index;

            return (
              <motion.div
                key={slideIndex}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${slideIndex + 1} de ${count}`}
                inert={!isActive}
                className="min-w-0"
                style={{ flex: `0 0 ${100 / count}%` }}
                variants={slideVariants}
                initial="inactive"
                animate={isActive ? "active" : "inactive"}
              >
                {content}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <ArrowButton label="Anterior" disabled={index === 0} onClick={() => goTo(index - 1)}>
          <ChevronLeft size={16} />
        </ArrowButton>

        <div className="flex items-center">
          {slides.map((_, dotIndex) => {
            const isActive = dotIndex === index;

            return (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Ir a la diapositiva ${dotIndex + 1}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => goTo(dotIndex)}
                className="group grid place-items-center rounded-full px-0.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-foreground/70"
              >
                <motion.span
                  layout
                  layoutDependency={index}
                  transition={DOT_SPRING}
                  className={cn(
                    "block h-1.25 transition-colors duration-200",
                    isActive ? "w-4.25 bg-primary" : "w-1.25 bg-foreground/40 group-hover:bg-foreground/70",
                  )}
                  style={{ borderRadius: 3 }}
                />
              </button>
            );
          })}
        </div>

        <ArrowButton label="Siguiente" disabled={index === count - 1} onClick={() => goTo(index + 1)}>
          <ChevronRight size={16} />
        </ArrowButton>
      </div>
    </section>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      className="hidden h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,opacity] outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-foreground/70 disabled:pointer-events-none disabled:opacity-40 md:grid"
    >
      {children}
    </motion.button>
  );
}
