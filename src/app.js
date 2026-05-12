
import './styles.css';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.querySelector('#app').innerHTML = `
    <main class="app">
      <section class="card">
        <h1>Configuration Supabase manquante</h1>
        <p>Crée un fichier <code>.env</code> à partir de <code>.env.example</code>.</p>
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
  vampire: { name: 'Vampire', team: 'vampire', objective: 'Absorbe les sangs, augmente ta puissance et survis.' },
  geneticien: { name: 'Généticien', team: 'humain', objective: 'Analyse les ADN et aide le village.' },
  pretre: { name: 'Prêtre', team: 'humain', objective: 'Protège le village avec des bénédictions.' },
  medecin: { name: 'Médecin', team: 'humain', objective: 'Sauve les cibles importantes.' },
  enqueteur: { name: 'Enquêteur', team: 'humain', objective: 'Observe et trouve les comportements suspects.' },
  humain: { name: 'Humain', team: 'humain', objective: 'Débats, votes et survie.' },
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
  aura: 'Aura',
  frame: 'Cadre',
};

const BOT_NAMES = [
  'Lucie Sans-Sommeil', 'Gaston du Grenier', 'Boris l’Ail', 'Nora la Blême',
  'Victor Minuit', 'Alma des Brumes', 'Igor Trop-Calme', 'Sybille Rouge'
];

const BOT_PERSONALITIES = ['parano', 'calme', 'leader', 'suiveur', 'analyste', 'troll', 'peureux'];

const state = {
  session: null,
  profile: null,
  room: null,
  players: [],
  me: null,
  messages: [],
  channels: [],
  activeTab: 'game',
  adminSubTab: 'media',
  mediaAssets: [],
  allProfiles: [],
  shopItems: [],
  inventory: [],
  achievements: [],
  unlockedAchievements: [],
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

function xpForLevel(level) {
  return Math.floor(100 + (level - 1) * 75 + Math.pow(level - 1, 2) * 18);
}

function normalizeProgress(profile) {
  let level = profile.level || 1;
  let xp = profile.xp || 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return { level, xp };
}

function randomAdn() {
  return ADN_TYPES[Math.floor(Math.random() * ADN_TYPES.length)].id;
}

function makeBotBrain() {
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
    await maybeUnlockAchievement('first_profile');
    return existing;
  }

  const username = user.email?.split('@')[0] || 'Joueur';
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      history: defaultHistory(),
      selected_avatar: 'avatar_frog',
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
  const { error } = await supabase.rpc('ensure_starter_inventory');
  if (error) console.warn('Starter inventory error:', error.message);
}

async function refreshAllUserData() {
  if (!state.session) return;
  await Promise.all([
    refreshProfile(),
    loadShop(),
    loadInventory(),
    loadAchievements(),
    loadMediaAssets(),
  ]);

  if (isAdmin()) {
    await loadAdminData();
  }
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

  const [{ data: profiles }, mediaResult] = await Promise.all([
    supabase.from('profiles').select('id, username, role, coins, xp, level, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('media_assets').select('*').order('created_at', { ascending: false }),
  ]);

  state.allProfiles = profiles || [];
  if (!mediaResult.error) state.mediaAssets = mediaResult.data || [];
}

async function maybeUnlockAchievement(key) {
  if (!state.session) return;
  const already = state.unlockedAchievements.some(a => a.achievement_key === key);
  if (already) return;

  const { error } = await supabase.rpc('unlock_achievement', {
    _achievement_key: key,
  });

  if (!error) {
    await refreshProfile();
    await loadAchievements();
  } else {
    console.debug('Achievement not unlocked:', key, error.message);
  }
}

async function addProgress({ reason = 'message' } = {}) {
  if (!state.profile) return;

  const normalizedReason = reason === 'Message envoyé' || reason === 'message'
    ? 'message'
    : 'daily_test';

  const { error } = await supabase.rpc('secure_add_progress', {
    _reason: normalizedReason,
  });

  if (!error) {
    await refreshProfile();
    if ((state.profile?.level || 1) >= 5) await maybeUnlockAchievement('level_5');
    if ((state.profile?.level || 1) >= 10) await maybeUnlockAchievement('level_10');
  } else {
    console.warn('Progress ignored:', error.message);
  }
}

function hasItem(key) {
  return state.inventory.some(i => i.item_key === key);
}

function itemIcon(item) {
  if (item.type === 'avatar') return AVATAR_ICONS[item.value] || '👤';
  if (item.type === 'skin') {
    const map = { default: '⬛', blood: '🩸', moon: '🌙', shadow: '🦇', gold: '👑' };
    return map[item.value] || '🎨';
  }
  if (item.type === 'title') return '🏷️';
  return '✨';
}

function selectedAvatarIcon() {
  const key = state.profile?.selected_avatar || 'avatar_frog';
  const item = state.shopItems.find(i => i.key === key);
  if (item?.image_url) return assetImage(item.image_url, item.name);
  return item ? itemIcon(item) : '🐸';
}

function selectedSkin() {
  return state.profile?.selected_skin || 'default';
}

function isAdmin() {
  return state.profile?.role === 'admin';
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

function render() {
  document.querySelector('#app').innerHTML = `
    <main class="app">
      <header class="topbar">
        <div class="brand">
          <h1>Sang Noir Online</h1>
          <p>v15 Supabase — Profil, boutique, succès</p>
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
      <p class="notice">
        Cette version utilise Supabase Auth + Database + Realtime. Elle remplace progressivement le serveur Socket.IO.
      </p>
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

