"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-slate-950 w-full z-0",
        className
      )}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 opacity-80">
        <img 
          src="/sports_hero_bg_dark.png" 
          alt="Sports Hero Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/40 to-slate-950" />
      </div>
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-lime-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-lime-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>

        {/* Lamp Glow beam */}
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-lime-500 opacity-50 blur-3xl"></div>
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-lime-400 blur-2xl"
        ></motion.div>

        {/* Lamp thin light beam line */}
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-lime-400"
        ></motion.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950"></div>
      </div>

      <div className="relative z-50 flex -translate-y-40 flex-col items-center px-5 text-center">
        {children}
      </div>
    </div>
  );
};

export function LampHero() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
        className="mt-8 bg-gradient-to-br from-white via-lime-100 to-lime-500 py-4 bg-clip-text text-center text-5xl font-bold tracking-tight text-transparent md:text-7xl"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Star Arena <br />
        <span className="text-3xl md:text-5xl font-light text-white/70">Bascov</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: "easeInOut" }}
        className="mt-4 text-slate-300 text-lg md:text-xl max-w-lg"
      >
        Performanță și Recreere la cele mai înalte standarde
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8, ease: "easeInOut" }}
        className="mt-8 flex gap-4"
      >
        <a
          href="/rezerva"
          className="px-8 py-4 bg-lime-500 text-slate-950 font-bold rounded-full text-lg hover:bg-lime-400 transition-colors shadow-lg shadow-lime-500/30 active:scale-95"
        >
          Rezervă Acum
        </a>
      </motion.div>
    </LampContainer>
  );
}
