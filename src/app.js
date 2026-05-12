
import './styles.css';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.querySelector('#app').innerHTML = `
    <main class="app">
      <section class="card">
        <h1>Configuration Supabase manquante</h1>
        <p>Ajoute <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans Vercel ou dans ton fichier .env local.</p>
      </section>
    </main>
  `;
  throw new Error('Missing Supabase env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADN_TYPES = [
  { id: 'rouge', name: 'ADN Rouge', color: '#ff3d5e' },
  { id: 'argente', name: 'ADN Argenté', color: '#d8e4ff' },
  { id: 'noir', name: 'ADN Noir', color: '#9b5cff' },
  { id: 'bleu', name: 'ADN Bleu', color: '#48d8ff' },
  { id: 'dore', name: 'ADN Doré', color: '#ffd36b' },
  { id: 'blanc', name: 'ADN Blanc', color: '#ffffff' },
];

const ROLES = {
  vampire: {
    name: 'Vampire',
    team: 'vampire',
    objective: 'Absorbe les sangs, augmente ta puissance et survis jusqu’à dominer Valdoria.',
    nightAction: 'Mordre ou drainer une cible.'
  },
  geneticien: {
    name: 'Généticien',
    team: 'humain',
    objective: 'Analyse les ADN pour retrouver le vampire.',
    nightAction: 'Analyser une cible.'
  },
  pretre: {
    name: 'Prêtre',
    team: 'humain',
    objective: 'Protège le village avec des bénédictions.',
    nightAction: 'Bénir une cible.'
  },
  medecin: {
    name: 'Médecin',
    team: 'humain',
    objective: 'Sauve une victime potentielle.',
    nightAction: 'Protéger une cible.'
  },
  enqueteur: {
    name: 'Enquêteur',
    team: 'humain',
    objective: 'Observe les comportements suspects.',
    nightAction: 'Inspecter une cible.'
  },
  humain: {
    name: 'Humain',
    team: 'humain',
    objective: 'Débats, vote et tente de survivre.',
    nightAction: 'Dormir.'
  },
};

const AVATAR_ICONS = {
  frog: '🐸',
  human: '🧍',
  bat: '🦇',
  ghost: '👻',
  skull: '💀',
  robot: '🤖',
  wolf: '🐺',
  witch: '🧙',
};

const TYPE_LABEL = {
  avatar: 'Avatar',
  skin: 'Skin',
  title: 'Titre',
};

const BOT_NAMES = [
  'Lucie Sans-Sommeil', 'Gaston du Grenier', 'Boris l’Ail', 'Nora la Blême',
  'Victor Minuit', 'Alma des Brumes', 'Igor Trop-Calme', 'Sybille Rouge',
  'Mila Cendre', 'Octave Minuit', 'Rune Nocturne', 'Elias Brumeux'
];

const BOT_PERSONALITIES = ['parano', 'calme', 'leader', 'suiveur', 'analyste', 'troll', 'peureux'];

const state = {
  session: null,
  profile: null,
  room: null,
  players: [],
  me: null,
  messages: [],
  votes: [],
  actions: [],
  channels: [],
  activeTab: 'game',
  adminSubTab: 'media',
  shopItems: [],
  inventory: [],
  achievements: [],
  unlockedAchievements: [],
  mediaAssets: [],
  allProfiles: [],
  busy: false,
};

const $ = (id) => document.getElementById(id);
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

function code5() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomAdn() {
  return ADN_TYPES[Math.floor(Math.random() * ADN_TYPES.length)].id;
}

function xpForLevel(level) {
  return Math.floor(100 + (level - 1) * 75 + Math.pow(level - 1, 2) * 18);
}

function defaultHistory() {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    trainingGames: 0,
    bestScore: 0,
    totalCoinsEarned: 0,
    totalXpEarned: 0,
    roleCounts: {},
    lastGames: [],
  };
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function isHost() {
  return !!state.room && state.room.host_id === state.session?.user?.id;
}

function isPlaying() {
  return state.room?.status === 'playing';
}

function isLobby() {
  return !state.room || state.room.status === 'lobby';
}

function selectedSkin() {
  return state.profile?.selected_skin || 'default';
}

function assetImage(url, alt = '') {
  if (!url) return '';
  return `<img class="assetImg" src="${esc(url)}" alt="${esc(alt)}" loading="lazy" />`;
}

function publicAssetUrl(path) {
  const { data } = supabase.storage.from('sang-noir-assets').getPublicUrl(path);
  return data.publicUrl;
}

function slugify(input) {
  return String(input || 'asset')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'asset';
}

function itemIcon(item) {
  if (item?.image_url) return assetImage(item.image_url, item.name);
  if (item?.type === 'avatar') return AVATAR_ICONS[item.value] || '👤';
  if (item?.type === 'skin') {
    const map = { default: '⬛', blood: '🩸', moon: '🌙', shadow: '🦇', gold: '👑' };
    return map[item.value] || '🎨';
  }
  if (item?.type === 'title') return '🏷️';
  return '✨';
}

function selectedAvatarIcon() {
  const key = state.profile?.selected_avatar || 'avatar_frog';
  const item = state.shopItems.find(i => i.key === key);
  return item ? itemIcon(item) : '🐸';
}

function hasItem(key) {
  return state.inventory.some(i => i.item_key === key);
}

function alivePlayers() {
  return state.players.filter(p => p.alive);
}

function humanPlayers() {
  return state.players.filter(p => !p.is_bot);
}

function playerById(id) {
  return state.players.find(p => p.id === id);
}

function currentVoteFor(playerId) {
  return state.votes.find(v => v.voter_player_id === playerId && v.day === state.room?.day);
}

function currentActionFor(playerId) {
  return state.actions.find(a => a.actor_player_id === playerId && a.day === state.room?.day && a.phase === state.room?.phase && !a.resolved);
}

function botBrain() {
  return {
    personality: BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)],
    suspicion: {},
    trust: {},
    memory: [],
  };
}

function detectIntent(text) {
  const t = String(text || '').toLowerCase();
  if (/innocent|pas moi|je suis pas|je ne suis pas|c.est pas moi/.test(t)) return 'defense';
  if (/j.accuse|suspect|je vote|votez|contre/.test(t)) return 'accusation';
  if (/preuve|info|indice|analyse|j.ai vu|vision/.test(t)) return 'info';
  if (/vampire|sang|adn|mordu|nuit/.test(t)) return 'vampire';
  if (/\?/.test(t)) return 'question';
  return 'neutral';
}

