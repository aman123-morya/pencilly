import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleHelp, Gamepad2, Globe2, Hash, Heart, LockKeyhole, MousePointer2, Pencil, Plus, Sparkles, UsersRound } from 'lucide-react';
import { Avatar, AVATAR_COUNT } from '../components/Avatar';
import { Brand } from '../components/Brand';
import { HeroDoodle } from '../components/Doodles';
import { ThemeToggle } from '../components/ThemeToggle';
import type { GameController } from '../hooks/useGame';
import type { PublicRoom } from '../types';

export function Home({ game }: { game: GameController }) {
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  useEffect(() => {
    const apiBase = import.meta.env.VITE_SOCKET_URL?.trim().replace(/\/$/, '') || (import.meta.env.PROD ? 'https://pencilly-server.onrender.com' : '');
    fetch(`${apiBase}/api/rooms/public`).then(r => r.ok ? r.json() : []).then(setPublicRooms).catch(() => undefined);
  }, []);
  const validName = () => {
    if (game.name.trim().length >= 2) return true;
    game.notify('Pick a player name with at least two characters.');
    return false;
  };
  const join = (roomCode: string) => {
    if (!validName()) return;
    if (roomCode.trim().length < 4) { game.notify('Enter a room code to join.'); return; }
    void game.joinRoom(roomCode);
  };
  return (
    <div className="home-scene">
      <div className="grain" aria-hidden="true" />
      <header className="home-nav page-gutter">
        <Brand onClick={() => game.setScreen('home')} />
        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-current" href="#play">Play</a>
          <a href="#features">What's inside</a>
          <button type="button" onClick={() => game.setShowHow(true)}>How to play</button>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <button className="nav-help" type="button" onClick={() => game.setShowHow(true)}>
            <CircleHelp size={18} /> <span>How it works</span>
          </button>
        </div>
      </header>
      <main id="play" className="home-content page-gutter">
        <div className="home-copy">
          <div className="hero-kicker" role="status">
            <span className="kicker-live">
              <span className="kicker-dot-wrap" aria-hidden="true">
                <span className="kicker-dot-ping" />
                <span className="kicker-dot-core" />
              </span>
              <span>Live</span>
            </span>
            <span className="kicker-text">
              Multiplayer <span className="kicker-text-accent">Draw &amp; Guess</span>
            </span>
            <span className="kicker-icon" aria-hidden="true">
              <Pencil size={12} strokeWidth={2.4} />
            </span>
          </div>
          <h1>Draw, guess,<br /><span>compete live.</span></h1>
          <p className="home-subtitle">Real-time drawing and guessing with friends or public lobbies. Instant play on any device with full stylus and touch support.</p>
          <div className="join-panel">
            <div className="join-panel-header">
              <div>
                <span className="tiny-eyebrow">PLAYER SETUP</span>
                <h2>Get Started</h2>
              </div>
              <span className="no-account"><Heart size={13} fill="currentColor" /> Instant Play</span>
            </div>
            {code.trim().length >= 4 && (
              <div className="invite-notice-box" role="status">
                <Sparkles size={16} />
                <div>
                  <strong>Room Invite Received</strong>
                  <span>You were invited to room <strong>{code}</strong>. Choose a nickname to join!</span>
                </div>
              </div>
            )}
            <label className="field-label" htmlFor="player-name">Your nickname</label>
            <input id="player-name" autoComplete="nickname" maxLength={20} className="input light-input name-input"
              placeholder="Enter nickname" value={game.name} onChange={e => game.setName(e.target.value)}
              autoFocus={code.trim().length >= 4}
              onKeyDown={e => {
                if (e.key === 'Enter' && validName()) {
                  if (code.trim().length >= 4) {
                    join(code);
                  } else {
                    game.setScreen('create');
                  }
                }
              }} />
            <div className="avatar-line">
              <span className="field-label">Choose avatar</span>
              <div className="avatar-options" role="group" aria-label="Choose an avatar">
                {Array.from({ length: AVATAR_COUNT }, (_, idx) => (
                  <button type="button" aria-label={`Avatar ${idx + 1}`} key={idx}
                    className={`avatar-choice ${game.avatar === idx ? 'avatar-choice-selected' : ''}`}
                    onClick={() => game.setAvatar(idx)}><Avatar index={idx} size={35}/></button>
                ))}
              </div>
            </div>
            {code.trim().length >= 4 ? (
              <>
                <button type="button" className="primary-btn wide-btn" disabled={game.busy} onClick={() => join(code)}>
                  <UsersRound size={19} strokeWidth={2.8} /> Join Room {code} <ArrowRight size={18} className="push-right" />
                </button>
                <div className="divide-text"><span />or start your own<span /></div>
                <button type="button" className="secondary-btn wide-btn" onClick={() => validName() && game.setScreen('create')}>
                  <Plus size={17} /> Create New Room
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary-btn wide-btn" onClick={() => validName() && game.setScreen('create')}>
                  <Plus size={19} strokeWidth={2.8} /> Create Room <ArrowRight size={18} className="push-right" />
                </button>
                <div className="divide-text"><span />or join with code<span /></div>
                <div className="join-code-row">
                  <div className="code-input-wrap"><Hash size={17}/><input aria-label="Room code" placeholder="Enter room code" maxLength={12} value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && join(code)} /></div>
                  <button type="button" className="secondary-btn" disabled={game.busy} onClick={() => join(code)}>Join <ArrowUpRight size={16}/></button>
                </div>
              </>
            )}
          </div>
          <div className="home-footnote"><MousePointer2 size={15} /> Works on desktop, mobile, and tablets. No download required.</div>
        </div>
        <div className="home-art-column">
          <div className="illustration-halo" />
          <HeroDoodle />
        </div>
      </main>
      <section id="features" className="feature-strip page-gutter">
        <div className="feature-item"><span className="feature-icon lavender"><UsersRound size={23}/></span><div><strong>Multiplayer Lobbies</strong><span>2-20 players per room</span></div></div>
        <div className="feature-item"><span className="feature-icon lemon"><Gamepad2 size={23}/></span><div><strong>Custom Match Rules</strong><span>Rounds, timer & hint options</span></div></div>
        <div className="feature-item"><span className="feature-icon mint"><Globe2 size={23}/></span><div><strong>Responsive Canvas</strong><span>Stylus, touch & mouse support</span></div></div>
        <div className="feature-spark"><Sparkles size={17}/> Real-time synchronization</div>
      </section>
      {publicRooms.length > 0 && (
        <section className="public-room-strip page-gutter" aria-label="Open public rooms">
          <div className="public-room-title"><LockKeyhole size={15}/> Public Rooms Available</div>
          <div className="public-room-list">{publicRooms.slice(0, 4).map(room => (
            <button type="button" key={room.id} onClick={() => join(room.id)}>{room.name} <span>{room.playerCount}/{room.maxPlayers}</span><ArrowRight size={15}/></button>
          ))}</div>
        </section>
      )}
    </div>
  );
}
