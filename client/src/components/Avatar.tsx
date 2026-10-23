import { useId } from 'react';
import type { CSSProperties } from 'react';

const looks = [
  { bg: '#f7bad0', shirt: '#6a61ce', skin: '#f6ba89', hair: '#442b34', style: 0 },
  { bg: '#fee1a1', shirt: '#178e7e', skin: '#dc9264', hair: '#2d2c37', style: 1 },
  { bg: '#8ec3f9', shirt: '#ee8562', skin: '#efbf90', hair: '#4a2734', style: 2 },
  { bg: '#b7e3cb', shirt: '#6f6ed8', skin: '#a9634d', hair: '#2c2131', style: 3 },
  { bg: '#d0b8f2', shirt: '#dc695f', skin: '#edb38e', hair: '#6e4838', style: 4 },
  { bg: '#ffc8a2', shirt: '#356db2', skin: '#995b44', hair: '#241f28', style: 5 },
  { bg: '#a8e6de', shirt: '#d061a4', skin: '#d9a073', hair: '#542e2c', style: 6 },
  { bg: '#ffdfad', shirt: '#597bb3', skin: '#f4c59d', hair: '#5c3325', style: 7 },
];

export function Avatar({ index = 0, size = 42, className = '' }: {
  index?: number; size?: number; className?: string;
}) {
  const clipId = useId();
  const look = looks[((index % looks.length) + looks.length) % looks.length];
  return (
    <svg aria-label="Player avatar" role="img" className={`avatar-svg ${className}`} viewBox="0 0 48 48"
      width={size} height={size} style={{ '--avatar-bg': look.bg } as CSSProperties}>
      <defs><clipPath id={clipId}><circle cx="24" cy="24" r="24" /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="48" height="48" fill={look.bg} />
        <circle cx="39" cy="10" r="8" fill="#fff" opacity=".2" />
        <path d="M5 51 Q7 38 17 36 L31 36 Q42 39 45 51" fill={look.shirt} />
        <rect x="20" y="31" width="8" height="9" rx="3" fill={look.skin} />
        {look.style % 3 === 0 && <path d="M11 24 C10 9 15 6 25 6 C38 6 40 16 36 34 L30 37 16 36 Z" fill={look.hair} />}
        {look.style % 3 === 1 && <path d="M12 23 C8 15 14 6 25 7 C36 7 40 15 37 26 L33 30 14 29 Z" fill={look.hair} />}
        {look.style % 3 === 2 && <path d="M11 20 C10 8 19 5 27 8 C38 8 39 18 36 27 L13 27 Z" fill={look.hair} />}
        <ellipse cx="24" cy="24" rx="11.4" ry="13.7" fill={look.skin} />
        {look.style % 3 !== 0 && <path d="M12 21 C13 10 20 8 28 10 Q36 12 36 21 Q29 18 24 15 Q20 19 12 21" fill={look.hair} />}
        {look.style % 3 === 0 && <path d="M12 20 Q11 9 22 10 Q30 8 36 17 L35 21 Q25 16 19 15 Q16 19 12 20" fill={look.hair} />}
        <path d="M18 25 q2 -2 4 0 M27 25 q2 -2 4 0" stroke="#45313a" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        <path d="M22 31 Q25 33 28 30" stroke="#9f6158" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <circle cx="16.4" cy="29" r="2" fill="#e88681" opacity=".43" /><circle cx="32" cy="29" r="2" fill="#e88681" opacity=".43" />
        <path d="M19 39 L24 44 29 39" stroke="#fff" strokeWidth="1.6" opacity=".5" fill="none" />
      </g>
      <circle cx="24" cy="24" r="23.4" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".55" />
    </svg>
  );
}

export const AVATAR_COUNT = looks.length;
