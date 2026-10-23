import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Clock3, Copy, Crown, Lightbulb, Lock, Megaphone, MessageCircle, PenLine, Send, Sparkles, UsersRound, UserX } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Brand } from '../components/Brand';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { ThemeToggle } from '../components/ThemeToggle';
import { socket } from '../lib/socket';
import type { GameController } from '../hooks/useGame';
import type { Message, RoomState } from '../types';

function Scoreboard({ room, game }: { room: RoomState; game: GameController }) {
  const ordered = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <aside className="game-scoreboard game-pane">
      <div className="pane-heading"><div><h2>Scoreboard <span>({room.players.length})</span></h2></div><UsersRound size={18}/></div>
      <div className="scoreboard-list">
        {ordered.map((player, idx) => (
          <div className={`score-player ${player.id === room.drawerId ? 'currently-drawing' : ''}`} key={player.id}>
            <span className="player-rank">{idx === 0 ? <Crown size={16} fill="currentColor"/> : String(idx + 1).padStart(2,'0')}</span>
            <Avatar index={player.avatar} size={42} />
            <div className="score-player-text">
              <strong>{player.name}{player.id === game.playerId ? <span className="is-you">(you)</span> : null}</strong>
              <span>{player.id === room.drawerId ? <><PenLine size={11}/> Drawing</> : room.guessedIds.includes(player.id) ? <><Check size={11}/> Guessed it</> : !player.connected ? 'Offline' : 'Guessing'}</span>
            </div>
            <div className="score-player-end">
              <span className="player-points">{player.score}</span>
              {player.id !== game.playerId && (
                game.isHost ? (
                  <button className="score-kick-btn" type="button" title={`Kick ${player.name}`} onClick={() => void game.kickPlayer(player.id)}>
                    <UserX size={13}/>
                  </button>
                ) : (
                  <button className="score-votekick-btn" type="button" title={`Vote to kick ${player.name}`} onClick={() => void game.voteKickPlayer(player.id)}>
                    <UserX size={13}/>
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function GameChat({ game }: { game: GameController }) {
  const room = game.room!;
  const [messages, setMessages] = useState<Message[]>(room.messages);
  const [draft, setDraft] = useState('');
  const [chatMode, setChatMode] = useState<'guess' | 'chat' | 'broadcast'>('guess');
  const listRef = useRef<HTMLDivElement>(null);
  const alreadyGuessed = room.guessedIds.includes(game.playerId);
  const mayGuess = room.phase === 'drawing' && !game.isDrawer && !alreadyGuessed;

  // Auto-switch mode when guessing is not permitted
  useEffect(() => {
    if (!mayGuess && chatMode === 'guess') {
      setChatMode('chat');
    } else if (mayGuess && chatMode === 'chat') {
      setChatMode('guess');
    }
  }, [mayGuess]);

  const effectiveMode = !mayGuess && chatMode === 'guess' ? 'chat' : chatMode;
  const inputPlaceholder = effectiveMode === 'broadcast'
    ? '📢 Broadcast announcement to everyone...'
    : effectiveMode === 'guess'
      ? 'Type your guess here...'
      : 'Type a chat message...';

  useEffect(() => { setMessages(room.messages); }, [room.id]);
  useEffect(() => {
    const onChat = (message: Message) => setMessages(current => {
      if (current.some(item => item.id === message.id)) return current;
      return [...current, message].slice(-60);
    });
    socket.on('chat_message', onChat);
    return () => { socket.off('chat_message', onChat); };
  }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');

    let result;
    if (effectiveMode === 'broadcast' || text.startsWith('/b ') || text.startsWith('/broadcast ')) {
      const clean = text.replace(/^\/(b|broadcast)\s+/, '');
      result = await game.broadcastChat(clean);
    } else if (effectiveMode === 'chat' || text.startsWith('/c ') || text.startsWith('/chat ')) {
      const clean = text.replace(/^\/(c|chat)\s+/, '');
      result = await game.sendChat(clean);
    } else {
      result = await game.sendGuess(text);
    }

    if (!result.ok) game.notify(result.message || 'Could not send message.');
  };

  return (
    <aside className="game-chat game-pane">
      <div className="pane-heading chat-pane-heading">
        <div><h2>Chat & Guesses</h2></div>
        <MessageCircle size={19}/>
      </div>
      <div className="chat-messages" ref={listRef} role="log" aria-label="Live guesses and chat">
        {messages.length === 0 && <div className="chat-empty"><MessageCircle size={23}/><strong>No messages yet</strong><span>Guesses and messages will appear here.</span></div>}
        {messages.map(message => {
          if (message.kind === 'broadcast') {
            return (
              <div className="chat-broadcast" key={message.id}>
                <div className="broadcast-tag"><Megaphone size={13}/> ANNOUNCEMENT</div>
                <div className="broadcast-body">
                  <strong>{message.playerName || 'Host'}:</strong> {message.text}
                </div>
              </div>
            );
          }
          if (message.kind === 'success') return <div className="chat-success" key={message.id}><CheckCheck size={15}/><span>{message.text}</span></div>;
          if (message.kind === 'system') return <div className="chat-system" key={message.id}><Sparkles size={13}/> {message.text}</div>;
          return (
            <div className={`chat-line ${message.playerId === game.playerId ? 'own-line' : ''}`} key={message.id}>
              <strong>{message.playerName || 'Player'}</strong><span>{message.text}</span>
            </div>
          );
        })}
      </div>
      <div className="chat-composer">
        <div className="chat-mode-tabs">
          {mayGuess && (
            <button
              type="button"
              className={`chat-tab-btn ${effectiveMode === 'guess' ? 'active' : ''}`}
              onClick={() => setChatMode('guess')}
            >
              Guess
            </button>
          )}
          <button
            type="button"
            className={`chat-tab-btn ${effectiveMode === 'chat' ? 'active' : ''}`}
            onClick={() => setChatMode('chat')}
          >
            Chat
          </button>
          {game.isHost && (
            <button
              type="button"
              className={`chat-tab-btn broadcast-tab ${effectiveMode === 'broadcast' ? 'active' : ''}`}
              onClick={() => setChatMode(effectiveMode === 'broadcast' ? 'chat' : 'broadcast')}
            >
              <Megaphone size={12}/> Broadcast
            </button>
          )}
        </div>
        {room.phase === 'drawing' && (
          <div className="chat-tip">
            {game.isDrawer ? <><Lock size={13}/> You are drawing. Secret word is hidden from others.</> : alreadyGuessed ? <><Check size={13}/> Correct guess! You can chat with other players.</> : <><Lightbulb size={13}/> Guess the word or switch tabs to chat.</>}
          </div>
        )}
        <form onSubmit={e => void submit(e)} className="chat-form">
          <input
            maxLength={160}
            aria-label="Write a guess or message"
            autoComplete="off"
            placeholder={inputPlaceholder}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button aria-label="Send" type="submit" disabled={!draft.trim()}><Send size={18}/></button>
        </form>
      </div>
    </aside>
  );
}

function WordPicker({ game }: { game: GameController }) {
  const [selection, setSelection] = useState('');
  useEffect(() => { setSelection(''); }, [game.room?.turn]);
  if (!game.room || game.room.phase !== 'choosing') return null;
  if (!game.isDrawer) return <div className="game-modal-shade" role="status"><div className="choosing-wait"><div className="wait-bubble"><PenLine size={28}/></div>
    <span>ROUND IN PROGRESS</span><h2>Artist is picking a word</h2><p>{game.room.players.find(p => p.id === game.room?.drawerId)?.name} is choosing a word to draw.</p>
    <div className="bouncing-dots"><i/><i/><i/></div></div></div>;
  return <div className="game-modal-shade"><div className="word-picker" role="dialog" aria-modal="true" aria-label="Choose a word">
    <div className="picker-icon"><PenLine size={27}/></div><span className="tiny-eyebrow">YOUR TURN TO DRAW</span>
    <h2>Choose a word to draw</h2><p>Select one word from the options below. Guessers will see blanks until they guess correctly.</p>
    <div className="word-options">{game.wordOptions.length ? game.wordOptions.map(word => (
      <button className={word === selection ? 'chosen' : ''} key={word} type="button" onClick={() => setSelection(word)}>{word}{word === selection && <Check size={19}/>}</button>
    )) : <div className="word-loading">Loading word choices...</div>}</div>
    <button className="primary-btn wide-btn" type="button" disabled={!selection || game.busy} onClick={() => void game.chooseWord(selection)}>Confirm Choice <span className="push-right">&rarr;</span></button>
  </div></div>;
}

function RoundEnded({ room }: { room: RoomState }) {
  if (room.phase !== 'round_end') return null;
  return <div className="round-ended" role="status"><div><Sparkles size={29}/><span>ROUND COMPLETE</span><h2>The word was <em>{room.lastWord}</em></h2><p>Preparing next turn...</p></div></div>;
}

export function Game({ game }: { game: GameController }) {
  const room = game.room!;
  const drawer = room.players.find(p => p.id === room.drawerId);
  const canDraw = !!game.isDrawer && room.phase === 'drawing';
  const roundProgress = (room.turn - 1) / (room.totalTurns || 1) * 100;
  const timeProgress = Math.max(0, Math.min(100, game.remaining / room.settings.drawTime * 100));
  const formattedTime = `${Math.floor(game.remaining / 60).toString().padStart(2,'0')}:${(game.remaining % 60).toString().padStart(2,'0')}`;
  return (
    <div className="game-scene">
      <header className="game-topbar page-gutter">
        <div className="game-top-left"><Brand inverse onClick={() => undefined}/><div className="game-header-divider"/>
          <div className="game-round"><span>ROUND</span><strong>{room.round}<span>/{room.settings.rounds}</span></strong></div></div>
        <div className="top-center-status"><div className="timer-wrap"><Clock3 size={19}/><strong>{room.phase === 'choosing' ? '--:--' : formattedTime}</strong></div>
          <div className="timer-track"><span style={{ width: `${timeProgress}%` }}/></div>
          <span className="turn-counter">Turn {room.turn} of {room.totalTurns}</span></div>
        <div className="game-top-right"><span className="game-code">ROOM <strong>{room.id}</strong></span>
          <button className="game-icon-button" type="button" title="Copy room code" onClick={() => void navigator.clipboard.writeText(room.id).then(() => game.notify('Room code copied.'))}><Copy size={17}/></button>
          <ThemeToggle />
          <button className="game-leave" type="button" onClick={() => void game.leaveRoom()}><ArrowLeft size={15}/> Leave</button>
        </div>
      </header>
      <main className="game-main page-gutter">
        <div className="game-meta-bar"><div className="draw-turn-notice"><span className="live-dot"/><strong>{canDraw ? 'You are drawing' : drawer ? `${drawer.name} is drawing` : 'Preparing...'}</strong><span className="meta-separator"/>
          <span>{room.phase === 'choosing' ? 'Selecting a word' : room.phase === 'round_end' ? 'Round complete' : 'Guess the drawing!'}</span></div>
          <div className="secret-word-display">{canDraw ? <><span>YOUR WORD</span><strong>{game.secretWord || '...'}</strong></> : <><span>THE WORD</span><strong className="word-blanks">{room.wordMask || '_ _ _ _ _'}</strong></>}</div>
        </div>
        <div className="game-layout"><Scoreboard room={room} game={game}/>
          <div className="game-board-column"><div className="board-title"><span>CANVAS</span><span><span className="board-dot"/> Live</span></div>
            <DrawingCanvas key={`${room.id}-${room.turn}`} room={room} canDraw={canDraw}/>
            <div className="progress-rail"><span style={{ width: `${roundProgress}%` }}/></div>
          </div>
          <GameChat game={game}/></div>
        <div className="game-bottom-row"><span>Real-time drawing canvas for stylus, touch, and mouse input. Press Ctrl+Z to undo.</span></div>
      </main>
      <WordPicker game={game}/><RoundEnded room={room}/>
    </div>
  );
}