function botReply(bot, text) {
  const intent = detectIntent(text);
  const personality = bot.bot_brain?.personality || 'calme';
  const replies = {
    defense: {
      parano: ['Tu te défends beaucoup trop.', 'Plus tu dis innocent, moins j’y crois.'],
      calme: ['Ok, mais donne une preuve.', 'Ta défense se tient... pour l’instant.'],
      leader: ['Si tu es innocent, donne une cible claire.'],
      suiveur: ['Je sais pas, les autres en pensent quoi ?'],
      analyste: ['Il faut comparer ça aux votes précédents.'],
      troll: ['C’est exactement ce que dirait une chaise vampire.'],
      peureux: ['J’espère que tu dis vrai...'],
    },
    accusation: {
      parano: ['Enfin quelqu’un le dit.', 'Oui, c’est louche.'],
      calme: ['Pourquoi cette accusation ?'],
      leader: ['Si on vote, on vote groupés.'],
      suiveur: ['Je peux suivre si d’autres suivent.'],
      analyste: ['L’accusation doit coller aux actions de nuit.'],
      troll: ['Le tribunal de taverne est ouvert.'],
      peureux: ['Ça va trop vite...'],
    },
    info: {
      parano: ['Une info floue, c’est suspect.'],
      calme: ['Quelle info exactement ?'],
      leader: ['Donne la cible et le résultat.'],
      suiveur: ['Ok, j’écoute.'],
      analyste: ['Source : rôle, vision ou déduction ?'],
      troll: ['Source : crois-moi frère ?'],
      peureux: ['Sois clair, ça me stresse.'],
    },
    vampire: {
      parano: ['Tu parles beaucoup du vampire...'],
      calme: ['Il faut revenir aux faits.'],
      leader: ['Le vampire profite du flou.'],
      suiveur: ['Oui mais qui alors ?'],
      analyste: ['Le comportement de vote compte plus que les mots.'],
      troll: ['Je suspecte tout le monde, même moi.'],
      peureux: ['Arrêtez avec le vampire...'],
    },
    question: {
      parano: ['Pourquoi tu poses cette question maintenant ?'],
      calme: ['Bonne question.'],
      leader: ['Répondez clairement.'],
      suiveur: ['Oui, je me demandais aussi.'],
      analyste: ['Il manque des données.'],
      troll: ['Question validée par le conseil des gens perdus.'],
      peureux: ['Quelqu’un d’autre répond ?'],
    },
    neutral: {
      parano: ['Je garde ça en tête.'],
      calme: ['D’accord.'],
      leader: ['Ok, mais il faut choisir une direction.'],
      suiveur: ['Peut-être.'],
      analyste: ['Ce n’est pas une preuve, mais c’est une donnée.'],
      troll: ['Je mets ça dans mon dossier imaginaire.'],
      peureux: ['Ça me rassure pas.'],
    },
  };
  const pool = replies[intent]?.[personality] || replies.neutral.calme;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* =========================
   DATA
========================= */

async function ensureProfile() {
  const user = state.session?.user;
  if (!user) return null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    state.profile = existing;
    await ensureStarterInventory();
    await maybeUnlockAchievement('first_profile');
    return existing;
  }

  const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
  const username = metaName || user.email?.split('@')[0] || 'Joueur';

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      history: defaultHistory(),
      selected_avatar: 'avatar_frog',
      selected_skin: 'default',
      selected_title: '',
    })
    .select()
    .single();

  if (error) throw error;

  state.profile = data;
  await ensureStarterInventory();
  await maybeUnlockAchievement('first_profile');
  return data;
}

async function ensureStarterInventory() {
  if (!state.session) return;
  await supabase.rpc('ensure_starter_inventory');
}

async function refreshProfile() {
  if (!state.session) return;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).single();
  if (!error) state.profile = data;
}

async function loadShop() {
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('enabled', true)
    .order('type')
    .order('level_required')
    .order('price');

  if (!error) state.shopItems = data || [];
}

async function loadInventory() {
  if (!state.session) return;
  const { data, error } = await supabase
    .from('player_inventory')
    .select('*')
    .eq('user_id', state.session.user.id);

  if (!error) state.inventory = data || [];
}

async function loadAchievements() {
  const [{ data: all }, { data: unlocked }] = await Promise.all([
    supabase.from('achievements').select('*').order('rarity').order('name'),
    state.session
      ? supabase.from('player_achievements').select('*').eq('user_id', state.session.user.id)
      : Promise.resolve({ data: [] }),
  ]);

  state.achievements = all || [];
  state.unlockedAchievements = unlocked || [];
}

async function loadMediaAssets() {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('enabled', true)
    .order('created_at', { ascending: false });

  if (!error) state.mediaAssets = data || [];
}

async function loadAdminData() {
  if (!isAdmin()) return;

  const [{ data: profiles }, { data: media }] = await Promise.all([
    supabase.from('profiles').select('id, username, role, coins, xp, level, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('media_assets').select('*').order('created_at', { ascending: false }),
  ]);

  state.allProfiles = profiles || [];
  state.mediaAssets = media || state.mediaAssets;
}

async function refreshAllUserData() {
  if (!state.session) return;
  await refreshProfile();
  await Promise.all([loadShop(), loadInventory(), loadAchievements(), loadMediaAssets()]);
  if (isAdmin()) await loadAdminData();
}

async function maybeUnlockAchievement(key) {
  if (!state.session || state.unlockedAchievements.some(a => a.achievement_key === key)) return;

  const { error } = await supabase.rpc('unlock_achievement', { _achievement_key: key });
  if (!error) {
    await refreshProfile();
    await loadAchievements();
  }
}

async function secureProgress(reason = 'message') {
  if (!state.session) return;
  const { error } = await supabase.rpc('secure_add_progress', { _reason: reason });
  if (!error) {
    await refreshProfile();
    if ((state.profile?.level || 1) >= 5) await maybeUnlockAchievement('level_5');
    if ((state.profile?.level || 1) >= 10) await maybeUnlockAchievement('level_10');
  }
}

/* =========================
   ROOM
========================= */

async function loadRoom(roomId) {
  const [{ data: room }, { data: players }, { data: messages }, { data: votes }, { data: actions }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_players').select('*').eq('room_id', roomId).order('created_at'),
    supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(160),
    supabase.from('votes').select('*').eq('room_id', roomId),
    supabase.from('game_actions').select('*').eq('room_id', roomId),
  ]);

  state.room = room || null;
  state.players = players || [];
  state.messages = messages || [];
  state.votes = votes || [];
  state.actions = actions || [];
  state.me = state.players.find(p => p.user_id === state.session?.user?.id) || null;
}

async function clearChannels() {
  for (const ch of state.channels) await supabase.removeChannel(ch);
  state.channels = [];
}

async function subscribeRoom(roomId) {
  await clearChannels();

  const roomChannel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => reload())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => reload())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => reload())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, () => reload())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_actions', filter: `room_id=eq.${roomId}` }, () => reload())
    .subscribe();

  state.channels.push(roomChannel);
}

let reloading = false;
async function reload() {
  if (!state.room || reloading) return;
  reloading = true;
  await loadRoom(state.room.id);
  render();
  const box = $('messages');
  if (box) box.scrollTop = box.scrollHeight;
  reloading = false;
}

async function systemMessage(message) {
  if (!state.room) return;
  await supabase.from('messages').insert({
    room_id: state.room.id,
    sender_name: 'Système',
    message,
    kind: 'system',
  });
}

async function createRoom() {
  if (state.room) return alert('Tu es déjà dans une partie. Quitte-la avant d’en créer une autre.');

  const code = code5();
  const trainingMode = $('trainingMode')?.checked || false;
  const name = $('displayName')?.value?.trim() || state.profile?.username || 'Joueur';

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: state.session.user.id,
      training_mode: trainingMode,
      bot_difficulty: $('botDifficulty')?.value || 'medium',
      settings: { mode: trainingMode ? 'training' : 'normal' },
      status: 'lobby',
      phase: 'lobby',
      day: 0,
      vampire_power: 0,
    })
    .select()
    .single();

  if (error) return alert(error.message);

  const { error: pErr } = await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: state.session.user.id,
    name,
    ready: true,
    suspicion: trainingMode ? 3 : 12,
    avatar: {
      selected_avatar: state.profile.selected_avatar,
      selected_skin: state.profile.selected_skin,
      selected_title: state.profile.selected_title,
    },
  });

  if (pErr) return alert(pErr.message);

  state.room = room;
  await loadRoom(room.id);
  await subscribeRoom(room.id);
  await maybeUnlockAchievement('first_room');

  if (trainingMode) await addBots(8);
  render();
}

