import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ClipboardCheck, Copy, Crown, Edit3, Ellipsis, ExternalLink, LockKeyhole, Play, Settings2, Share2, Sparkles, UsersRound, UserX, X } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Brand } from '../components/Brand';
import { SettingsFields } from '../components/SettingsFields';
import { ThemeToggle } from '../components/ThemeToggle';
import type { GameController } from '../hooks/useGame';
import type { Settings, Visibility } from '../types';

function copyInvite(game: GameController) {
  if (!game.room) return;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const base = isLocal ? 'https://pencilly-app.vercel.app' : window.location.origin;
  const url = new URL(base);
  url.searchParams.set('room', game.room.id);
  void navigator.clipboard.writeText(url.toString()).then(() => {
    if (isLocal) {
      game.notify(`Copied public link for room ${game.room?.id}. Note: For other devices to join, both players must use the live site https://pencilly-app.vercel.app`);
    } else {
      game.notify('Invite link copied to clipboard.');
    }
  }).catch(() => game.notify(`Room code: ${game.room?.id}`));
}

export function Lobby({ game }: { game: GameController }) {
  const room = game.room!;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [editOpen, setEditOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(room.settings);
  const [visibility, setVisibility] = useState<Visibility>(room.visibility);
  const [roomName, setRoomName] = useState(room.name);
  const [copied, setCopied] = useState(false);
  const playerCount = room.players.filter(p => p.connected).length;
  const allReady = room.players.filter(p => p.connected).every(p => p.ready);
  const canStart = game.isHost && playerCount >= 2 && allReady;
  const count = Math.min(Math.max(room.settings.maxPlayers, playerCount), 8);
  const slots = Array.from({ length: Math.max(0, count - playerCount) });
  const subtitle = !game.isHost ? "Waiting for the host to start the game." : playerCount < 2 ? 'Waiting for at least one more player to join.' :
    !allReady ? 'Waiting for all players to ready up.' : 'All players are ready. Click Start Game to begin.';
  useEffect(() => { setSettings(room.settings); setVisibility(room.visibility); setRoomName(room.name); }, [room.settings, room.visibility, room.name]);
  const save = async () => {
    const result = await game.updateSettings(settings, roomName, visibility);
    if (result.ok) setEditOpen(false);
  };
  const copyCode = () => {
    void navigator.clipboard.writeText(room.id).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => game.notify(`Room code: ${room.id}`));
  };
  return (
    <div className="lobby-scene">
      <div className="studio-backdrop" aria-hidden="true" />
      <header className="lobby-topbar page-gutter"><Brand inverse onClick={() => void game.leaveRoom()}/>
        <div className="lobby-top-actions"><div className="room-code-chip"><span>ROOM CODE</span><strong>{room.id}</strong>
          <button type="button" aria-label="Copy room code" onClick={copyCode}>{copied ? <ClipboardCheck size={16}/> : <Copy size={16}/>}</button></div>
          <div className="signed-in"><Avatar index={game.avatar} size={31}/><span>{game.me?.name || game.name}</span></div>
          <ThemeToggle />
        </div></header>
      <main className="lobby-content page-gutter">
        <div className="lobby-intro"><span className="studio-stamp"><Sparkles size={15}/> MATCH LOBBY</span>
          <h1>{room.name}<span className="visibility-pill">{room.visibility === 'private' ? <LockKeyhole size={14}/> : <UsersRound size={14}/>} {room.visibility}</span></h1>
          <p>{subtitle}</p>
        </div>
        {isLocal && (
          <div className="local-warning-banner" role="alert">
            <span>⚠️</span>
            <span>
              You are running on <strong>localhost</strong>. Outside devices cannot connect to a room on your personal computer. To invite friends, both should use the live site: <a href="https://pencilly-app.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>https://pencilly-app.vercel.app</a>
            </span>
          </div>
        )}
        <div className="lobby-board">
          <div className="lobby-players">
            <div className="panel-header"><div><h2>Players <span>{playerCount}/{room.settings.maxPlayers}</span></h2></div><UsersRound size={20}/></div>
            <div className="players-slots">
              {room.players.map(player => (
                <div className={`lobby-player ${!player.connected ? 'player-disconnected' : ''}`} key={player.id}>
                  <div className="lobby-player-name"><span className="lobby-avatar-wrap"><Avatar index={player.avatar} size={42}/>{player.id === room.hostId && <Crown className="avatar-crown" size={17} fill="currentColor" />}</span>
                    <div><strong>{player.name}</strong><small>{player.id === room.hostId ? 'Room Host' : player.id === game.playerId ? 'You' : 'Player'}</small></div></div>
                  <div className="lobby-player-actions">
                    <span className={`ready-label ${player.ready && player.connected ? 'is-ready' : ''}`}>{!player.connected ? 'Offline' : player.ready ? 'Ready' : 'Not Ready'}</span>
                    {player.id !== game.playerId && (
                      game.isHost ? (
                        <button className="kick-action-btn" type="button" title={`Kick ${player.name}`} onClick={() => void game.kickPlayer(player.id)}>
                          <UserX size={14}/> <span>Kick</span>
                        </button>
                      ) : (
                        <button className="votekick-action-btn" type="button" title={`Vote to kick ${player.name}`} onClick={() => void game.voteKickPlayer(player.id)}>
                          <UserX size={14}/> <span>Vote Kick</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
              {slots.map((_, index) => <div className="empty-player" key={index}><span className="dashed-avatar">+</span><span>Waiting for player...</span><Ellipsis size={15}/></div>)}
            </div>
            <div className="invite-bar"><div><Share2 size={19}/><span>Share room code or invite link with friends.</span></div><button type="button" onClick={() => copyInvite(game)}>Copy invite link <ExternalLink size={15}/></button></div>
          </div>
          <div className="lobby-sidebar">
            <div className="lobby-settings-card"><div className="panel-header"><div><h2>Match Rules</h2></div>
              {game.isHost && <button className="small-edit" type="button" onClick={() => setEditOpen(true)}><Edit3 size={14}/> Edit</button>}</div>
              <div className="settings-summary">
                <div><span>Max players</span><strong>{room.settings.maxPlayers}</strong></div>
                <div><span>Rounds</span><strong>{room.settings.rounds}</strong></div>
                <div><span>Drawing time</span><strong>{room.settings.drawTime} sec</strong></div>
                <div><span>Word choices</span><strong>{room.settings.wordCount}</strong></div>
                <div><span>Hints</span><strong>{room.settings.hints}</strong></div>
                <div><span>Word mode</span><strong>{room.settings.wordMode}</strong></div>
                <div><span>Category</span><strong>{room.settings.wordCategory || 'all'}</strong></div>
                <div><span>Language</span><strong>{(room.settings.language || 'en').toUpperCase()}</strong></div>
              </div>
            </div>
            <div className="lobby-action-card">
              {game.isHost ? (
                <button className="start-btn" type="button" disabled={!canStart || game.busy} onClick={() => void game.startGame()}>
                  <Play size={19} fill="currentColor" /> Start Game <span className="start-arrow">&rarr;</span>
                </button>
              ) : (
                <button className={`start-btn ${game.me?.ready ? 'ready-done' : ''}`} type="button" disabled={game.busy}
                  onClick={() => void game.setReady(!game.me?.ready)}>
                  <Check size={20}/> {game.me?.ready ? 'Ready' : 'Ready Up'}
                </button>
              )}
              <div className="lobby-start-hint">{game.isHost ? (canStart ? 'All players are ready.' : 'Requires at least 2 players, all ready.') : (game.me?.ready ? 'Waiting for host to start the game...' : 'Click Ready when you are ready to play.')}</div>
              <button className="lobby-leave" type="button" onClick={() => void game.leaveRoom()}><ArrowLeft size={16}/> Leave Room</button>
            </div>
          </div>
        </div>
      </main>
      {editOpen && <div className="modal-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setEditOpen(false)}>
        <div className="edit-modal" role="dialog" aria-modal="true" aria-label="Edit game settings"><div className="edit-modal-head"><div><span className="tiny-eyebrow">HOST CONTROLS</span><h2>Edit Match Settings</h2></div><button type="button" aria-label="Close" onClick={() => setEditOpen(false)}><X size={21}/></button></div>
          <label className="edit-name-label" htmlFor="edit-room-name">Room name</label><input id="edit-room-name" maxLength={28} className="input dark-input" value={roomName} onChange={e => setRoomName(e.target.value)}/>
          <SettingsFields settings={settings} setSettings={setSettings} visibility={visibility} setVisibility={setVisibility}/>
          <button className="primary-btn wide-btn" type="button" disabled={game.busy} onClick={() => void save()}><Settings2 size={17}/> Save settings <Check size={18} className="push-right"/></button>
        </div>
      </div>}
    </div>
  );
}