function tabButton(tab, label) {
  return `<button class="tab ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">${label}</button>`;
}

function renderGame() {
  return `
    <section class="grid">
      <aside class="card">
        <h2>Créer / rejoindre</h2>
        <label>Pseudo affiché</label>
        <input id="displayName" value="${esc(state.profile?.username || 'Joueur')}" />

        <label>Difficulté bots</label>
        <select id="botDifficulty">
          <option value="easy">Facile</option>
          <option value="medium" selected>Moyen</option>
          <option value="pro">Pro</option>
        </select>

        <label>
          <input id="trainingMode" type="checkbox" style="width:auto" />
          Entraînement vampire contre bots
        </label>

        <div class="actions" style="margin-top:12px">
          <button id="createRoomBtn">Créer</button>
        </div>

        <label>Code de partie</label>
        <input id="joinCode" placeholder="ABCDE" maxlength="5" />
        <button class="secondary" id="joinRoomBtn">Rejoindre</button>

        ${state.room ? renderRoomControls() : ''}
      </aside>

      <section class="card">
        <h2>Salon</h2>
        ${state.room ? renderPlayers() : `<p class="notice">Crée ou rejoins une partie.</p>`}
        ${state.me ? renderPrivateRole() : ''}
      </section>

      <aside class="card">
        <h2>Chat realtime</h2>
        ${state.room ? renderChat() : `<p class="notice">Aucune partie ouverte.</p>`}
      </aside>
    </section>
  `;
}