async function joinRoom() {
  if (state.room) return alert('Tu es déjà dans une partie. Quitte-la avant d’en rejoindre une autre.');

  const code = $('joinCode')?.value?.trim()?.toUpperCase();
  const name = $('displayName')?.value?.trim() || state.profile?.username || 'Joueur';
  if (!code) return alert('Entre un code de partie.');

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error || !room) return alert('Partie introuvable.');
  if (room.training_mode) return alert('Cette partie est un entraînement solo.');
  if (room.status !== 'lobby') return alert('Cette partie a déjà commencé.');

  const { error: pErr } = await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: state.session.user.id,
    name,
    ready: false,
    suspicion: 12,
    avatar: {
      selected_avatar: state.profile.selected_avatar,
      selected_skin: state.profile.selected_skin,
      selected_title: state.profile.selected_title,
    },
  });

  if (pErr) return alert(pErr.message);

  state.room = room;
  await loadRoom(room.id);
  await subscribeRoom(room.id);
  render();
}

async function leaveRoom() {
  if (!state.room || !state.me) return;

  const host = isHost();
  if (host) {
    if (!confirm('Tu es l’hôte. Quitter supprimera la partie pour tout le monde. Continuer ?')) return;
    await supabase.from('rooms').delete().eq('id', state.room.id);
  } else {
    await supabase.from('room_players').delete().eq('id', state.me.id);
  }

  await clearChannels();
  state.room = null;
  state.players = [];
  state.me = null;
  state.messages = [];
  state.votes = [];
  state.actions = [];
  render();
}

async function addBots(targetCount = 8) {
  if (!state.room || !isHost()) return;
  await loadRoom(state.room.id);
  if (state.room.status !== 'lobby') return alert('Impossible d’ajouter des bots après le lancement.');

  const existing = state.players.length;
  const toCreate = Math.max(0, targetCount - existing);
  const bots = Array.from({ length: toCreate }, (_, i) => ({
    room_id: state.room.id,
    name: BOT_NAMES[(existing + i) % BOT_NAMES.length],
    is_bot: true,
    ready: true,
    alive: true,
    bot_brain: botBrain(),
    avatar: { base: 'robot' },
  }));

  if (bots.length) {
    const { error } = await supabase.from('room_players').insert(bots);
    if (error) alert(error.message);
  }
}

function assignRoles(players, trainingMode) {
  const shuffled = shuffle(players);
  const roles = ['vampire', 'geneticien', 'medecin', 'enqueteur', 'pretre'];
  while (roles.length < shuffled.length) roles.push('humain');

  const human = shuffled.find(p => !p.is_bot);
  return shuffled.map((p, i) => {
    let role = roles[i] || 'humain';
    if (trainingMode && human?.id === p.id) role = 'vampire';
    if (trainingMode && human?.id !== p.id && role === 'vampire') role = 'humain';

    return {
      id: p.id,
      role,
      adn: role === 'vampire' ? null : randomAdn(),
      absorbed_blood: [],
      suspicion: p.is_bot ? 0 : (trainingMode ? 3 : 12),
    };
  });
}

async function startGame() {
  if (!state.room || !isHost()) return;
  await loadRoom(state.room.id);

  if (state.room.status !== 'lobby') return alert('La partie est déjà lancée.');
  if (state.players.length < 5) return alert('Il faut au moins 5 joueurs/bots.');
  if (!state.players.every(p => p.ready || p.is_bot)) return alert('Tous les joueurs doivent être prêts.');

  const assignments = assignRoles(state.players, state.room.training_mode);

  for (const a of assignments) {
    await supabase
      .from('room_players')
      .update({ role: a.role, adn: a.adn, absorbed_blood: a.absorbed_blood, suspicion: a.suspicion, alive: true })
      .eq('id', a.id);
  }

  await supabase
    .from('rooms')
    .update({ status: 'playing', phase: 'day', day: 1, vampire_power: 0 })
    .eq('id', state.room.id);

  await systemMessage('La partie commence. Les rôles sont distribués. Le village débat.');
  await reload();
}

async function toggleReady() {
  if (!state.me || state.room?.status !== 'lobby') return;
  await supabase.from('room_players').update({ ready: !state.me.ready }).eq('id', state.me.id);
}

async function nextPhase() {
  if (!state.room || !isHost() || !isPlaying()) return;

  if (state.room.phase === 'day') {
    await resolveDayVotes(false);
    await supabase.from('rooms').update({ phase: 'night' }).eq('id', state.room.id);
    await systemMessage('La nuit tombe. Les rôles nocturnes peuvent agir.');
  } else if (state.room.phase === 'night') {
    await autoBotNightActions();
    await resolveNightActions();
    await supabase.from('rooms').update({ phase: 'day', day: state.room.day + 1 }).eq('id', state.room.id);
    await systemMessage('Le jour se lève. Le village se réunit.');
  }

  await checkWin();
  await reload();
}

/* =========================
   ACTIONS / VOTES
========================= */

async function voteTarget(targetId) {
  if (!state.room || !state.me || state.room.phase !== 'day' || !state.me.alive) return;
  if (targetId === state.me.id) return alert('Tu ne peux pas voter contre toi-même.');

  await supabase.from('votes').upsert({
    room_id: state.room.id,
    voter_player_id: state.me.id,
    target_player_id: targetId,
    day: state.room.day,
  }, { onConflict: 'room_id,voter_player_id,day' });

  await systemMessage(`${state.me.name} a voté.`);
}

async function resolveDayVotes(showMessage = true) {
  if (!state.room || !isHost()) return;

  await autoBotVotes();
  await loadRoom(state.room.id);

  const dayVotes = state.votes.filter(v => v.day === state.room.day);
  if (!dayVotes.length) {
    if (showMessage) await systemMessage('Aucun vote à résoudre.');
    return;
  }

  const count = {};
  for (const v of dayVotes) count[v.target_player_id] = (count[v.target_player_id] || 0) + 1;

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return;

  const [targetId, votes] = sorted[0];
  const tied = sorted.filter(([, c]) => c === votes);
  if (tied.length > 1) {
    await systemMessage('Égalité au vote : personne n’est éliminé.');
    return;
  }

  const target = playerById(targetId);
  if (!target || !target.alive) return;

  if (state.room.training_mode && target.role === 'vampire') {
    const minVotes = state.room.bot_difficulty === 'easy' ? 4 : state.room.bot_difficulty === 'medium' ? 3 : 2;
    if (state.room.day <= 1 || votes < minVotes) {
      await systemMessage('Les bots hésitent : pas assez de votes pour condamner le vampire en entraînement.');
      return;
    }
  }

  await supabase.from('room_players').update({ alive: false }).eq('id', target.id);
  await systemMessage(`${target.name} est éliminé par le vote du village.`);
}

