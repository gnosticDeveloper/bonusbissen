"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps<T> {
  items: T[] | null;
  mainCard?: ReactNode | null;
  renderItem: (item: T, index: number) => ReactNode;
  fallback?: ReactNode;
  className?: string;
  autoSlideInterval?: number;
}

export function Carousel<T>({
  items,
  mainCard = null,
  renderItem,
  fallback,
  className = "",
  autoSlideInterval = 5000,
}: CarouselProps<T>) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides: ReactNode[] = [];

  if (mainCard) {
    slides.push(mainCard);
  }

  if (items && items.length > 0) {
    slides.push(...items.map((item, index) => renderItem(item, index)));
  }

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (slides.length > 1 && autoSlideInterval > 0) {
      timerRef.current = setInterval(() => {
        goTo(1, true);
      }, autoSlideInterval);
    }
  }, [slides.length, autoSlideInterval]);

  const goTo = useCallback(
    (dir: number, isAuto = false) => {
      if (isAnimating || slides.length <= 1) return;
      setDirection(dir > 0 ? "right" : "left");
      setIsAnimating(true);
      setSlide((prev) => (prev + dir + slides.length) % slides.length);
      if (!isAuto) resetTimer();
      setTimeout(() => setIsAnimating(false), 300);
    },
    [isAnimating, slides.length, resetTimer]
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (isAnimating || index === slide || slides.length <= 1) return;
      setDirection(index > slide ? "right" : "left");
      setIsAnimating(true);
      setSlide(index);
      resetTimer();
      setTimeout(() => setIsAnimating(false), 300);
    },
    [isAnimating, slide, slides.length, resetTimer]
  );

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // Case 5: Both null, return null or fallback
  if (!mainCard && (!items || items.length === 0)) {
    return fallback ? <>{fallback}</> : null;
  }

  // Case 4: Only one slide, no controls
  if (slides.length === 1) {
    return <div className={className}>{slides[0]}</div>;
  }

  return (
    <section className={`relative min-w-0 ${className}`} aria-label="Carousel">
      {/* Slides container with animation */}
      <div className="relative overflow-hidden w-full">
        <div
          className="flex transition-transform duration-300 ease-out w-full"
          style={{
            transform: `translateX(-${slide * 100}%)`,
          }}
        >
          {slides.map((content, index) => (
            <div
              key={index}
              className="w-full shrink-0 min-w-0"
              style={{
                animation:
                  index === slide
                    ? `slideIn${direction === "right" ? "Right" : "Left"} 0.3s ease-out`
                    : undefined,
              }}
            >
              {content}
            </div>
          ))}
        </div>
      </div>

      {/* Controls below the card */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          aria-label="Anterior"
          onClick={() => goTo(-1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-black/15 text-white transition-opacity hover:bg-black/25"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.25">
          {slides.map((_, index) => (
            <button
              key={index}
              aria-label={`Ir a slide ${index + 1}`}
              onClick={() => goToIndex(index)}
              className={`h-1.25 rounded-full transition-all duration-180 ${
                index === slide ? "w-4.25 bg-primary" : "w-1.25 bg-border hover:bg-border/70"
              }`}
            />
          ))}
        </div>

        <button
          aria-label="Siguiente"
          onClick={() => goTo(1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-black/15 text-white transition-opacity hover:bg-black/25"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
