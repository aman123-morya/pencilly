import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Dices,
  Globe2,
  Languages,
  Layers,
  LockKeyhole,
  Minus,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import type { GameController } from '../hooks/useGame';
import { DEFAULT_SETTINGS } from '../types';
import type { Language, Settings, Visibility, WordCategory, WordMode } from '../types';

interface Preset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  settings: Partial<Settings>;
}

const PRESETS: Preset[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎨',
    desc: '3 Rounds · 60s Turns',
    settings: { rounds: 3, drawTime: 60, maxPlayers: 8, wordMode: 'normal', hints: 2, wordCount: 3 },
  },
  {
    id: 'blitz',
    name: 'Fast Blitz',
    icon: '⚡',
    desc: '2 Rounds · 35s Turns',
    settings: { rounds: 2, drawTime: 35, maxPlayers: 6, wordMode: 'normal', hints: 2, wordCount: 3 },
  },
  {
    id: 'chill',
    name: 'Relaxed',
    icon: '🧘',
    desc: '4 Rounds · 80s Turns',
    settings: { rounds: 4, drawTime: 80, maxPlayers: 10, wordMode: 'normal', hints: 3, wordCount: 3 },
  },
];

const RANDOM_NAMES = [
  'Doodle Dojo',
  'Sketch Arena',
  'Pixel Party',
  'Speedy Scribbles',
  'Midnight Picasso',
  'Guessing Galaxy',
  'Canvas Club',
  'The Ink Spot',
  'Brush & Brains',
  'Art Attack',
];

