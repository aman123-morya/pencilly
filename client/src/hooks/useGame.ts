import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';
import type { Player, RoomState, Screen, Settings, SocketAck, Visibility } from '../types';

const SESSION_KEY = 'pencilly.session';
const ROOM_KEY = 'pencilly.room';
const NAME_KEY = 'pencilly.name';
const AVATAR_KEY = 'pencilly.avatar';
const getSession = () => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};
const sessionId = getSession();

function send<T extends object>(event: string, payload: T = {} as T): Promise<SocketAck> {
  return new Promise(resolve => {
    socket.timeout(12000).emit(event, payload, (error: Error | null, answer: SocketAck) => {
      if (error) resolve({ ok: false, message: 'The server did not respond. Try again.' });
      else resolve(answer || { ok: false, message: 'Something went wrong.' });
    });
  });
}

export function useGame() {
  const [screen, setScreen] = useState<Screen>('home');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState(sessionId);
  const [name, setName] = useState(localStorage.getItem(NAME_KEY) || '');
  const [avatar, setAvatar] = useState(Number(localStorage.getItem(AVATAR_KEY) || 0));
  const [connected, setConnected] = useState(socket.connected);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [secretWord, setSecretWord] = useState('');
  const [remaining, setRemaining] = useState(80);
  const [showHow, setShowHow] = useState(false);
  const playerRef = useRef(sessionId);
  const attemptedReconnect = useRef(false);
  playerRef.current = playerId;

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      const remembered = sessionStorage.getItem(ROOM_KEY);
      if (remembered && !attemptedReconnect.current) {
        attemptedReconnect.current = true;
        send('join_room', { roomId: remembered, playerName: localStorage.getItem(NAME_KEY) || 'Player',
          avatar: Number(localStorage.getItem(AVATAR_KEY) || 0), sessionId })
          .then(result => {
            if (!result.ok) {
              sessionStorage.removeItem(ROOM_KEY);
              setNotice(result.message || 'Could not rejoin the room.');
              setRoom(null);
              setScreen('home');
            }
          });
      }
    };
    const onDisconnect = () => { setConnected(false); attemptedReconnect.current = false; };
    const onGameState = (incoming: RoomState) => {
      setRoom(incoming);
      setRemaining(incoming.remainingSeconds);
      if (incoming.phase === 'lobby') {
        setScreen('lobby');
        setWordOptions([]);
        setSecretWord('');
      } else if (incoming.phase === 'finished') {
        setScreen('results');
        setWordOptions([]);
      } else {
        setScreen('game');
      }
      if (incoming.phase === 'choosing' && incoming.drawerId !== playerRef.current) {
        setSecretWord('');
        setWordOptions([]);
      }
    };
    const onRoundStart = (payload: { wordOptions: string[] }) => {
      setWordOptions(payload.wordOptions);
      setSecretWord('');
    };
    const onSecretWord = (payload: { word: string }) => {
      setSecretWord(payload.word);
      setWordOptions([]);
    };
    const onTimer = (payload: { remainingSeconds: number }) => setRemaining(payload.remainingSeconds);
    const onError = (error: { message?: string }) => setNotice(error.message || 'Connection error');
    const onKicked = (payload?: { reason?: string }) => {
      sessionStorage.removeItem(ROOM_KEY);
      attemptedReconnect.current = false;
      setNotice(payload?.reason || 'You have been kicked from the room.');
      setRoom(null);
      setScreen('home');
      setWordOptions([]);
      setSecretWord('');
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_state', onGameState);
    socket.on('round_start', onRoundStart);
    socket.on('secret_word', onSecretWord);
    socket.on('timer_tick', onTimer);
    socket.on('connect_error', onError);
    socket.on('kicked', onKicked);
    socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state', onGameState);
      socket.off('round_start', onRoundStart);
      socket.off('secret_word', onSecretWord);
      socket.off('timer_tick', onTimer);
      socket.off('connect_error', onError);
      socket.off('kicked', onKicked);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (notice) {
      const timeout = window.setTimeout(() => setNotice(''), 4800);
      return () => clearTimeout(timeout);
    }
  }, [notice]);

  const remember = (nextName: string, nextAvatar: number, roomId: string) => {
    localStorage.setItem(NAME_KEY, nextName);
    localStorage.setItem(AVATAR_KEY, String(nextAvatar));
    sessionStorage.setItem(ROOM_KEY, roomId);
    setPlayerId(sessionId);
    attemptedReconnect.current = true;
  };
  const wrap = useCallback(async (action: () => Promise<SocketAck>) => {
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok) setNotice(result.message || 'Something went wrong.');
      return result;
    } catch {
      setNotice('Could not reach the server. Please check your connection.');
      return { ok: false, message: 'Connection failed.' } as SocketAck;
    } finally {
      setBusy(false);
    }
  }, []);
  const createRoom = async (roomName: string, visibility: Visibility, settings: Settings) => {
    const result = await wrap(() => send('create_room', {
      hostName: name.trim(), avatar, roomName, visibility, settings, sessionId,
    }));
    if (result.ok && result.roomId) remember(name.trim(), avatar, result.roomId);
  };
  const joinRoom = async (roomId: string) => {
    const result = await wrap(() => send('join_room', {
      roomId: roomId.trim().toUpperCase(), playerName: name.trim(), avatar, sessionId,
    }));
    if (result.ok && result.roomId) remember(name.trim(), avatar, result.roomId);
  };
  const leaveRoom = async () => {
    await send('leave_room');
    sessionStorage.removeItem(ROOM_KEY);
    attemptedReconnect.current = false;
    setRoom(null);
    setScreen('home');
    setWordOptions([]);
    setSecretWord('');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };
  const setReady = async (ready: boolean) => {
    await wrap(() => send('set_ready', { ready }));
  };
  const updateSettings = async (settings: Settings, roomName: string, visibility: Visibility) => {
    return wrap(() => send('update_settings', { settings, roomName, visibility }));
  };
  const startGame = async () => { await wrap(() => send('start_game')); };
  const chooseWord = async (word: string) => { await wrap(() => send('word_chosen', { word })); };
  const playAgain = async () => { await wrap(() => send('play_again')); };
  const sendGuess = async (text: string) => send('guess', { text });
  const sendChat = async (text: string) => send('chat', { text });
  const kickPlayer = async (targetPlayerId: string) => wrap(() => send('kick_player', { targetPlayerId }));
  const voteKickPlayer = async (targetPlayerId: string) => wrap(() => send('votekick_player', { targetPlayerId }));
  const broadcastChat = async (text: string) => wrap(() => send('broadcast_chat', { text }));
  const notify = (text: string) => setNotice(text);
  const me: Player | undefined = room?.players.find(player => player.id === playerId);
  const isHost = room?.hostId === playerId;
  const isDrawer = room?.drawerId === playerId;

  return {
    screen, setScreen, room, me, playerId, isHost, isDrawer,
    name, setName, avatar, setAvatar, connected, busy, notice,
    wordOptions, secretWord, remaining, showHow, setShowHow,
    createRoom, joinRoom, leaveRoom, setReady, updateSettings, startGame,
    chooseWord, playAgain, sendGuess, sendChat, kickPlayer, voteKickPlayer, broadcastChat, notify,
  };
}
export type GameController = ReturnType<typeof useGame>;
