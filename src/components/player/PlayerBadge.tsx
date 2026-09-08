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

  let resolvedUrl: string | null = logoUrl || null;

  if (!resolvedUrl && teamName) {
    const cleanName = teamName.trim().toLowerCase();

    // 1. Check match home / away logos
    if (match) {
      if (match.home_team.trim().toLowerCase() === cleanName && match.home_team_logo) {
        resolvedUrl = match.home_team_logo;
      } else if (match.away_team.trim().toLowerCase() === cleanName && match.away_team_logo) {
        resolvedUrl = match.away_team_logo;
      }
    }

    // 2. Check dbStore matches
    if (!resolvedUrl) {
      const matches = dbStore.getMatches();
      const matchedM = matches.find(
        (m) =>
          m.home_team.trim().toLowerCase() === cleanName ||
          m.away_team.trim().toLowerCase() === cleanName
      );
      if (matchedM) {
        resolvedUrl =
          matchedM.home_team.trim().toLowerCase() === cleanName
            ? matchedM.home_team_logo || null
            : matchedM.away_team_logo || null;
      }
    }

    // 3. Check dbStore teams
    if (!resolvedUrl) {
      const teams = dbStore.getTeams();
      const matchedT = teams.find(
        (t) =>
          t.name.trim().toLowerCase() === cleanName ||
          t.short_name?.trim().toLowerCase() === cleanName ||
          cleanName.includes(t.short_name?.trim().toLowerCase() || '___')
      );
      if (matchedT?.logo_url) {
        resolvedUrl = matchedT.logo_url;
      }
    }

    // Enforce /logo.png for Shabab Al Ordon Club
    if (cleanName.includes('shabab') || cleanName.includes('ordon')) {
      resolvedUrl = '/logo.png';
    }
  }

  if (resolvedUrl && !hasError) {
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

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${className}`}>
      <span
        className="rounded bg-slate-950 border border-slate-700/60 flex items-center justify-center shrink-0 font-bold text-[10px] text-cyan-400 select-none"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        🛡️
      </span>
      {showName && teamName && <span>{teamName}</span>}
    </span>
  );
}