function renderRoomControls() {
  return `
    <hr style="border-color:var(--line);margin:18px 0" />
    <h2>Partie</h2>
    <div class="roomCode">${esc(state.room.code)}</div>
    <p class="notice">Phase : ${esc(state.room.phase)} · Jour ${state.room.day} · ${state.room.training_mode ? 'Entraînement' : 'Normal'}</p>
    <button class="good" id="readyBtn">Prêt / pas prêt</button>
    ${state.room.host_id === state.session.user.id ? `
      <button id="addBotsBtn">Compléter avec bots</button>
      <button class="warn" id="startBtn">Lancer</button>
      <button class="secondary" id="nextPhaseBtn">Phase suivante</button>
    ` : ''}
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
    <div class="roleCard" style="margin-top:16px">
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

function renderChat() {
  return `
    <div class="messages" id="messages">
      ${state.messages.map(m => `
        <div class="msg ${m.is_bot ? 'botmsg' : ''} ${m.kind === 'system' ? 'system' : ''}">
          <strong>${esc(m.sender_name)}</strong>
          <p>${esc(m.message)}</p>
        </div>
      `).join('')}
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

      <h2>Inventaire équipé</h2>
      <div class="inventoryGrid">
        <div class="inventoryItem"><strong>Avatar</strong><span>${selectedAvatarIcon()} ${esc(state.profile?.selected_avatar || 'avatar_frog')}</span></div>
        <div class="inventoryItem"><strong>Skin</strong><span>${esc(state.profile?.selected_skin || 'default')}</span></div>
        <div class="inventoryItem"><strong>Titre</strong><span>${esc(state.profile?.selected_title || 'aucun')}</span></div>
      </div>

      <h2>Dernières progressions</h2>
      <div class="historyList">
        ${(h.lastGames || []).length ? h.lastGames.map(g => `
          <div class="historyRow">
            <span>${esc(g.result)} · ${esc(g.role || '')}</span>
            <strong>+${g.coins || 0} 🩸 / +${g.xp || 0} XP</strong>
          </div>
        `).join('') : `<p class="notice">Aucun historique pour l’instant.</p>`}
      </div>
    </section>
  `;
}

function renderShopPage() {
  const groups = ['avatar', 'skin', 'title'];
  return `
    <section class="card">
      <h2>Boutique</h2>
      <p class="notice">Les achats sont sauvegardés dans Supabase. Les objets à 0 sont gratuits et peuvent servir de base.</p>
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
        <div class="itemIcon">${item.image_url ? assetImage(item.image_url, item.name) : itemIcon(item)}</div>
        <div>
          <strong>${esc(item.name)}</strong>
          <div class="priceLine">${owned ? 'Possédé' : `${item.price} 🩸`} · Niveau ${item.level_required}</div>
        </div>
      </div>
      <p class="notice">${TYPE_LABEL[item.type] || item.type} · ${esc(item.value)}</p>
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


function adminSubButton(tab, label) {
  return `<button class="tab ${state.adminSubTab === tab ? 'active' : ''}" data-admin-subtab="${tab}">${label}</button>`;
}

function renderAdminPage() {
  return `
    <section class="card adminPage">
      <div class="adminHeader">
        <div>
          <h2>Administration</h2>
          <p class="notice">Accessible uniquement aux comptes avec le rôle admin.</p>
        </div>
        <button class="secondary" id="refreshAdminBtn">Rafraîchir</button>
      </div>

      <div class="tabs">
        ${adminSubButton('media', 'Images')}
        ${adminSubButton('shopImages', 'Images boutique')}
        ${adminSubButton('users', 'Comptes autorisés')}
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
        <p class="notice">Si tu utilises une clé déjà existante, l’image sera remplacée dans la base.</p>

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
        <p id="adminMsg" class="notice"></p>
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
    <p class="notice">Clique sur “Appliquer image” sur un objet, puis choisis une image de la liste.</p>
    <div class="shopAdminGrid">
      ${state.shopItems.map(item => `
        <div class="shopItem">
          <div class="itemTop">
            <div class="itemIcon">${item.image_url ? assetImage(item.image_url, item.name) : itemIcon(item)}</div>
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
    <h3>Comptes autorisés</h3>
    <p class="notice">Tu peux donner ou retirer l’accès admin. Ne donne ce rôle qu’aux personnes de confiance.</p>
    <div class="adminUserList">
      ${state.allProfiles.map(p => `
        <div class="adminUser">
          <div>
            <strong>${esc(p.username)}</strong>
            <p class="notice">${esc(p.id)} · rôle actuel : <strong>${esc(p.role)}</strong></p>
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
      <h3>À faire côté Supabase pour Discord</h3>
      <p class="notice">Dans Supabase, active le provider Discord dans Authentication → Providers.</p>
      <ol class="notice">
        <li>Va sur Discord Developer Portal.</li>
        <li>Crée une application.</li>
        <li>Dans OAuth2, ajoute l’URL de callback Supabase.</li>
        <li>Copie Client ID et Client Secret dans Supabase.</li>
        <li>Dans Supabase Authentication → URL Configuration, ajoute ton site Vercel.</li>
      </ol>
      <p class="notice">Pour te donner l’accès admin la première fois, exécute la ligne indiquée à la fin du fichier SQL v17.</p>
    </div>
  `;
}

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
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

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

  $('mediaKey').value = '';
  $('mediaName').value = '';
  $('mediaFile').value = '';
  await loadAdminData();
  render();
}

async function deleteAdminMedia(id) {
  if (!confirm('Supprimer cette image de la liste ? Le fichier Storage peut rester stocké.')) return;

  const asset = state.mediaAssets.find(a => a.id === id);
  if (asset?.storage_path) {
    await supabase.storage.from('sang-noir-assets').remove([asset.storage_path]);
  }

  const { error } = await supabase.rpc('admin_delete_media_asset', { _id: id });
  if (error) return alert(error.message);

  await loadAdminData();
  render();
}

async function setShopImage(shopKey) {
  const select = $(`shopImage_${shopKey}`);
  const url = select?.value || null;

  const { error } = await supabase.rpc('admin_set_shop_image', {
    _shop_key: shopKey,
    _image_url: url,
  });

  if (error) return alert(error.message);

  await loadShop();
  render();
}

async function setUserRole(userId, role) {
  if (!confirm(`Confirmer le rôle ${role} ?`)) return;

  const { error } = await supabase.rpc('admin_set_user_role', {
    _user_id: userId,
    _role: role,
  });

  if (error) return alert(error.message);

  await loadAdminData();
  render();
}


function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    state.activeTab = btn.dataset.tab;
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
  $('sendMsgBtn')?.addEventListener('click', sendMessage);
  $('messageInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  $('saveProfileBtn')?.addEventListener('click', saveProfileEdits);

  document.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => buyItem(btn.dataset.buy)));
  document.querySelectorAll('[data-equip]').forEach(btn => btn.addEventListener('click', () => equipItem(btn.dataset.equip)));

  document.querySelectorAll('[data-admin-subtab]').forEach(btn => btn.addEventListener('click', () => {
    state.adminSubTab = btn.dataset.adminSubtab;
    render();
  }));

  $('uploadMediaBtn')?.addEventListener('click', uploadAdminMedia);
  $('refreshAdminBtn')?.addEventListener('click', async () => { await loadAdminData(); render(); });
  document.querySelectorAll('[data-delete-media]').forEach(btn => btn.addEventListener('click', () => deleteAdminMedia(btn.dataset.deleteMedia)));
  document.querySelectorAll('[data-shop-image]').forEach(btn => btn.addEventListener('click', () => setShopImage(btn.dataset.shopImage)));
  document.querySelectorAll('[data-role-player]').forEach(btn => btn.addEventListener('click', () => setUserRole(btn.dataset.rolePlayer, 'player')));
  document.querySelectorAll('[data-role-admin]').forEach(btn => btn.addEventListener('click', () => setUserRole(btn.dataset.roleAdmin, 'admin')));
}

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
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    $('authMsg').textContent = error.message;
  }
}