async function autoBotVotes() {
  if (!state.room || !isHost()) return;

  const living = alivePlayers();
  const bots = living.filter(p => p.is_bot);
  for (const bot of bots) {
    const already = state.votes.find(v => v.voter_player_id === bot.id && v.day === state.room.day);
    if (already) continue;

    const candidates = living.filter(p => p.id !== bot.id);
    if (!candidates.length) continue;

    let target;
    const human = living.find(p => !p.is_bot);
    const vampire = living.find(p => p.role === 'vampire');

    if (state.room.training_mode && human?.role === 'vampire') {
      const pressure = state.room.bot_difficulty === 'easy' ? 0.10 : state.room.bot_difficulty === 'medium' ? 0.22 : 0.38;
      target = Math.random() < pressure ? human : candidates[Math.floor(Math.random() * candidates.length)];
    } else if (vampire && Math.random() < 0.33) {
      target = vampire;
    } else {
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    await supabase.from('votes').upsert({
      room_id: state.room.id,
      voter_player_id: bot.id,
      target_player_id: target.id,
      day: state.room.day,
    }, { onConflict: 'room_id,voter_player_id,day' });
  }
}

async function submitNightAction(actionType, targetId) {
  if (!state.room || !state.me || state.room.phase !== 'night' || !state.me.alive) return;

  await supabase.from('game_actions').insert({
    room_id: state.room.id,
    actor_player_id: state.me.id,
    target_player_id: targetId || null,
    action_type: actionType,
    phase: 'night',
    day: state.room.day,
    resolved: false,
    payload: {},
  });

  await systemMessage(`${state.me.name} a choisi une action de nuit.`);
}

async function autoBotNightActions() {
  if (!state.room || !isHost()) return;
  await loadRoom(state.room.id);

  const living = alivePlayers();
  const bots = living.filter(p => p.is_bot);

  for (const bot of bots) {
    const already = currentActionFor(bot.id);
    if (already) continue;

    const candidates = living.filter(p => p.id !== bot.id);
    if (!candidates.length) continue;
    let actionType = 'sleep';

    if (bot.role === 'vampire') actionType = Math.random() < 0.7 ? 'bite' : 'drain';
    else if (bot.role === 'medecin') actionType = 'protect';
    else if (bot.role === 'pretre') actionType = 'bless';
    else if (bot.role === 'geneticien') actionType = 'analyze';
    else if (bot.role === 'enqueteur') actionType = 'inspect';

    const target = candidates[Math.floor(Math.random() * candidates.length)];

    await supabase.from('game_actions').insert({
      room_id: state.room.id,
      actor_player_id: bot.id,
      target_player_id: target?.id || null,
      action_type: actionType,
      phase: 'night',
      day: state.room.day,
      resolved: false,
      payload: {},
    });
  }
}

async function resolveNightActions() {
  if (!state.room || !isHost()) return;
  await loadRoom(state.room.id);

  const nightActions = state.actions.filter(a => a.day === state.room.day && a.phase === 'night' && !a.resolved);
  const protectedIds = new Set(nightActions.filter(a => ['protect', 'bless'].includes(a.action_type)).map(a => a.target_player_id));

  for (const action of nightActions) {
    const actor = playerById(action.actor_player_id);
    const target = playerById(action.target_player_id);
    if (!actor || !actor.alive || !target || !target.alive) continue;

    if (actor.role === 'vampire' && ['bite', 'drain'].includes(action.action_type)) {
      const targetAdn = ADN_TYPES.find(a => a.id === target.adn);
      const blood = Array.isArray(actor.absorbed_blood) ? [...actor.absorbed_blood] : [];
      if (targetAdn) {
        const existing = blood.find(b => b.id === targetAdn.id);
        if (existing) existing.count += 1;
        else blood.push({ id: targetAdn.id, name: targetAdn.name, color: targetAdn.color, count: 1 });
      }

      const shouldKill = action.action_type === 'drain';
      await supabase.from('room_players').update({ absorbed_blood: blood }).eq('id', actor.id);
      await supabase.from('rooms').update({ vampire_power: (state.room.vampire_power || 0) + 1 }).eq('id', state.room.id);

      if (shouldKill && !protectedIds.has(target.id)) {
        await supabase.from('room_players').update({ alive: false }).eq('id', target.id);
        await systemMessage(`${target.name} a été retrouvé vidé de son sang.`);
      } else if (protectedIds.has(target.id)) {
        await systemMessage('Une protection a repoussé une attaque nocturne.');
      } else {
        await systemMessage('Quelqu’un a été mordu cette nuit, mais personne n’est mort.');
      }

      if (actor.user_id === state.session.user.id) {
        await maybeUnlockAchievement('first_vampire_bite');
        if (blood.length >= 3) await maybeUnlockAchievement('blood_collector');
      }
    }

    if (actor.role === 'geneticien' && action.action_type === 'analyze' && actor.user_id) {
      await supabase.from('messages').insert({
        room_id: state.room.id,
        sender_player_id: actor.id,
        sender_name: 'Analyse privée',
        message: `${target.name} possède ${ADN_TYPES.find(a => a.id === target.adn)?.name || 'aucun ADN visible'}.`,
        kind: 'private',
      });
    }

    if (actor.role === 'enqueteur' && action.action_type === 'inspect' && actor.user_id) {
      await supabase.from('messages').insert({
        room_id: state.room.id,
        sender_player_id: actor.id,
        sender_name: 'Inspection privée',
        message: `${target.name} semble appartenir à l’équipe ${ROLES[target.role]?.team || 'inconnue'}.`,
        kind: 'private',
      });
    }

    await supabase.from('game_actions').update({ resolved: true }).eq('id', action.id);
  }

  await loadRoom(state.room.id);
  if (state.room.training_mode && state.me?.role === 'vampire') {
    await supabase.rpc('record_training_result', { _room_id: state.room.id });
    await refreshProfile();
    await maybeUnlockAchievement('training_5');
  }
}

async function checkWin() {
  if (!state.room || !isHost()) return;
  await loadRoom(state.room.id);

  const living = alivePlayers();
  const vampires = living.filter(p => ROLES[p.role]?.team === 'vampire');
  const humans = living.filter(p => ROLES[p.role]?.team === 'humain');

  if (!vampires.length) {
    await supabase.from('rooms').update({ status: 'ended', phase: 'ended' }).eq('id', state.room.id);
    await systemMessage('Victoire des humains ! Le vampire a été éliminé.');
  } else if (vampires.length >= humans.length) {
    await supabase.from('rooms').update({ status: 'ended', phase: 'ended' }).eq('id', state.room.id);
    await systemMessage('Victoire du vampire ! Valdoria sombre dans la nuit.');
  }
}

/* =========================
   CHAT / BOT TALK
========================= */

async function sendMessage() {
  const input = $('messageInput');
  const text = input?.value?.trim();
  if (!text || !state.me) return;

  input.value = '';

  await supabase.from('messages').insert({
    room_id: state.room.id,
    sender_player_id: state.me.id,
    sender_name: state.me.name,
    message: text,
    is_bot: false,
  });

  await maybeUnlockAchievement('first_message');
  await secureProgress('message');
  await scheduleBotReplies(text);
}

async function scheduleBotReplies(text) {
  if (!state.room || state.room.phase !== 'day' || !isPlaying()) return;
  await loadRoom(state.room.id);

  const bots = shuffle(state.players.filter(p => p.is_bot && p.alive));
  const maxReplies = state.room.bot_difficulty === 'pro' ? 3 : state.room.bot_difficulty === 'medium' ? 2 : 1;
  const speakers = bots.slice(0, maxReplies);

  speakers.forEach((bot, index) => {
    setTimeout(async () => {
      await supabase.from('messages').insert({
        room_id: state.room.id,
        sender_player_id: bot.id,
        sender_name: bot.name,
        message: `@${state.me.name} ${botReply(bot, text)}`,
        is_bot: true,
      });
    }, 500 + index * 850);
  });
}

/* =========================
   AUTH
========================= */

async function signUp() {
  const email = $('email').value.trim();
  const password = $('password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  $('authMsg').textContent = error ? error.message : 'Compte créé. Vérifie ton email si Supabase le demande.';
}

async function signIn() {
  const email = $('email').value.trim();
  const password = $('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  $('authMsg').textContent = error ? error.message : '';
}

async function signInWithDiscord() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.origin },
  });
  if (error) $('authMsg').textContent = error.message;
}

