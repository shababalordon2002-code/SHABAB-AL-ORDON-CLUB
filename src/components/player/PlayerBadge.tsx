'use client';

import React, { useState, useEffect } from 'react';
import { dbStore } from '@/lib/store/db-store';
import { Match } from '@/types';

export interface PlayerAvatarProps {
  photoUrl?: string;
  name: string;
  size?: number;
  className?: string;
}

export function PlayerAvatar({ photoUrl, name, size = 32, className = '' }: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  let cleanUrl = (photoUrl || '').trim();
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'J';

  if (!cleanUrl || hasError) {
    return (
      <div
        className={`rounded-full bg-slate-950 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow font-extrabold text-[10px] text-amber-400 select-none ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-slate-950 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <img
        src={cleanUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export interface NumberBadgeProps {
  number: number | string;
  size?: number;
  selected?: boolean;
  className?: string;
}

export function NumberBadge({ number, size = 32, selected = false, className = '' }: NumberBadgeProps) {
  return (
    <div
      className={`rounded-xl border flex items-center justify-center shrink-0 shadow-inner transition-all select-none ${
        selected
          ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-slate-950 ring-2 ring-amber-400/50'
          : 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-amber-500/30 text-amber-400'
      } ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <span
        className="font-black italic leading-none select-none"
        style={{ fontSize: `${size * 0.5}px`, textShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {number}
      </span>
    </div>
  );
}

// ── JORDAN PRO LEAGUE CLUBS BRAND DEFINITIONS ──

export interface TeamBrandStyle {
  shortCode: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  accentIcon: 'crown' | 'star' | 'eagle' | 'shield' | 'waves';
  stripes?: boolean;
}

export const JORDAN_TEAMS_BRAND: Record<string, TeamBrandStyle> = {
  shabab_al_ordon: {
    shortCode: 'SAO',
    name: 'Shabab Al Ordon',
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    borderColor: '#fbbf24',
    accentIcon: 'crown',
  },
  al_hussein: {
    shortCode: 'ALH',
    name: 'Al Hussein Irbid',
    primaryColor: '#facc15',
    secondaryColor: '#090d16',
    borderColor: '#fbbf24',
    accentIcon: 'crown',
    stripes: true,
  },
  al_faisaly: {
    shortCode: 'FAI',
    name: 'Al-Faisaly SC',
    primaryColor: '#2563eb',
    secondaryColor: '#1e3a8a',
    borderColor: '#60a5fa',
    accentIcon: 'eagle',
  },
  al_wehdat: {
    shortCode: 'WEH',
    name: 'Al Wehdat',
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
    borderColor: '#4ade80',
    accentIcon: 'star',
  },
  al_ramtha: {
    shortCode: 'RAM',
    name: 'Al Ramtha',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    borderColor: '#93c5fd',
    accentIcon: 'crown',
    stripes: true,
  },
  al_ahli: {
    shortCode: 'AHL',
    name: 'Al Ahli Amman',
    primaryColor: '#15803d',
    secondaryColor: '#166534',
    borderColor: '#fbbf24',
    accentIcon: 'eagle',
  },
  al_salt: {
    shortCode: 'SLT',
    name: 'Al-Salt SC',
    primaryColor: '#1e40af',
    secondaryColor: '#0369a1',
    borderColor: '#38bdf8',
    accentIcon: 'shield',
  },
  al_jazeera: {
    shortCode: 'JAZ',
    name: 'Al Jazeera Club',
    primaryColor: '#e11d48',
    secondaryColor: '#9f1239',
    borderColor: '#fca5a5',
    accentIcon: 'crown',
  },
  moghayer: {
    shortCode: 'SAR',
    name: 'Moghayer Al Sarhan',
    primaryColor: '#1d4ed8',
    secondaryColor: '#991b1b',
    borderColor: '#93c5fd',
    accentIcon: 'shield',
  },
  maan: {
    shortCode: 'MAA',
    name: 'FC Maan',
    primaryColor: '#b91c1c',
    secondaryColor: '#0f172a',
    borderColor: '#f59e0b',
    accentIcon: 'star',
  },
  al_sareeh: {
    shortCode: 'SRE',
    name: 'Al Sareeh',
    primaryColor: '#b91c1c',
    secondaryColor: '#1e3a8a',
    borderColor: '#fda4af',
    accentIcon: 'shield',
  },
  shabab_al_aqaba: {
    shortCode: 'AQA',
    name: 'Shabab Al Aqaba',
    primaryColor: '#0284c7',
    secondaryColor: '#075985',
    borderColor: '#7dd3fc',
    accentIcon: 'waves',
  },
  sahab: {
    shortCode: 'SHB',
    name: 'Sahab SC',
    primaryColor: '#2563eb',
    secondaryColor: '#ca8a04',
    borderColor: '#fde047',
    accentIcon: 'crown',
  },
};

export function resolveTeamBrand(teamName?: string | null): TeamBrandStyle {
  const norm = (teamName || '').trim().toLowerCase();

  if (norm.includes('shabab') && (norm.includes('ordon') || norm.includes('jordan') || norm.includes('club') || norm.includes('sao'))) {
    return JORDAN_TEAMS_BRAND.shabab_al_ordon;
  }
  if (norm.includes('hussein') || norm.includes('irbid')) {
    return JORDAN_TEAMS_BRAND.al_hussein;
  }
  if (norm.includes('faisaly') || norm.includes('faisali')) {
    return JORDAN_TEAMS_BRAND.al_faisaly;
  }
  if (norm.includes('wehdat') || norm.includes('wihdat')) {
    return JORDAN_TEAMS_BRAND.al_wehdat;
  }
  if (norm.includes('ramtha')) {
    return JORDAN_TEAMS_BRAND.al_ramtha;
  }
  if (norm.includes('ahli')) {
    return JORDAN_TEAMS_BRAND.al_ahli;
  }
  if (norm.includes('salt')) {
    return JORDAN_TEAMS_BRAND.al_salt;
  }
  if (norm.includes('jazeera') || norm.includes('jazira')) {
    return JORDAN_TEAMS_BRAND.al_jazeera;
  }
  if (norm.includes('moghayer') || norm.includes('sarhan')) {
    return JORDAN_TEAMS_BRAND.moghayer;
  }
  if (norm.includes('maan') || norm.includes("ma'an")) {
    return JORDAN_TEAMS_BRAND.maan;
  }
  if (norm.includes('sareeh') || norm.includes('sarih')) {
    return JORDAN_TEAMS_BRAND.al_sareeh;
  }
  if (norm.includes('aqaba')) {
    return JORDAN_TEAMS_BRAND.shabab_al_aqaba;
  }
  if (norm.includes('sahab')) {
    return JORDAN_TEAMS_BRAND.sahab;
  }

  // Generic procedural generator based on team name
  const words = (teamName || 'Team').trim().split(' ').filter(Boolean);
  const initials = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (teamName || 'TM').substring(0, 3).toUpperCase();

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;

  return {
    shortCode: initials,
    name: teamName || 'Equipo',
    primaryColor: `hsl(${hue1}, 80%, 50%)`,
    secondaryColor: `hsl(${hue2}, 85%, 35%)`,
    borderColor: `hsl(${hue1}, 90%, 70%)`,
    accentIcon: 'shield',
  };
}

// ── VECTOR SHIELD COMPONENT ──

export function TeamVectorShield({
  brand,
  size = 36,
  className = '',
}: {
  brand: TeamBrandStyle;
  size?: number;
  className?: string;
}) {
  const uniqueId = brand.shortCode.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <svg
      viewBox="0 0 52 62"
      style={{ width: `${size}px`, height: `${(size * 62) / 52}px` }}
      className={`shrink-0 drop-shadow-md select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={`shield-bg-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={brand.primaryColor} />
          <stop offset="55%" stopColor={brand.secondaryColor} />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
        <linearGradient id={`shield-border-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor={brand.borderColor} />
          <stop offset="85%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>

      {/* Outer Shield Shell */}
      <path
        d="M 10 4 L 42 4 C 47 4 48 7 48 12 L 48 28 C 48 47 28 57 26 59 C 24 57 4 47 4 28 L 4 12 C 4 7 5 4 10 4 Z"
        fill={`url(#shield-bg-${uniqueId})`}
        stroke={`url(#shield-border-${uniqueId})`}
        strokeWidth="2.5"
      />

      {/* Stripes if enabled */}
      {brand.stripes && (
        <g opacity="0.35">
          <line x1="20" y1="7" x2="20" y2="52" stroke="#ffffff" strokeWidth="4.5" />
          <line x1="32" y1="7" x2="32" y2="52" stroke="#ffffff" strokeWidth="4.5" />
        </g>
      )}

      {/* Gloss reflection */}
      <path
        d="M 10 5 L 42 5 C 46 5 47 7 47 11 L 47 22 C 34 26 18 20 5 18 L 5 11 C 5 7 6 5 10 5 Z"
        fill="rgba(255, 255, 255, 0.25)"
      />

      {/* Header Accent Icon */}
      {brand.accentIcon === 'crown' && (
        <polygon
          points="26,8 29,13 34,10 32,17 20,17 18,10 23,13"
          fill="#facc15"
          stroke="#78350f"
          strokeWidth="0.6"
        />
      )}
      {brand.accentIcon === 'star' && (
        <polygon
          points="26,8 28,13 33,13 29,16 31,21 26,18 21,21 23,16 19,13 24,13"
          fill="#facc15"
          stroke="#78350f"
          strokeWidth="0.6"
        />
      )}
      {brand.accentIcon === 'eagle' && (
        <path
          d="M 26 8 C 30 11 36 10 36 14 C 33 13 30 16 26 15 C 22 16 19 13 16 14 C 16 10 22 11 26 8 Z"
          fill="#facc15"
        />
      )}
      {brand.accentIcon === 'waves' && (
        <path
          d="M 14 14 Q 20 10 26 14 Q 32 18 38 14"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />
      )}

      {/* Center Monogram */}
      <text
        x="26"
        y="37"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={brand.shortCode.length > 2 ? '11.5' : '14'}
        fontWeight="900"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
        style={{ filter: 'drop-shadow(0 1.5px 3px rgba(0,0,0,0.95))' }}
      >
        {brand.shortCode}
      </text>

      {/* Bottom Trim */}
      <circle cx="26" cy="49" r="2.5" fill="#facc15" />
    </svg>
  );
}

// ── TEAM LOGO COMPONENT ──

export interface TeamLogoProps {
  teamName?: string | null;
  match?: Match | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  showName?: boolean;
}

export function TeamLogo({
  teamName,
  match,
  logoUrl,
  size = 20,
  className = '',
  showName = false,
}: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [teamName, logoUrl]);

  if (!teamName && !logoUrl) return null;

  const cleanName = (teamName || '').trim().toLowerCase();
  const isShabab =
    cleanName.includes('shabab') &&
    (cleanName.includes('ordon') || cleanName.includes('jordan') || cleanName.includes('club') || cleanName.includes('sao'));

  // 1. Shabab Al Ordon always renders the official /logo.png
  if (isShabab) {
    return (
      <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        <img
          src="/logo.png"
          alt="Shabab Al Ordon"
          className="object-contain rounded-full bg-slate-950 p-0.5 shrink-0 border border-amber-500/50 shadow-sm"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
        {showName && <span>{teamName || 'Shabab Al Ordon'}</span>}
      </span>
    );
  }

  // 2. Resolve external image url if provided (filter out invalid flashscore links or accidental /logo.png on opponents)
  let resolvedUrl: string | null = logoUrl || null;

  if (!resolvedUrl && match) {
    if (match.home_team.trim().toLowerCase() === cleanName && match.home_team_logo) {
      resolvedUrl = match.home_team_logo;
    } else if (match.away_team.trim().toLowerCase() === cleanName && match.away_team_logo) {
      resolvedUrl = match.away_team_logo;
    }
  }

  // If resolvedUrl is /logo.png for an opponent, discard it so it doesn't wrongly render Shabab's logo
  if (resolvedUrl === '/logo.png') {
    resolvedUrl = null;
  }

  // If resolvedUrl is a valid custom uploaded image and has not errored, render it
  if (resolvedUrl && !hasError && !resolvedUrl.includes('static.flashscore.com')) {
    return (
      <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        <img
          src={resolvedUrl}
          alt={teamName || 'Equipo'}
          referrerPolicy="no-referrer"
          className="object-contain rounded bg-slate-950 p-0.5 shrink-0 border border-slate-700/50 shadow-sm"
          style={{ width: `${size}px`, height: `${size}px` }}
          onError={() => setHasError(true)}
        />
        {showName && teamName && <span>{teamName}</span>}
      </span>
    );
  }

  // 3. Render High-Resolution Vector Shield for the team
  const brand = resolveTeamBrand(teamName);
  return (
    <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      <TeamVectorShield brand={brand} size={size} />
      {showName && teamName && <span>{teamName}</span>}
    </span>
  );
}