async function signOut() {
  await clearChannels();
  await supabase.auth.signOut();
}

async function saveProfileEdits() {
  const username = $('profileUsername').value.trim() || 'Joueur';
  const { error } = await supabase.from('profiles').update({ username }).eq('id', state.session.user.id);
  if (error) return alert(error.message);
  await refreshProfile();
  render();
}

async function buyItem(key) {
  const item = state.shopItems.find(i => i.key === key);
  if (!item) return;

  const { error } = await supabase.rpc('purchase_shop_item', {
    _item_key: key,
  });

  if (error) return alert(error.message);

  await loadInventory();
  await refreshProfile();
  await maybeUnlockAchievement('first_purchase');

  if (state.inventory.length >= 5) await maybeUnlockAchievement('collector_5');

  render();
}

async function equipItem(key) {
  const item = state.shopItems.find(i => i.key === key);
  if (!item || !hasItem(key)) return;

  const { error } = await supabase.rpc('equip_shop_item', {
    _item_key: key,
  });

  if (error) return alert(error.message);

  await refreshProfile();
  render();
}

async function createRoom() {
  const code = code5();
  const trainingMode = $('trainingMode').checked;
  const name = $('displayName').value.trim() || state.profile.username || 'Joueur';

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: state.session.user.id,
      training_mode: trainingMode,
      bot_difficulty: $('botDifficulty').value,
      settings: { mode: trainingMode ? 'training' : 'normal' },
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

  await maybeUnlockAchievement('first_room');

  state.room = room;
  await loadRoom(room.id);
  await subscribeRoom(room.id);

  if (trainingMode) await addBots(8);
  render();
}

async function joinRoom() {
  const code = $('joinCode').value.trim().toUpperCase();
  const name = $('displayName').value.trim() || state.profile.username || 'Joueur';

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error || !room) return alert('Partie introuvable.');
  if (room.training_mode) return alert('Cette partie est un entraînement solo.');

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

async function loadRoom(roomId) {
  const [{ data: room }, { data: players }, { data: messages }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_players').select('*').eq('room_id', roomId).order('created_at'),
    supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(120),
  ]);

  state.room = room;
  state.players = players || [];
  state.messages = messages || [];
  state.me = state.players.find(p => p.user_id === state.session.user.id) || null;
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