async function signOut() {
  await clearChannels();
  await supabase.auth.signOut();
}

/* =========================
   SHOP / PROFILE
========================= */

async function saveProfileEdits() {
  const username = $('profileUsername')?.value?.trim() || 'Joueur';
  const { error } = await supabase.from('profiles').update({ username }).eq('id', state.session.user.id);
  if (error) return alert(error.message);
  await refreshProfile();
  render();
}

async function buyItem(key) {
  const { error } = await supabase.rpc('purchase_shop_item', { _item_key: key });
  if (error) return alert(error.message);
  await loadInventory();
  await refreshProfile();
  await maybeUnlockAchievement('first_purchase');
  if (state.inventory.length >= 5) await maybeUnlockAchievement('collector_5');
  render();
}

async function equipItem(key) {
  const { error } = await supabase.rpc('equip_shop_item', { _item_key: key });
  if (error) return alert(error.message);
  await refreshProfile();
  render();
}

/* =========================
   ADMIN
========================= */

async function uploadAdminMedia() {
  if (!isAdmin()) return alert('Admin only');

  const file = $('mediaFile')?.files?.[0];
  const rawKey = $('mediaKey')?.value?.trim();
  const name = $('mediaName')?.value?.trim() || rawKey || file?.name || 'Image';
  const category = $('mediaCategory')?.value || 'other';

  if (!file) return alert('Choisis une image.');
  if (file.size > 2 * 1024 * 1024) return alert('Image trop lourde. Max : 2 Mo.');

  const key = slugify(rawKey || name);
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${category}/${key}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('sang-noir-assets')
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (uploadError) return alert(uploadError.message);

  const url = publicAssetUrl(path);

  const { error } = await supabase.rpc('admin_upsert_media_asset', {
    _key: key,
    _name: name,
    _category: category,
    _url: url,
    _storage_path: path,
    _mime_type: file.type,
    _size_bytes: file.size,
  });

  if (error) return alert(error.message);

  await loadAdminData();
  render();
}

async function deleteAdminMedia(id) {
  if (!confirm('Supprimer cette image ?')) return;
  const asset = state.mediaAssets.find(a => a.id === id);
  if (asset?.storage_path) await supabase.storage.from('sang-noir-assets').remove([asset.storage_path]);
  const { error } = await supabase.rpc('admin_delete_media_asset', { _id: id });
  if (error) return alert(error.message);
  await loadAdminData();
  render();
}

async function setShopImage(shopKey) {
  const url = $(`shopImage_${shopKey}`)?.value || null;
  const { error } = await supabase.rpc('admin_set_shop_image', { _shop_key: shopKey, _image_url: url });
  if (error) return alert(error.message);
  await loadShop();
  render();
}

async function setUserRole(userId, role) {
  if (!confirm(`Confirmer le rôle ${role} ?`)) return;
  const { error } = await supabase.rpc('admin_set_user_role', { _user_id: userId, _role: role });
  if (error) return alert(error.message);
  await loadAdminData();
  render();
}

/* =========================
   RENDER
========================= */

function render() {
  document.querySelector('#app').innerHTML = `
    <main class="app">
      <header class="topbar">
        <div class="brand">
          <h1>Vampires de Valdoria</h1>
          <p>Jeu social à rôles cachés — vampires, ADN, soupçons et trahisons.</p>
        </div>
        <div class="actions">
          ${state.session ? `<button class="secondary" id="logoutBtn">Déconnexion</button>` : ''}
        </div>
      </header>
      ${!state.session ? renderAuth() : renderLoggedIn()}
    </main>
  `;
  bindEvents();
}

function renderAuth() {
  return `
    <section class="card">
      <h2>Connexion</h2>
      <p class="notice">Connecte-toi pour jouer, sauvegarder ton profil, acheter des cosmétiques et débloquer des succès.</p>
      <div class="authGrid">
        <div>
          <label>Email</label>
          <input id="email" placeholder="email@example.com" />
        </div>
        <div>
          <label>Mot de passe</label>
          <input id="password" type="password" placeholder="minimum 6 caractères" />
        </div>
      </div>
      <div class="actions" style="margin-top:12px">
        <button id="signupBtn">Créer un compte</button>
        <button class="secondary" id="loginBtn">Se connecter</button>
        <button class="secondary discordBtn" id="discordLoginBtn">Connexion Discord</button>
      </div>
      <p id="authMsg"></p>
    </section>
  `;
}

function tabButton(tab, label) {
  return `<button class="tab ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">${label}</button>`;
}

function renderLoggedIn() {
  return `
    <div class="tabs">
      ${tabButton('game', 'Partie')}
      ${tabButton('profile', 'Profil')}
      ${tabButton('shop', 'Boutique')}
      ${tabButton('achievements', 'Succès')}
      ${isAdmin() ? tabButton('admin', 'Admin') : ''}
    </div>
    ${state.activeTab === 'game' ? renderGame() : ''}
    ${state.activeTab === 'profile' ? renderProfilePage() : ''}
    ${state.activeTab === 'shop' ? renderShopPage() : ''}
    ${state.activeTab === 'achievements' ? renderAchievementsPage() : ''}
    ${state.activeTab === 'admin' && isAdmin() ? renderAdminPage() : ''}
  `;
}

function renderGame() {
  return `
    <section class="gameGrid">
      <aside class="card">
        ${state.room ? renderCurrentRoomPanel() : renderCreateJoinPanel()}
      </aside>
      <section class="card">
        ${state.room ? renderRoomMainPanel() : renderWelcomePanel()}
      </section>
      <aside class="card">
        <h2>Chat realtime</h2>
        ${state.room ? renderChat() : `<p class="notice">Crée ou rejoins une partie pour parler.</p>`}
      </aside>
    </section>
  `;
}

function renderCreateJoinPanel() {
  return `
    <h2>Créer / rejoindre</h2>
    <label>Pseudo affiché</label>
    <input id="displayName" value="${esc(state.profile?.username || 'Joueur')}" />
    <label>Difficulté bots</label>
    <select id="botDifficulty">
      <option value="easy">Facile</option>
      <option value="medium" selected>Moyen</option>
      <option value="pro">Pro</option>
    </select>
    <label class="checkLine">
      <input id="trainingMode" type="checkbox" />
      Entraînement vampire contre bots
    </label>
    <button id="createRoomBtn">Créer une partie</button>
    <hr />
    <label>Code de partie</label>
    <input id="joinCode" placeholder="ABCDE" maxlength="5" />
    <button class="secondary" id="joinRoomBtn">Rejoindre</button>
  `;
}

