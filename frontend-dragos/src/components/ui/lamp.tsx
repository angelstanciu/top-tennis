"use client";
import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../ThemeContext";

export function LampHero() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="relative w-full overflow-hidden h-[520px] md:h-[640px]"
      style={{ background: isDark ? "#020617" : "#f6f7f4" }}
    >
      <img
        src="/sports_hero_bg_dark.png"
        alt="Sports Hero Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: isDark ? 0.8 : 0.55 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(2,6,23,0.3), rgba(2,6,23,0.5) 55%, #020617)"
            : "linear-gradient(to bottom, rgba(246,247,244,0.55), rgba(246,247,244,0.75) 55%, #f6f7f4)",
        }}
      />
      <div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 280,
          height: 120,
          background: isDark ? "#a3e635" : "#84cc16",
          opacity: isDark ? 0.28 : 0.25,
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative z-[1] flex h-full flex-col items-center justify-end text-center px-6"
        style={{ paddingBottom: 36 }}
      >
        <motion.div
          initial={{ opacity: 0.5, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeInOut" }}
          style={{
            fontFamily: "Outfit, sans-serif",
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            backgroundImage: isDark
              ? "linear-gradient(135deg, #ffffff, #ecfccb 55%, #a3e635)"
              : "linear-gradient(135deg, #0f172a, #365314 65%, #4d7c0f)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Star Arena
        </motion.div>
        <div
          style={{
            fontFamily: "Outfit, sans-serif",
            fontSize: 26,
            fontWeight: 300,
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)",
            marginTop: 2,
          }}
        >
          Bascov
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeInOut" }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            color: isDark ? "#cbd5e1" : "#475569",
            maxWidth: 280,
            marginTop: 14,
            lineHeight: 1.5,
          }}
        >
          Performanță și Recreere la cele mai înalte standarde
        </motion.div>

        <motion.a
          href="/rezerva"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease: "easeInOut" }}
          className="active:scale-95 transition-transform"
          style={{
            marginTop: 22,
            background: isDark ? "#a3e635" : "#84cc16",
            color: isDark ? "#020617" : "#0f172a",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 800,
            fontSize: 16,
            borderRadius: 999,
            padding: "15px 34px",
            boxShadow: isDark ? "0 8px 28px rgba(163,230,53,0.35)" : "0 8px 28px rgba(132,204,22,0.35)",
          }}
        >
          Rezervă Acum
        </motion.a>
        <motion.a
          href="/meciuri"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease: "easeInOut" }}
          className="active:scale-95 transition-transform flex items-center"
          style={{
            marginTop: 12,
            border: `1.5px solid ${isDark ? "#a3e635" : "#65a30d"}`,
            color: isDark ? "#a3e635" : "#4d7c0f",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 999,
            padding: "12px 26px",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Găsește parteneri
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6, ease: "easeInOut" }}
          className="flex items-center"
          style={{
            marginTop: 22,
            gap: 8,
            border: `1px solid ${isDark ? "rgba(56,189,248,0.3)" : "#bae6fd"}`,
            background: isDark ? "rgba(2,6,23,0.6)" : "rgba(255,255,255,0.8)",
            borderRadius: 999,
            padding: "9px 18px",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: isDark ? "#a3e635" : "#65a30d" }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#e2e8f0" : "#334155" }}>
            Padel Indoor · <span style={{ color: isDark ? "#a3e635" : "#4d7c0f" }}>Climatizat 24°C</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