async function addBots(targetCount = 8) {
  if (!state.room || state.room.host_id !== state.session.user.id) return;
  await loadRoom(state.room.id);

  const existing = state.players.length;
  const toCreate = Math.max(0, targetCount - existing);
  const bots = Array.from({ length: toCreate }, (_, i) => ({
    room_id: state.room.id,
    name: BOT_NAMES[(existing + i) % BOT_NAMES.length],
    is_bot: true,
    ready: true,
    alive: true,
    bot_brain: makeBotBrain(),
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
  if (!state.room || state.room.host_id !== state.session.user.id) return;
  await loadRoom(state.room.id);

  if (state.players.length < 5) return alert('Il faut au moins 5 joueurs/bots.');

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

  await systemMessage('La partie commence. Les rôles sont distribués.');
  await reload();
}

async function toggleReady() {
  if (!state.me) return;
  await supabase.from('room_players').update({ ready: !state.me.ready }).eq('id', state.me.id);
}

async function sendMessage() {
  const input = $('messageInput');
  const text = input.value.trim();
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
  await addProgress({ reason: 'message' });

  await scheduleBotReplies(text);
}

async function systemMessage(message) {
  await supabase.from('messages').insert({
    room_id: state.room.id,
    sender_name: 'Système',
    message,
    kind: 'system',
  });
}

async function scheduleBotReplies(text) {
  if (!state.room || state.room.phase !== 'day') return;
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

      if (index === 0 && speakers.length > 1 && Math.random() < 0.35) {
        const other = speakers[1];
        setTimeout(async () => {
          await supabase.from('messages').insert({
            room_id: state.room.id,
            sender_player_id: other.id,
            sender_name: other.name,
            message: `@${bot.name} Je suis pas totalement d’accord.`,
            is_bot: true,
          });
        }, 700);
      }
    }, 700 + index * 900);
  });
}

async function nextPhase() {
  if (!state.room || state.room.host_id !== state.session.user.id) return;
  await loadRoom(state.room.id);

  if (state.room.phase === 'day') {
    await supabase.from('rooms').update({ phase: 'night' }).eq('id', state.room.id);
    await systemMessage('La nuit tombe. Les actions de nuit peuvent commencer.');
  } else if (state.room.phase === 'night') {
    await resolveSimpleNight();
    await supabase.from('rooms').update({ phase: 'day', day: state.room.day + 1 }).eq('id', state.room.id);
    await systemMessage('Le jour se lève.');
  }

  await reload();
}

async function resolveSimpleNight() {
  const vampire = state.players.find(p => p.role === 'vampire' && p.alive);
  if (!vampire) return;

  const targets = state.players.filter(p => p.id !== vampire.id && p.alive);
  if (!targets.length) return;

  const target = targets[Math.floor(Math.random() * targets.length)];
  const adn = ADN_TYPES.find(a => a.id === target.adn);
  const blood = Array.isArray(vampire.absorbed_blood) ? vampire.absorbed_blood : [];
  const existing = blood.find(b => b.id === target.adn);

  if (existing) existing.count += 1;
  else if (adn) blood.push({ id: adn.id, name: adn.name, count: 1, color: adn.color });

  await supabase.from('room_players').update({ absorbed_blood: blood }).eq('id', vampire.id);
  await supabase.from('rooms').update({ vampire_power: state.room.vampire_power + 1 }).eq('id', state.room.id);

  if (state.me?.id === vampire.id && blood.length >= 3) {
    await maybeUnlockAchievement('blood_collector');
  }

  if (Math.random() < 0.35) {
    await supabase.from('room_players').update({ alive: false }).eq('id', target.id);
    await systemMessage(`${target.name} a été retrouvé vidé de son sang.`);
  } else {
    await systemMessage('Quelqu’un semble avoir été visé cette nuit, mais personne n’est mort.');
  }

  if (state.room.training_mode && vampire.user_id === state.session.user.id) {
    const { error } = await supabase.rpc('record_training_result', {
      _room_id: state.room.id,
    });

    if (!error) {
      await refreshProfile();
      await maybeUnlockAchievement('training_5');
    }
  }
}

async function init() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.room = null;
    state.players = [];
    state.messages = [];
    state.me = null;

    if (session) {
      await ensureProfile();
      await ensureStarterInventory();
      await refreshAllUserData();
    }

    render();
  });

  if (state.session) {
    await ensureProfile();
    await ensureStarterInventory();
    await refreshAllUserData();
  }

  render();
}

init();
