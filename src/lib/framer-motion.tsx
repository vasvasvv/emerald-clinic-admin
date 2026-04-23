import * as React from 'react';

const MOTION_PROP_NAMES = new Set([
  'animate',
  'initial',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'viewport',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragTransition',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'transformTemplate',
]);

const motionComponentCache = new Map<string, React.ComponentType<any>>();

function stripMotionProps(props: Record<string, unknown>) {
  const cleanedProps: Record<string, unknown> = {};

  for (const key in props) {
    if (!MOTION_PROP_NAMES.has(key)) {
      cleanedProps[key] = props[key];
    }
  }

  return cleanedProps;
}

function getMotionComponent(tag: string) {
  const cached = motionComponentCache.get(tag);
  if (cached) return cached;

  const MotionComponent = React.forwardRef<HTMLElement, Record<string, unknown>>(({ children, ...props }, ref) =>
    React.createElement(tag, { ...stripMotionProps(props), ref }, children),
  );

  MotionComponent.displayName = `Motion.${tag}`;
  motionComponentCache.set(tag, MotionComponent);

  return MotionComponent;
}

export const motion = new Proxy(
  {},
  {
    get(_, tag: string) {
      return getMotionComponent(tag);
    },
  },
) as Record<string, React.ComponentType<any>>;

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
