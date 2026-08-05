"use client"

import * as React from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { cn } from "@/lib/utils"

/*
  The one scroll-reveal used across the site. Deliberately understated:
  a fade and a 16px rise on a single easing curve, fired once.

  Anything louder than this — scale, spring, bounce, parallax on text — is
  off-brief. Keeping it in one component is what stops each new section
  inventing its own.

  When the OS asks for reduced motion we render the final state immediately
  rather than animating faster, so nothing moves at all.
*/

const EASE = [0.16, 1, 0.3, 1] as const
const DURATION = 0.6
const STAGGER = 0.07

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
}

interface RevealProps
  extends Omit<React.ComponentPropsWithoutRef<typeof motion.div>, "children"> {
  // motion.div widens children to accept MotionValue; we only ever pass nodes.
  children?: React.ReactNode
  /** Seconds to wait before this element begins. */
  delay?: number
  /** Stagger direct children instead of animating the block as one. */
  stagger?: boolean
}

export function Reveal({
  children,
  className,
  delay = 0,
  stagger = false,
  ...props
}: RevealProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: STAGGER, delayChildren: delay } },
  }

  const single: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION, ease: EASE, delay },
    },
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      variants={stagger ? container : single}
      {...props}
    >
      {stagger
        ? React.Children.map(children, (child, i) =>
            React.isValidElement(child) ? (
              <motion.div key={i} variants={item}>
                {child}
              </motion.div>
            ) : (
              child
            )
          )
        : children}
    </motion.div>
  )
}
