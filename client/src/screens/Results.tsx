import { ArrowLeft, Crown, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Brand } from '../components/Brand';
import { TrophyArt } from '../components/Doodles';
import { ThemeToggle } from '../components/ThemeToggle';
import type { GameController } from '../hooks/useGame';

const bits = Array.from({ length: 32 }, (_, idx) => ({
  x: (idx * 67 + 13) % 100,
  y: (idx * 41 + 4) % 85,
  rot: idx * 37,
  delay: (idx % 9) * 0.09,
  color: ['#ffca59', '#75d7b2', '#ff7a9f', '#6faeff', '#ad9cfa'][idx % 5],
}));
export function Results({ game }: { game: GameController }) {
  const room = game.room!;
  const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
  const winner = leaderboard[0];
  return (
    <div className="results-scene">
      <header className="results-topbar page-gutter"><Brand inverse onClick={() => void game.leaveRoom()} />
        <div className="results-top-right">
          <span>ROOM {room.id} <Sparkles size={14}/></span>
          <ThemeToggle />
          <button type="button" onClick={() => void game.leaveRoom()}><ArrowLeft size={16}/> Leave room</button>
        </div>
      </header>
      <div className="confetti-layer" aria-hidden="true">{bits.map((bit, idx) => <i key={idx} style={{ left: `${bit.x}%`, top: `${bit.y}%`, rotate: `${bit.rot}deg`, background: bit.color, animationDelay: `${bit.delay}s` }}/>)}</div>
      <main className="results-content">
        <div className="results-trophy"><TrophyArt/></div>
        <span className="results-eyebrow"><Trophy size={16}/> MATCH COMPLETED</span>
        <h1>Winner: <em>{winner?.name || 'Everyone'}!</em></h1>
        <p className="results-subtitle">Great game! Final standings and scores for this match.</p>
        <div className="results-leaderboard"><div className="results-header"><h2>Final standings</h2><span>{room.settings.rounds} rounds played</span></div>
          {leaderboard.map((player, index) => (
            <div className={`results-player ${index === 0 ? 'top-player' : ''}`} key={player.id}>
              <span className={`rank-number rank-${index + 1}`}>{index === 0 ? <Crown size={20} fill="currentColor"/> : String(index + 1).padStart(2,'0')}</span>
              <Avatar index={player.avatar} size={40}/>
              <div className="results-player-name"><strong>{player.name}</strong><span>{index === 0 ? 'Winner' : index === 1 ? '2nd Place' : index === 2 ? '3rd Place' : 'Participant'}</span></div>
              <div className="result-points"><strong>{player.score.toLocaleString()}</strong><span>points</span></div>
            </div>
          ))}
        </div>
        <div className="results-actions">
          {game.isHost ? <button className="primary-btn" type="button" disabled={game.busy} onClick={() => void game.playAgain()}><RotateCcw size={19}/> Play Again <span>&rarr;</span></button>
            : <div className="waiting-replay">Waiting for the host to start another game...</div>}
          <button type="button" className="outline-on-dark" onClick={() => void game.leaveRoom()}><Home size={18}/> Back to home</button>
        </div>
      </main>
    </div>
  );
}
