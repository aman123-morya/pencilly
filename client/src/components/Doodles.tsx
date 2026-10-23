export function HeroDoodle() {
  return (
    <div className="hero-doodle" aria-hidden="true">
      <svg viewBox="0 0 570 480" xmlns="http://www.w3.org/2000/svg">
        <path d="M78 38c53-22 97-13 161 7" stroke="#9fc4ff" strokeWidth="24" opacity=".58" fill="none" strokeLinecap="round" />
        <path d="M330 49c48 13 104 9 130-5" stroke="#b9ebba" strokeWidth="17" opacity=".8" fill="none" strokeLinecap="round" />
        <path d="m82 146 19-24m-37 8 18-7m-15 32 17 8" stroke="#f3b82f" strokeWidth="4.5" strokeLinecap="round" />
        <path d="m440 326 23 8m-15 9 16 19m-38-15 4 23" stroke="#ef777a" strokeWidth="5" strokeLinecap="round" />
        <path d="m478 109 12-14 10 15 16-5-8 17 12 12-19 2-7 16-7-18-18-5 14-12Z" fill="none" stroke="#f4bf38" strokeWidth="4" strokeLinejoin="round" />
        <g transform="translate(111 99) rotate(-8 171 142)">
          <rect x="26" y="24" width="339" height="273" rx="19" fill="#263349" opacity=".1" />
          <rect x="10" y="9" width="339" height="273" rx="19" fill="#fcfcff" stroke="#17243b" strokeWidth="6" />
          <path d="M11 53h337" stroke="#17243b" strokeWidth="5" />
          <circle cx="38" cy="31" r="8" fill="#f58c88" /><circle cx="62" cy="31" r="8" fill="#f3c44c" /><circle cx="86" cy="31" r="8" fill="#95d9ad" />
          <g transform="translate(50 54)">
            <path d="M60 175c-22 12-42 8-49-8-8-18-2-41 13-57m24 54c-13 7-17 33 2 42 15 7 26-7 41-10 24-7 51-1 66-24 16-26-13-43-12-66 0-19 27-33 21-58-4-23-23-30-40-28-42 4-55 39-54 84-2 21-10 36-23 60Z" fill="#c5f1a1" stroke="#2b965e" strokeWidth="6.5" strokeLinejoin="round" />
            <path d="m76 67-14-17-9 24m35-38-4-24 24 13m16-15 15-20 6 24m17-8 24-8-12 25" stroke="#2b965e" strokeWidth="5.3" strokeLinecap="round" fill="#c5f1a1" />
            <circle cx="146" cy="42" r="5.4" fill="#162a36" />
            <path d="m156 70 11 4 8-6" stroke="#225439" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d="m65 188-5 25h28l4-19m47-10-2 29h25l5-46" stroke="#2b965e" strokeWidth="6.5" fill="#c5f1a1" strokeLinejoin="round" />
            <path d="M15 109c-14-12-13-24-3-31" stroke="#2b965e" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="m128 135 19 5" stroke="#278453" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
        <g transform="translate(376 31) rotate(22 32 55)">
          <rect x="20" y="6" width="31" height="120" rx="9" fill="#f4c3d8" stroke="#1c2a49" strokeWidth="5" />
          <path d="M21 18h29v17H21Z" fill="#72c1de" stroke="#1c2a49" strokeWidth="4" />
          <path d="M21 106h29l-15 31Z" fill="#e8bf8b" stroke="#1c2a49" strokeWidth="5" strokeLinejoin="round" />
          <path d="m30 130 5 9 5-9" fill="#1c2a49" />
          <path d="M35 39v56" stroke="#f8849f" strokeWidth="4" />
        </g>
        <g transform="translate(42 367) rotate(-7)">
          <rect width="158" height="60" rx="18" fill="#d1f6d8" />
          <path d="m110 58-17 17 2-20" fill="#d1f6d8" />
          <text x="20" y="40" fill="#25443a" fontSize="26" fontFamily="Comic Sans MS,cursive" fontWeight="bold">dinosaur!</text>
        </g>
        <g transform="translate(344 371) rotate(7)">
          <rect width="142" height="59" rx="17" fill="#ffdaea" />
          <path d="m25 55 8 18 12-19" fill="#ffdaea" />
          <text x="20" y="39" fill="#442f45" fontSize="26" fontFamily="Comic Sans MS,cursive" fontWeight="bold">dragon??</text>
        </g>
      </svg>
    </div>
  );
}

export function Scribble({ kind = 'spark', className = '' }: { kind?: 'spark' | 'underline' | 'arrow'; className?: string }) {
  if (kind === 'underline') return <svg className={className} viewBox="0 0 180 24" fill="none" aria-hidden="true"><path d="M4 14C43 1 99 15 176 8" stroke="#f8be4f" strokeWidth="8" strokeLinecap="round" /></svg>;
  if (kind === 'arrow') return <svg className={className} viewBox="0 0 110 90" fill="none" aria-hidden="true"><path d="M9 9C44 13 23 79 90 70m-19-15 21 15-19 14" stroke="#a1d9eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg className={className} viewBox="0 0 70 70" fill="none" aria-hidden="true"><path d="m33 3 2 15m22-5L47 25m19 9-16 3M19 26 8 14m12 24L5 41m25 11-3 13" stroke="#ffc550" strokeWidth="5" strokeLinecap="round" /></svg>;
}

export function TrophyArt() {
  return (
    <svg viewBox="0 0 190 194" width="188" height="190" role="img" aria-label="Golden trophy">
      <ellipse cx="96" cy="174" rx="72" ry="12" fill="#080d1a" opacity=".24" />
      <path d="m63 149 6-11h54l6 11v15H63Z" fill="#8f5329" stroke="#e4a63c" strokeWidth="3" />
      <rect x="53" y="162" width="85" height="13" rx="4" fill="#f9c553" /><rect x="65" y="145" width="62" height="16" rx="4" fill="#f8bb46" />
      <path d="M77 54h37v89H77Z" fill="#dfa13d" />
      <path d="M41 36h111l-10 44c-6 32-27 47-46 47S54 111 49 80Z" fill="#f5ba44" stroke="#f9df8b" strokeWidth="5" />
      <path d="M51 53H24c-5 29 7 46 37 47m83-47h23c5 29-8 46-38 47" stroke="#e4a843" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M61 50c1 42 10 55 21 63" stroke="#ffe28e" strokeWidth="8" opacity=".9" fill="none" strokeLinecap="round" />
      <path d="m94 53 8 19 20 1-16 13 5 19-17-11-17 11 6-19-15-13 19-1Z" fill="#fff1b2" opacity=".85" />
      <path d="m18 27 8 6m136-18-10 9m18 102-12 3M25 125l-10 6M98 9v12" stroke="#ffce68" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
