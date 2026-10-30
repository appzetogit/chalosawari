import { useState, useEffect } from 'react';

interface UseCountAnimationProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  enabled?: boolean;
}

export const useCountAnimation = ({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  enabled = true
}: UseCountAnimationProps) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (!enabled) {
      setCount(end);
      return;
    }

    let animationFrameId: number;
    const timer = setTimeout(() => {
      const startTime = Date.now();
      const difference = end - start;

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(start + difference * easeOutQuart);

        setCount(currentCount);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, start, duration, delay, enabled]);

  return count;
};