function renderCurrentRoomPanel() {
  const phase = state.room.phase === 'day' ? 'Jour' : state.room.phase === 'night' ? 'Nuit' : state.room.phase === 'ended' ? 'Terminée' : 'Lobby';
  return `
    <h2>Partie actuelle</h2>
    <div class="roomCode">${esc(state.room.code)}</div>
    <div class="phaseBanner phase-${esc(state.room.phase)}">
      <strong>${phase}</strong>
      <span>${state.room.status === 'playing' ? `Jour ${state.room.day}` : state.room.status}</span>
    </div>
    <p class="notice">${state.room.training_mode ? 'Mode entraînement : pas de monnaie ni XP de victoire.' : 'Mode normal.'}</p>
    ${state.room.status === 'lobby' ? `
      <button class="good" id="readyBtn">Prêt / pas prêt</button>
      ${isHost() ? `
        <button id="addBotsBtn">Compléter avec bots</button>
        <button class="warn" id="startBtn">Lancer la partie</button>
      ` : ''}
    ` : ''}
    ${state.room.status === 'playing' && isHost() ? `
      <button class="secondary" id="nextPhaseBtn">Passer à la phase suivante</button>
    ` : ''}
    <button class="danger" id="leaveRoomBtn">Quitter la partie</button>
  `;
}

function renderWelcomePanel() {
  return `
    <h2>Bienvenue à Valdoria</h2>
    <p class="notice">Crée une partie, invite des joueurs avec le code, ou lance un entraînement contre des bots.</p>
    <div class="infoCards">
      <div><strong>Vampire</strong><span>Absorbe les sangs et ment pour survivre.</span></div>
      <div><strong>Humains</strong><span>Débattent, votent et utilisent leurs rôles.</span></div>
      <div><strong>Admin</strong><span>Gère images, boutique et comptes autorisés.</span></div>
    </div>
  `;
}

function renderRoomMainPanel() {
  return `
    <div class="roomHeader">
      <div>
        <h2>Salon</h2>
        <p class="notice">${state.room.status === 'lobby' ? 'Attente des joueurs.' : 'Partie en cours.'}</p>
      </div>
      <span class="pill">${alivePlayers().length}/${state.players.length} vivants</span>
    </div>
    ${renderPlayers()}
    ${state.me ? renderPrivateRole() : ''}
    ${state.me && isPlaying() ? renderActionPanel() : ''}
  `;
}

