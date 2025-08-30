import React, { useEffect, useMemo, useRef, useState } from "react";

// Config
const API_BASE = process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const BACKEND_URL = API_BASE;
const POLL_MS = 5000;
const HEALTH_PING_MS = 120000;
const SCAN_INTERVAL_MIN = 15;

// Utilities
function inr(n) {
  if (n === null || n === undefined) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function pct(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(2) + "%";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function nextScanCountdown() {
  const now = new Date();
  const m = now.getMinutes();
  const nextBlockMin = Math.ceil((m + 0.0001) / SCAN_INTERVAL_MIN) * SCAN_INTERVAL_MIN;
  const next = new Date(now);
  next.setSeconds(0, 0);
  if (nextBlockMin >= 60) {
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
  } else {
    next.setMinutes(nextBlockMin);
  }
  const diffMs = next - now;
  const ss = Math.max(0, Math.floor(diffMs / 1000));
  const mm = Math.floor(ss / 60);
  const remS = ss % 60;
  return `${String(mm).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
}

async function fetchJSON(path, options = {}) {
  const url = API_BASE + path;
  const headers = { "Content-Type": "application/json" };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Loading Spinner Component
function LoadingSpinner({ size = "md" }) {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner-ring"></div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ progress, status, className = "" }) {
  return (
    <div className={`progress-container ${className}`}>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <div className="progress-text">{status}</div>
    </div>
  );
}

// Theme Toggle
function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark"
