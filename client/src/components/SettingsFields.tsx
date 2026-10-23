import type { CSSProperties, ReactNode } from 'react';
import { BookOpenText, Clock3, Globe2, Lightbulb, LockKeyhole, UsersRound } from 'lucide-react';
import type { Settings, Visibility, WordMode } from '../types';

function NumberSetting({ label, subtitle, icon, value, min, max, step = 1, onChange, suffix }: {
  label: string; subtitle: string; icon: ReactNode; value: number;
  min: number; max: number; step?: number; onChange: (value: number) => void; suffix?: string;
}) {
  return (
    <div className="setting-field">
      <div className="setting-label"><span className="setting-icon">{icon}</span><div><strong>{label}</strong><small>{subtitle}</small></div></div>
      <div className="setting-control">
        <input type="range" aria-label={label} min={min} max={max} step={step} value={value}
          style={{ '--progress': `${(value - min) / (max - min) * 100}%` } as CSSProperties}
          onChange={event => onChange(Number(event.target.value))} />
        <span className="setting-value">{value}{suffix || ''}</span>
      </div>
    </div>
  );
}

export function SettingsFields({ settings, setSettings, visibility, setVisibility }: {
  settings: Settings; setSettings: (value: Settings) => void;
  visibility: Visibility; setVisibility: (value: Visibility) => void;
}) {
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ ...settings, [key]: value });
  return (
    <div className="settings-fields">
      <div className="setting-field privacy-field">
        <div className="setting-label"><span className="setting-icon"><Globe2 size={18}/></span><div><strong>Room Visibility</strong><small>Public listing or private link</small></div></div>
        <div className="visibility-toggle">
          <button type="button" className={visibility === 'public' ? 'selected' : ''} onClick={() => setVisibility('public')}><Globe2 size={16}/><span>Public</span></button>
          <button type="button" className={visibility === 'private' ? 'selected' : ''} onClick={() => setVisibility('private')}><LockKeyhole size={16}/><span>Private</span></button>
        </div>
      </div>
      <NumberSetting label="Max players" subtitle="Room capacity" icon={<UsersRound size={18}/>} value={settings.maxPlayers}
        min={2} max={20} onChange={value => change('maxPlayers', value)} />
      <NumberSetting label="Rounds" subtitle="Everyone draws once per round" icon={<BookOpenText size={18}/>} value={settings.rounds}
        min={2} max={10} onChange={value => change('rounds', value)} />
      <NumberSetting label="Drawing time" subtitle="Seconds each turn" icon={<Clock3 size={18}/>} value={settings.drawTime}
        min={15} max={240} step={5} suffix="s" onChange={value => change('drawTime', value)} />
      <div className="setting-field segmented-setting">
        <div className="setting-label"><span className="setting-icon"><BookOpenText size={18}/></span><div><strong>Word choices</strong><small>Words to pick from</small></div></div>
        <div className="setting-segments">{[1,2,3,4,5].map(value => <button type="button" key={value}
          className={value === settings.wordCount ? 'active' : ''} onClick={() => change('wordCount', value)}>{value}</button>)}</div>
      </div>
      <div className="setting-field segmented-setting">
        <div className="setting-label"><span className="setting-icon"><Lightbulb size={18}/></span><div><strong>Hints</strong><small>Letter reveals during drawing</small></div></div>
        <div className="setting-segments">{[0,1,2,3,4,5].map(value => <button type="button" key={value}
          className={value === settings.hints ? 'active' : ''} onClick={() => change('hints', value)}>{value}</button>)}</div>
      </div>
      <div className="setting-field">
        <div className="setting-label"><span className="setting-icon"><BookOpenText size={18}/></span><div><strong>Word mode</strong><small>Gameplay hint rules</small></div></div>
        <select aria-label="Word mode" className="mode-select" value={settings.wordMode} onChange={e => change('wordMode', e.target.value as WordMode)}>
          <option value="normal">Normal</option><option value="hidden">No letter hints</option><option value="combination">Combination</option>
        </select>
      </div>
    </div>
  );
}