export function CreateRoom({ game }: { game: GameController }) {
  const [roomName, setRoomName] = useState(`${game.name.trim() || 'My'}'s Room`);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, drawTime: 60 });
  const [activePreset, setActivePreset] = useState<string>('classic');

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setActivePreset('custom');
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setSettings(prev => ({ ...prev, ...preset.settings }));
  };

  const randomizeName = () => {
    const list = RANDOM_NAMES.filter(n => n !== roomName);
    const chosen = list[Math.floor(Math.random() * list.length)];
    setRoomName(chosen);
  };

  const handleModeChange = (mode: WordMode) => {
    setActivePreset('custom');
    setSettings(prev => ({
      ...prev,
      wordMode: mode,
      hints: mode === 'hidden' ? 0 : prev.hints === 0 ? 2 : prev.hints,
    }));
  };

  const createRoom = () => {
    const name = roomName.trim() || 'My Room';
    void game.createRoom(name, visibility, settings);
  };

  return (
    <div className="create-scene single-page-scene">
      <div className="studio-backdrop" aria-hidden="true" />
      {/* Compact Topbar */}
      <header className="create-topbar page-gutter">
        <div className="create-topbar-left">
          <Brand onClick={() => game.setScreen('home')} />
          <span className="create-badge">
            <Sparkles size={13} /> Room Setup
          </span>
        </div>
        <div className="create-topbar-right">
          <ThemeToggle />
          <button
            className="ghost-back-btn"
            type="button"
            onClick={() => game.setScreen('home')}
          >
            <ArrowLeft size={16} /> <span>Home</span>
          </button>
        </div>
      </header>

      {/* Centered Single-Page Creator Card (No Scroll) */}
      <main className="create-single-wrap">
        <div className="simple-create-card">
          {/* Card Header & Presets */}
          <div className="simple-card-head">
            <div>
              <h1>Create a Game Room</h1>
              <p>Pick a preset or customize settings below to jump right in.</p>
            </div>
            {/* Quick 1-Click Presets */}
            <div className="simple-presets-pills" role="group" aria-label="Quick presets">
              {PRESETS.map(preset => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`simple-preset-pill ${isActive ? 'preset-pill-active' : ''}`}
                    onClick={() => applyPreset(preset)}
                  >
                    <span>{preset.icon}</span>
                    <strong>{preset.name}</strong>
                    <small>{preset.desc}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Body */}
          <div className="simple-card-body">
            {/* Row 1: Room Name & Visibility */}
            <div className="simple-form-row">
              <div className="simple-field-col name-col">
                <label htmlFor="simple-room-name">Room Name</label>
                <div className="simple-input-wrap">
                  <input
                    id="simple-room-name"
                    maxLength={28}
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="Enter room name..."
                  />
                  <button
                    type="button"
                    className="simple-shuffle-btn"
                    onClick={randomizeName}
                    title="Generate a random name"
                  >
                    <Dices size={17} />
                  </button>
                </div>
              </div>

              <div className="simple-field-col vis-col">
                <label>Visibility</label>
                <div className="simple-segmented-toggle">
                  <button
                    type="button"
                    className={visibility === 'private' ? 'seg-active' : ''}
                    onClick={() => setVisibility('private')}
                  >
                    <LockKeyhole size={16} /> Private
                  </button>
                  <button
                    type="button"
                    className={visibility === 'public' ? 'seg-active' : ''}
                    onClick={() => setVisibility('public')}
                  >
                    <Globe2 size={16} /> Public
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: 3 Essential Game Rules */}
            <div className="simple-rules-grid">
              {/* Max Players */}
              <div className="rule-tile">
                <div className="rule-tile-head">
                  <Users size={17} />
                  <span>Max Players</span>
                </div>
                <div className="rule-stepper">
                  <button
                    type="button"
                    disabled={settings.maxPlayers <= 2}
                    onClick={() => updateSetting('maxPlayers', Math.max(2, settings.maxPlayers - 1))}
                    aria-label="Decrease players"
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{settings.maxPlayers}</strong>
                  <button
                    type="button"
                    disabled={settings.maxPlayers >= 20}
                    onClick={() => updateSetting('maxPlayers', Math.min(20, settings.maxPlayers + 1))}
                    aria-label="Increase players"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Rounds */}
              <div className="rule-tile">
                <div className="rule-tile-head">
                  <Sparkles size={17} />
                  <span>Rounds</span>
                </div>
                <div className="rule-stepper">
                  <button
                    type="button"
                    disabled={settings.rounds <= 2}
                    onClick={() => updateSetting('rounds', Math.max(2, settings.rounds - 1))}
                    aria-label="Decrease rounds"
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{settings.rounds}</strong>
                  <button
                    type="button"
                    disabled={settings.rounds >= 10}
                    onClick={() => updateSetting('rounds', Math.min(10, settings.rounds + 1))}
                    aria-label="Increase rounds"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Draw Time */}
              <div className="rule-tile">
                <div className="rule-tile-head">
                  <Clock3 size={17} />
                  <span>Draw Time</span>
                </div>
                <div className="rule-stepper">
                  <button
                    type="button"
                    disabled={settings.drawTime <= 20}
                    onClick={() => updateSetting('drawTime', Math.max(20, settings.drawTime - 10))}
                    aria-label="Decrease draw time"
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{settings.drawTime}s</strong>
                  <button
                    type="button"
                    disabled={settings.drawTime >= 180}
                    onClick={() => updateSetting('drawTime', Math.min(180, settings.drawTime + 10))}
                    aria-label="Increase draw time"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Word Mode */}
            <div className="simple-mode-row">
              <label>Gameplay Mode</label>
              <div className="simple-mode-pills">
                <button
                  type="button"
                  className={settings.wordMode === 'normal' ? 'mode-pill-active' : ''}
                  onClick={() => handleModeChange('normal')}
                >
                  🎯 <strong>Normal</strong>
                  <small>Letter hints reveal</small>
                </button>
                <button
                  type="button"
                  className={settings.wordMode === 'hidden' ? 'mode-pill-active' : ''}
                  onClick={() => handleModeChange('hidden')}
                >
                  🙈 <strong>Blind</strong>
                  <small>No hints (pure skill)</small>
                </button>
                <button
                  type="button"
                  className={settings.wordMode === 'combination' ? 'mode-pill-active' : ''}
                  onClick={() => handleModeChange('combination')}
                >
                  🧩 <strong>Combo</strong>
                  <small>Compound phrases</small>
                </button>
              </div>
            </div>

            {/* Row 4: Word Category & Language */}
            <div className="simple-form-row category-lang-row">
              <div className="simple-field-col name-col">
                <label htmlFor="simple-category"><Layers size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />Word Category</label>
                <select
                  id="simple-category"
                  className="simple-select-dropdown"
                  value={settings.wordCategory || 'all'}
                  onChange={e => updateSetting('wordCategory', e.target.value as WordCategory)}
                >
                  <option value="all">🌟 All Categories</option>
                  <option value="animals">🐾 Animals</option>
                  <option value="objects">📦 Everyday Objects</option>
                  <option value="food">🍕 Food & Treats</option>
                  <option value="places">🗺️ Places & Landmarks</option>
                </select>
              </div>
              <div className="simple-field-col vis-col">
                <label htmlFor="simple-language"><Languages size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />Language</label>
                <select
                  id="simple-language"
                  className="simple-select-dropdown"
                  value={settings.language || 'en'}
                  onChange={e => updateSetting('language', e.target.value as Language)}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card Footer: Simple Launch Action */}
          <div className="simple-card-footer">
            <button
              type="button"
              className="primary-btn simple-launch-btn"
              disabled={game.busy || !roomName.trim()}
              onClick={createRoom}
            >
              {game.busy ? 'Creating...' : 'Create Room & Play'}
              <ArrowRight size={20} />
            </button>
            <span className="simple-footer-hint">
              {visibility === 'public' ? '🌐 Anyone can find this room' : '🔒 Invite code generated on creation'} · You can also change settings inside the lobby
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