function renderPlayers() {
  return `
    <div class="players">
      ${state.players.map(p => `
        <div class="player ${p.alive ? '' : 'dead'}">
          <div>
            <strong>${esc(p.name)}</strong>
            ${p.user_id === state.room.host_id ? `<span class="badge host">HÔTE</span>` : ''}
            ${p.is_bot ? `<span class="badge bot">BOT</span>` : ''}
            ${p.ready ? `<span class="badge ready">PRÊT</span>` : ''}
          </div>
          <span class="badge">${p.alive ? 'vivant' : 'mort'}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPrivateRole() {
  const role = state.me.role ? ROLES[state.me.role] : null;
  const blood = Array.isArray(state.me.absorbed_blood) ? state.me.absorbed_blood : [];
  return `
    <div class="roleCard">
      <p class="private">Privé</p>
      <div class="roleName">${role ? esc(role.name) : 'Rôle non attribué'}</div>
      <p>${role ? esc(role.objective) : 'Le rôle sera distribué au lancement.'}</p>
      ${state.me.role === 'vampire' ? `
        <p>Puissance vampirique : <strong>${state.room.vampire_power}</strong></p>
        <div class="bloodChips">
          ${blood.length ? blood.map(b => `<span>${esc(b.name)} ×${b.count}</span>`).join('') : `<span>Aucun sang récupéré</span>`}
        </div>
      ` : state.me.adn ? `<p>Ton ADN : <strong>${esc(ADN_TYPES.find(a => a.id === state.me.adn)?.name || state.me.adn)}</strong></p>` : ''}
    </div>
  `;
}

function renderActionPanel() {
  if (!state.me.alive) return `<div class="actionPanel"><h3>Tu es mort</h3><p class="notice">Tu peux observer, mais tu ne peux plus agir.</p></div>`;
  if (state.room.phase === 'day') return renderDayActions();
  if (state.room.phase === 'night') return renderNightActions();
  if (state.room.phase === 'ended') return `<div class="actionPanel"><h3>Partie terminée</h3></div>`;
  return '';
}

function renderDayActions() {
  const myVote = currentVoteFor(state.me.id);
  return `
    <div class="actionPanel">
      <h3>Actions de jour</h3>
      <p class="notice">Débats, accuse et vote. Ton vote actuel : <strong>${esc(playerById(myVote?.target_player_id)?.name || 'aucun')}</strong></p>
      <div class="targetGrid">
        ${alivePlayers().filter(p => p.id !== state.me.id).map(p => `
          <button class="secondary" data-vote="${esc(p.id)}">Voter ${esc(p.name)}</button>
        `).join('')}
      </div>
      ${isHost() ? `<button class="warn" id="resolveVoteBtn">Résoudre le vote maintenant</button>` : ''}
    </div>
  `;
}

function renderNightActions() {
  const role = ROLES[state.me.role];
  const already = currentActionFor(state.me.id);
  if (already) {
    return `
      <div class="actionPanel">
        <h3>Action de nuit choisie</h3>
        <p class="notice">Tu as déjà choisi : <strong>${esc(already.action_type)}</strong> sur ${esc(playerById(already.target_player_id)?.name || 'personne')}.</p>
      </div>
    `;
  }

  const targets = alivePlayers().filter(p => p.id !== state.me.id);
  let actions = [];

  if (state.me.role === 'vampire') actions = [
    { type: 'bite', label: 'Mordre' },
    { type: 'drain', label: 'Drainer et tuer' },
  ];
  else if (state.me.role === 'medecin') actions = [{ type: 'protect', label: 'Protéger' }];
  else if (state.me.role === 'pretre') actions = [{ type: 'bless', label: 'Bénir' }];
  else if (state.me.role === 'geneticien') actions = [{ type: 'analyze', label: 'Analyser ADN' }];
  else if (state.me.role === 'enqueteur') actions = [{ type: 'inspect', label: 'Inspecter' }];
  else actions = [{ type: 'sleep', label: 'Dormir' }];

  return `
    <div class="actionPanel">
      <h3>Actions de nuit</h3>
      <p class="notice">${esc(role?.nightAction || 'Choisis ton action.')}</p>
      ${actions.map(action => `
        <h4>${esc(action.label)}</h4>
        <div class="targetGrid">
          ${action.type === 'sleep'
            ? `<button data-night-action="${action.type}" data-target="">Dormir</button>`
            : targets.map(p => `<button class="secondary" data-night-action="${action.type}" data-target="${esc(p.id)}">${esc(action.label)} ${esc(p.name)}</button>`).join('')
          }
        </div>
      `).join('')}
    </div>
  `;
}

function renderChat() {
  return `
    <div class="messages" id="messages">
      ${state.messages.map(m => {
        const privateMsg = m.kind === 'private';
        const visible = !privateMsg || m.sender_player_id === state.me?.id || isHost();
        if (!visible) return '';
        return `
          <div class="msg ${m.is_bot ? 'botmsg' : ''} ${m.kind === 'system' ? 'system' : ''} ${privateMsg ? 'privateMsg' : ''}">
            <strong>${esc(m.sender_name)}</strong>
            <p>${esc(m.message)}</p>
          </div>
        `;
      }).join('')}
    </div>
    <div class="chatRow">
      <input id="messageInput" placeholder="Écrire au village..." />
      <button id="sendMsgBtn">Envoyer</button>
    </div>
  `;
}


function renderProfilePage() {
  const h = { ...defaultHistory(), ...(state.profile?.history || {}) };
  const xpNeed = xpForLevel(state.profile?.level || 1);
  const xpPct = Math.min(100, Math.round(((state.profile?.xp || 0) / xpNeed) * 100));
  const mostPlayed = Object.entries(h.roleCounts || {}).sort((a, b) => b[1] - a[1])[0];

  return `
    <section class="card">
      <div class="heroProfile">
        <div class="avatarBig skin-${esc(selectedSkin())}">${selectedAvatarIcon()}</div>
        <div>
          <h2>${esc(state.profile?.username)}</h2>
          <p class="notice">${state.profile?.selected_title ? esc(state.profile.selected_title) : 'Aucun titre équipé'}</p>
          <div class="actions">
            <span class="pill">🩸 ${state.profile?.coins || 0}</span>
            <span class="pill">⭐ Niveau ${state.profile?.level || 1}</span>
            <span class="pill">XP ${state.profile?.xp || 0}/${xpNeed}</span>
            ${isAdmin() ? `<span class="pill adminPill">Admin</span>` : ''}
          </div>
          <div class="xpBar"><i style="width:${xpPct}%"></i></div>
        </div>
      </div>

      <h2>Modifier le profil</h2>
      <div class="inlineForm">
        <div>
          <label>Pseudo</label>
          <input id="profileUsername" value="${esc(state.profile?.username || '')}" />
        </div>
        <button id="saveProfileBtn">Sauvegarder</button>
      </div>

      <h2>Historique</h2>
      <div class="profileStats">
        <div><strong>${h.gamesPlayed || 0}</strong><span>Parties</span></div>
        <div><strong>${h.wins || 0}</strong><span>Victoires</span></div>
        <div><strong>${h.losses || 0}</strong><span>Défaites</span></div>
        <div><strong>${h.trainingGames || 0}</strong><span>Entraînements</span></div>
        <div><strong>${esc(mostPlayed?.[0] || 'Aucun')}</strong><span>Rôle favori</span></div>
        <div><strong>${h.bestScore || 0}</strong><span>Meilleur score</span></div>
      </div>
    </section>
  `;
}

function renderShopPage() {
  const groups = ['avatar', 'skin', 'title'];
  return `
    <section class="card">
      <h2>Boutique</h2>
      <p class="notice">Achats sécurisés par Supabase. Impossible d’ajouter un objet directement depuis le navigateur.</p>
      ${groups.map(type => `
        <h2>${TYPE_LABEL[type] || type}</h2>
        <div class="shopGrid">
          ${state.shopItems.filter(i => i.type === type).map(renderShopItem).join('') || `<p class="notice">Aucun objet.</p>`}
        </div>
      `).join('')}
    </section>
  `;
}

function renderShopItem(item) {
  const owned = hasItem(item.key);
  const levelOk = (state.profile?.level || 1) >= item.level_required;
  const enoughCoins = (state.profile?.coins || 0) >= item.price;
  const equipped =
    (item.type === 'avatar' && state.profile?.selected_avatar === item.key) ||
    (item.type === 'skin' && state.profile?.selected_skin === item.value) ||
    (item.type === 'title' && state.profile?.selected_title === item.value);

  return `
    <div class="shopItem ${owned ? 'owned' : ''} ${!levelOk ? 'locked' : ''}">
      <div class="itemTop">
        <div class="itemIcon">${itemIcon(item)}</div>
        <div>
          <strong>${esc(item.name)}</strong>
          <div class="priceLine">${owned ? 'Possédé' : `${item.price} 🩸`} · Niveau ${item.level_required}</div>
        </div>
      </div>
      <p class="notice">${esc(item.description || item.value)}</p>
      ${owned
        ? `<button class="good" data-equip="${esc(item.key)}" ${equipped ? 'disabled' : ''}>${equipped ? 'Équipé' : 'Équiper'}</button>`
        : `<button data-buy="${esc(item.key)}" ${(!levelOk || !enoughCoins) ? 'disabled' : ''}>${!levelOk ? 'Niveau insuffisant' : !enoughCoins ? 'Pas assez de monnaie' : 'Acheter'}</button>`
      }
    </div>
  `;
}

function renderAchievementsPage() {
  const unlocked = new Set(state.unlockedAchievements.map(a => a.achievement_key));
  const rareUnlocked = state.achievements.filter(a => unlocked.has(a.key) && ['rare', 'epic', 'legendary'].includes(a.rarity));

  return `
    <section class="card">
      <h2>Succès</h2>
      <p class="notice">${state.unlockedAchievements.length}/${state.achievements.length} succès débloqués.</p>

      <h2>Succès rares obtenus</h2>
      <div class="achievementGrid">
        ${rareUnlocked.length ? rareUnlocked.map(a => renderAchievement(a, true)).join('') : `<p class="notice">Aucun succès rare pour l’instant.</p>`}
      </div>

      <h2>Tous les succès</h2>
      <div class="achievementGrid">
        ${state.achievements.map(a => renderAchievement(a, unlocked.has(a.key))).join('')}
      </div>
    </section>
  `;
}

function renderAchievement(a, isUnlocked) {
  const icon = a.rarity === 'legendary' ? '👑' : a.rarity === 'epic' ? '💜' : a.rarity === 'rare' ? '💎' : '🏆';
  return `
    <div class="achievement ${esc(a.rarity)} ${isUnlocked ? 'unlocked' : 'locked'}">
      <div class="itemTop">
        <div class="itemIcon">${isUnlocked ? icon : '🔒'}</div>
        <div>
          <strong>${esc(a.name)}</strong>
          <div class="priceLine">${esc(a.rarity)} ${a.reward_coins ? `· +${a.reward_coins} 🩸` : ''}</div>
        </div>
      </div>
      <p class="notice">${esc(a.description)}</p>
    </div>
  `;
}

/* =========================
   ADMIN RENDER
========================= */

function adminSubButton(tab, label) {
  return `<button class="tab ${state.adminSubTab === tab ? 'active' : ''}" data-admin-subtab="${tab}">${label}</button>`;
}

function renderAdminPage() {
  return `
    <section class="card adminPage">
      <div class="adminHeader">
        <div>
          <h2>Administration</h2>
          <p class="notice">Aucun code à entrer : si ton compte est admin dans Supabase, l’onglet apparaît automatiquement.</p>
        </div>
        <button class="secondary" id="refreshAdminBtn">Rafraîchir</button>
      </div>

      <div class="tabs">
        ${adminSubButton('media', 'Images')}
        ${adminSubButton('shopImages', 'Images boutique')}
        ${adminSubButton('users', 'Admins')}
        ${adminSubButton('help', 'Aide')}
      </div>

      ${state.adminSubTab === 'media' ? renderAdminMedia() : ''}
      ${state.adminSubTab === 'shopImages' ? renderAdminShopImages() : ''}
      ${state.adminSubTab === 'users' ? renderAdminUsers() : ''}
      ${state.adminSubTab === 'help' ? renderAdminHelp() : ''}
    </section>
  `;
}

function renderAdminMedia() {
  return `
    <div class="adminGrid2">
      <div class="adminBox">
        <h3>Ajouter / remplacer une image</h3>
        <p class="notice">Utilise la même clé pour remplacer une image existante.</p>

        <label>Clé de l’image</label>
        <input id="mediaKey" placeholder="ex : avatar_vampire_royal" />

        <label>Nom affiché</label>
        <input id="mediaName" placeholder="ex : Avatar vampire royal" />

        <label>Catégorie</label>
        <select id="mediaCategory">
          <option value="avatar">Avatar</option>
          <option value="shop">Boutique</option>
          <option value="role">Rôle</option>
          <option value="adn">ADN</option>
          <option value="background">Fond</option>
          <option value="ui">Interface</option>
          <option value="other">Autre</option>
        </select>

        <label>Fichier image</label>
        <input id="mediaFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" />

        <button id="uploadMediaBtn">Envoyer l’image</button>
      </div>

      <div class="adminBox">
        <h3>Images existantes</h3>
        <div class="mediaGrid">
          ${state.mediaAssets.length ? state.mediaAssets.map(renderMediaCard).join('') : `<p class="notice">Aucune image pour l’instant.</p>`}
        </div>
      </div>
    </div>
  `;
}

function renderMediaCard(asset) {
  return `
    <div class="mediaCard">
      <div class="mediaPreview">${assetImage(asset.url, asset.name)}</div>
      <div>
        <strong>${esc(asset.name)}</strong>
        <span class="pill">${esc(asset.category)}</span>
        <p class="notice">${esc(asset.key)}</p>
      </div>
      <button class="secondary danger" data-delete-media="${esc(asset.id)}">Supprimer</button>
    </div>
  `;
}

function renderAdminShopImages() {
  return `
    <h3>Associer une image à un objet boutique</h3>
    <div class="shopAdminGrid">
      ${state.shopItems.map(item => `
        <div class="shopItem">
          <div class="itemTop">
            <div class="itemIcon">${itemIcon(item)}</div>
            <div>
              <strong>${esc(item.name)}</strong>
              <div class="priceLine">${esc(item.key)}</div>
            </div>
          </div>
          <select id="shopImage_${esc(item.key)}">
            <option value="">Aucune image custom</option>
            ${state.mediaAssets.map(a => `<option value="${esc(a.url)}" ${item.image_url === a.url ? 'selected' : ''}>${esc(a.name)} · ${esc(a.category)}</option>`).join('')}
          </select>
          <button data-shop-image="${esc(item.key)}">Appliquer image</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdminUsers() {
  return `
    <h3>Qui peut être admin ?</h3>
    <p class="notice">Tu peux autoriser un compte ici. Une fois admin, la personne voit l’onglet Admin automatiquement, sans code.</p>
    <div class="adminUserList">
      ${state.allProfiles.map(p => `
        <div class="adminUser">
          <div>
            <strong>${esc(p.username)}</strong>
            <p class="notice">${esc(p.id)} · rôle : <strong>${esc(p.role)}</strong></p>
          </div>
          <div class="actions">
            <button data-role-admin="${esc(p.id)}" ${p.role === 'admin' ? 'disabled' : ''}>Mettre admin</button>
            <button class="secondary" data-role-player="${esc(p.id)}" ${p.role === 'player' ? 'disabled' : ''}>Retirer admin</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdminHelp() {
  return `
    <div class="adminBox">
      <h3>Première activation admin</h3>
      <p class="notice">Pour le tout premier admin, il faut le faire une seule fois dans Supabase SQL Editor :</p>
      <pre><code>update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'TON_EMAIL'
);</code></pre>
      <p class="notice">Ensuite, tu gères les autres admins directement dans cette page.</p>
    </div>
  `;
}

/* =========================
   EVENTS / INIT
========================= */

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', async () => {
    state.activeTab = btn.dataset.tab;
    if (state.activeTab === 'admin' && isAdmin()) await loadAdminData();
    render();
  }));

  $('signupBtn')?.addEventListener('click', signUp);
  $('loginBtn')?.addEventListener('click', signIn);
  $('discordLoginBtn')?.addEventListener('click', signInWithDiscord);
  $('logoutBtn')?.addEventListener('click', signOut);

  $('createRoomBtn')?.addEventListener('click', createRoom);
  $('joinRoomBtn')?.addEventListener('click', joinRoom);
  $('readyBtn')?.addEventListener('click', toggleReady);
  $('addBotsBtn')?.addEventListener('click', () => addBots(8));
  $('startBtn')?.addEventListener('click', startGame);
  $('nextPhaseBtn')?.addEventListener('click', nextPhase);
  $('leaveRoomBtn')?.addEventListener('click', leaveRoom);
  $('resolveVoteBtn')?.addEventListener('click', () => resolveDayVotes(true));

  $('sendMsgBtn')?.addEventListener('click', sendMessage);
  $('messageInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

  $('saveProfileBtn')?.addEventListener('click', saveProfileEdits);

  document.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => buyItem(btn.dataset.buy)));
  document.querySelectorAll('[data-equip]').forEach(btn => btn.addEventListener('click', () => equipItem(btn.dataset.equip)));
  document.querySelectorAll('[data-vote]').forEach(btn => btn.addEventListener('click', () => voteTarget(btn.dataset.vote)));
  document.querySelectorAll('[data-night-action]').forEach(btn => btn.addEventListener('click', () => submitNightAction(btn.dataset.nightAction, btn.dataset.target || null)));

  document.querySelectorAll('[data-admin-subtab]').forEach(btn => btn.addEventListener('click', async () => {
    state.adminSubTab = btn.dataset.adminSubtab;
    if (isAdmin()) await loadAdminData();
    render();
  }));

  $('refreshAdminBtn')?.addEventListener('click', async () => { await loadAdminData(); render(); });
  $('uploadMediaBtn')?.addEventListener('click', uploadAdminMedia);
  document.querySelectorAll('[data-delete-media]').forEach(btn => btn.addEventListener('click', () => deleteAdminMedia(btn.dataset.deleteMedia)));
  document.querySelectorAll('[data-shop-image]').forEach(btn => btn.addEventListener('click', () => setShopImage(btn.dataset.shopImage)));
  document.querySelectorAll('[data-role-player]').forEach(btn => btn.addEventListener('click', () => setUserRole(btn.dataset.rolePlayer, 'player')));
  document.querySelectorAll('[data-role-admin]').forEach(btn => btn.addEventListener('click', () => setUserRole(btn.dataset.roleAdmin, 'admin')));
}

async function init() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.room = null;
    state.players = [];
    state.me = null;
    state.messages = [];
    state.votes = [];
    state.actions = [];
    await clearChannels();

    if (session) {
      await ensureProfile();
      await refreshAllUserData();
    }

    render();
  });

  if (state.session) {
    await ensureProfile();
    await refreshAllUserData();
  }

  render();
}

init();
