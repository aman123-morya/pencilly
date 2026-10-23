import { useState } from 'react';
import { Check, CircleHelp, WifiOff, X } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { useGame } from './hooks/useGame';
import { Home } from './screens/Home';
import { CreateRoom } from './screens/CreateRoom';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import { Results } from './screens/Results';

export default function App() {
  const game = useGame();
  const [howStep, setHowStep] = useState(0);
  return (
    <ThemeProvider>
      {game.screen === 'home' && <Home game={game}/>}
      {game.screen === 'create' && <CreateRoom game={game}/>}
      {game.screen === 'lobby' && game.room && <Lobby game={game}/>}
      {game.screen === 'game' && game.room && <Game game={game}/>}
      {game.screen === 'results' && game.room && <Results game={game}/>}
      {!game.connected && <div className="connection-banner"><WifiOff size={16}/> Reconnecting to the game server...</div>}
      {game.notice && <div className="toast" role="status"><span><Check size={17}/></span>{game.notice}<button type="button" aria-label="Dismiss notification" onClick={() => game.notify('')}><X size={16}/></button></div>}
      {game.showHow && <div className="modal-overlay how-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && game.setShowHow(false)}>
        <div className="how-modal" role="dialog" aria-modal="true" aria-label="How to play Pencilly">
          <button className="how-close" type="button" aria-label="Close" onClick={() => game.setShowHow(false)}><X size={20}/></button>
          <div className="how-emoji"><CircleHelp size={35}/></div><span className="tiny-eyebrow">GAMEPLAY GUIDE</span><h2>How to Play</h2>
          <div className="how-body">{[
            { title: 'Create or Join Lobby', desc: 'Start a room or enter an invite code. Pick your nickname and click Ready.' },
            { title: 'Draw on Your Turn', desc: 'When selected as the artist, choose a secret word and sketch it on the live canvas.' },
            { title: 'Guess & Score Points', desc: 'Submit guesses in the chat box. Fast correct guesses earn high time bonuses.' },
          ].map((step, index) => <button className={howStep === index ? 'how-step-active' : ''} type="button" key={index} onClick={() => setHowStep(index)}><span>0{index+1}</span><strong>{step.title}</strong>{howStep === index && <p>{step.desc}</p>}</button>)}</div>
          <button className="primary-btn wide-btn" type="button" onClick={() => game.setShowHow(false)}>Got it <span className="push-right">&rarr;</span></button>
        </div>
      </div>}
    </ThemeProvider>
  );
}
