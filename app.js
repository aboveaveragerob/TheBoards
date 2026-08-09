/* ============================================================================
   To-Do Boards — app.js  (vanilla, no dependencies, no build step)

   Sections:
     1. Constants & copy
     2. IndexedDB persistence
     3. State + save queue
     4. Layout / scale-to-fit (PRD §5, UIUX §3/§11)
     5. Coordinate + caret helpers
     6. Note / anchor / lot rendering
     7. Gesture recognizer (UIUX §5)
     8. Editing, drag, pinch, z-order (PRD §6.2/§6.3)
     9. Complete / restore / delete + Undo toast (PRD §6.4/§6.6, UIUX §9)
    10. Long-press menu (UIUX §7)
    11. Board list + routing (PRD §6.7, UIUX §10)
    12. Boot + service worker
   ========================================================================== */

'use strict';

/* --- 1. Constants & copy ------------------------------------------------- */
let   LOGICAL_W = 900;               // mobile: = vw, the sheet is the viewport (B32); desktop: derived per layout (B20)
let   LOGICAL_H = 1000;              // responsive: recomputed each layout to fill the viewport
let   LEGACY_H = 1000;               // the LOGICAL_H the pre-B32 build would have produced
                                     // on this device; places notes that predate `rh`.
const MAX_NOTE_W = 405;              // 45% of the 900 sheet (PRD §6.2); desktop cap — see noteMaxW
const MIN_SCALE = 0.5, MAX_SCALE = 2.0;
const MOVE_THRESHOLD = 16;           // px before a drag begins / long-press cancels (B29)
const LONGPRESS_MS = 500;
const HIT_FLOOR = 44;                // px physical (PRD §5.3, UIUX §6) — mobile
const HIT_FLOOR_DESKTOP = 24;        // WCAG 2.5.8 AA; a 44px collar swallows dismiss clicks (issue #12)
const PANE_W = 300;                  // CSS px; unscaled width of the desktop board rail
const DBLCLICK_MS = 350;             // second click on a selected item within this = edit
const SWAP_MS = 150;                 // board-swap crossfade; sequenced by timeout (§8-safe)
const SAVE_DEBOUNCE = 300;
const UNDO_MS = 5000;
const LEAVE_MS = 120;
const ACTION_DELAY = 400;            // click → action; the window is acknowledged, not idle

const COPY = {
  complete: 'Complete', restore: 'Restore', delete: 'Delete', boards: 'Boards',
  deleted: 'Deleted', undo: 'Undo',
  saveError: 'Couldn’t save — retrying.',
  untitled: 'What’s up?',
};
const GLYPH = { complete: '✓', restore: '↺', boards: '▦', delete: '🗑' };

// contenteditable mode: prefer plaintext-only (Chromium/Samsung Internet — the
// Z Fold target); fall back to "true" where unsupported so text still captures.
const CE = (() => {
  const d = document.createElement('div');
  try { d.contentEditable = 'plaintext-only'; } catch (e) { /* older engines throw */ }
  return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
})();

/* --- 1.5 Desktop mode (B19) ----------------------------------------------
   A session is desktop iff the primary pointer is fine and can hover AND the
   window is wide enough for the rail. Capability — not width, not UA — is what
   excludes tablets: iPadOS reports coarse/none even with a trackpad. One flag +
   one class are the single source of truth; CSS gates on html.desktop only. */
const DESKTOP_MQ = window.matchMedia(
  '(min-width: 1024px) and (hover: hover) and (pointer: fine)');
let isDesktop = DESKTOP_MQ.matches;
document.documentElement.classList.toggle('desktop', isDesktop);

function applyMode() {
  isDesktop = DESKTOP_MQ.matches;
  document.documentElement.classList.toggle('desktop', isDesktop);
  // Teardown: nothing half-finished survives the flip.
  clearSelection();
  closeMenu();
  if (g) { clearTimeout(g.longPressTimer); g = null; }
  pointers.clear();
  if (isDesktop && listOpen) history.back();   // pops the list state → board (B9 intact)
  applyLayout();
  if (isDesktop) renderPane();
}
DESKTOP_MQ.addEventListener('change', applyMode);

const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));

/* --- 2. IndexedDB persistence -------------------------------------------- */
const DB_NAME = 'boards-db', STORE = 'boards';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const dbPromise = openDB();

async function idbGetAll() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
async function idbPut(rec) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function idbDelete(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

/* --- 3. State + save queue ----------------------------------------------- */
let current = null;                  // the open board record (in memory)
let renderScale = 1, offX = 0, offY = 0;

const noteEls = new Map();           // note.id -> element
const lotEls = new Map();            // lotItem.id -> element

const el = {
  board: document.getElementById('board'),
  boardView: document.getElementById('board-view'),
  lotItems: document.getElementById('lot-items'),
  lot: document.getElementById('lot'),
  listView: document.getElementById('list-view'),
  listRows: document.getElementById('list-rows'),
  newBoard: document.getElementById('new-board'),
  menu: document.getElementById('menu'),
  toast: document.getElementById('toast'),
  pane: document.getElementById('pane'),
  paneNew: document.getElementById('pane-new'),
  paneCards: document.getElementById('pane-cards'),
  paneMore: document.getElementById('pane-more'),
};
const anchorEls = {
  title: document.getElementById('anchor-title'),
  components: document.getElementById('anchor-components'),
  requirements: document.getElementById('anchor-requirements'),
};

function newBoardRecord() {
  const now = Date.now();
  return { id: uuid(), createdAt: now, updatedAt: now,
           title: '', requirements: '', components: '', notes: [], parkingLot: [] };
}

// Single-flight persist with exponential backoff; capture is never blocked.
let saveTimer = null, persisting = false, dirtyAgain = false, retryDelay = 1000;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE); }
function saveNow() {
  clearTimeout(saveTimer);
  if (!current) return;
  current.updatedAt = Date.now();
  persist();
}
function persist() {
  if (!current) return;
  if (persisting) { dirtyAgain = true; return; }
  persisting = true;
  const snapshot = current;
  idbPut(snapshot).then(() => {
    persisting = false; retryDelay = 1000; hideSaveError();
    if (dirtyAgain) { dirtyAgain = false; persist(); }
  }).catch(() => {
    persisting = false; showSaveError();
    setTimeout(persist, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 16000);
  });
}

/* --- 4. Layout / scale-to-fit -------------------------------------------- */
function applyLayout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (isDesktop) {
    // Desktop (B20): the rail takes PANE_W unscaled; the sheet fills the rest.
    // Min-anchored scale — neither logical dimension ever drops below the
    // 900×1000 reference, so mobile-placed notes always fit and the top
    // furniture (~880 units) never collides, at any window shape.
    renderScale = Math.min(vh / 1000, (vw - PANE_W) / 900);
    LOGICAL_H = vh / renderScale;
    LOGICAL_W = (vw - PANE_W) / renderScale;
    offX = PANE_W;
    offY = 0;
    LEGACY_H = LOGICAL_H;            // desktop geometry is unchanged by B32
  } else {
    // Mobile (B32, overrides B17): the sheet IS the viewport. B17's fill still
    // holds — a scale of 1 is uniform by construction, so no letterbox and no
    // distortion — but every declared px is now a real px, which is the whole
    // point: at 900-and-scale the furniture rendered at ~45% and was unreadable.
    LOGICAL_W = vw;
    LOGICAL_H = vh;
    renderScale = 1;
    offX = 0;
    offY = 0;
    LEGACY_H = 900 * vh / vw;        // the height B17 would have produced here
  }
  el.board.style.setProperty('--logical-w', LOGICAL_W + 'px');
  el.board.style.setProperty('--logical-h', LOGICAL_H + 'px');
  el.board.style.setProperty('--rs', renderScale);
  el.board.style.setProperty('--offx', offX + 'px');
  el.board.style.setProperty('--offy', offY + 'px');
  // Before the loop: setHitInset measures offsetWidth, which the cap changes.
  el.board.style.setProperty('--note-max-w', noteMaxW() + 'px');
  // Re-derive each note's on-sheet x and y (proportional across frames) and its
  // decoupled hit area (physical size changed).
  noteEls.forEach((node, id) => {
    const note = current && current.notes.find(n => n.id === id);
    if (note) {
      node.style.left = renderX(note) + 'px';
      node.style.top = renderY(note) + 'px';
      setHitInset(node, note);
    }
  });
  if (selected) updateSelectionUI();
  if (isDesktop && el.paneCards) updatePaneOverflow();
  // No letterbox now: the toast sits 12px above the screen's bottom edge.
  document.documentElement.style.setProperty('--toast-bottom', '12px');
}

/* The Android soft keyboard opening fires a viewport resize. Under B17 the
   mobile sheet's height tracks vh, so recomputing there drags the page out
   from under the note being written and clips it off the bottom — the next tap
   lands on bare canvas, blurs the (now invisible) editor, and B8 discards the
   empty frame, which drops the keyboard, which resizes again. That is the
   flap. While an editor inside the board holds focus the layout is held still
   and the deferral remembered, so a genuine rotation or fold mid-edit is
   postponed rather than lost: commit-on-blur re-applies it. Desktop geometry
   (B20) has no soft keyboard and is left unguarded.

   Under B32 the guard earns a second job. The proportional collapse is the same
   (846 → 450 is the same ratio as B17's 1983 → 1055), but y is now frame-
   relative, so an unguarded keyboard resize would move every note on screen —
   and a gesture grabbing one while the keyboard is up would rebase it, writing
   rh = the shrunken height into storage permanently. This deferral is the only
   thing standing between the soft keyboard and that write. Do not weaken it. */
let layoutDeferred = false;

function editingInBoard() {
  const a = document.activeElement;
  return !!(a && a.hasAttribute && a.hasAttribute('contenteditable') && el.board.contains(a));
}

function onViewportResize() {
  if (!isDesktop && editingInBoard()) { layoutDeferred = true; return; }
  applyLayout();
}

/* --- 5. Coordinate + caret helpers --------------------------------------- */
const toLogical = (clientX, clientY) => ({
  x: (clientX - offX) / renderScale,
  y: (clientY - offY) / renderScale,
});

/* Cross-device x (issue #15): note.rw records the LOGICAL_W its x was last
   written against; rendering scales x proportionally to the current width.
   The stored x is never mutated by a viewport change — only by the same
   gestures that already own writes, which rebase to the current frame at grab
   (visually silent: renderX equals the on-screen position at that instant). */
const renderX = (note) => note.x * (LOGICAL_W / (note.rw || 900));

/* Cross-frame y (B32) — the mirror of rw. B21 ruled y needed no counterpart
   because LOGICAL_H ≥ 1000 everywhere; at 1:1 the mobile height is vh, so that
   premise is gone and note.rh records the LOGICAL_H its y was last written
   against. Notes written before B32 have no rh, and unlike rw's legacy 900 it
   cannot be recovered — the old mobile height was device-dependent — so they
   are mapped through the height the previous build would have produced here
   (LEGACY_H) and clamped into the page AT RENDER TIME ONLY. Stored y is never
   mutated, so B17's "committed positions are permanent" holds; the clamp exists
   solely so a note authored on the old ~2000-unit sheet stays reachable rather
   than clipped off a page that will never be that tall again.
   The clamp is on the legacy branch alone: applied to live notes it would fight
   createNote's own LOGICAL_H − 4 bottom clamp and rebaseNote would write the
   pulled-up value back — the silent mutation B21 forbids. */
const renderY = (note) => note.rh
  ? note.y * (LOGICAL_H / note.rh)
  : clamp(note.y * (LOGICAL_H / LEGACY_H), 0, Math.max(0, LOGICAL_H - HIT_FLOOR));

function rebaseNote(note) {
  note.x = renderX(note);
  note.y = renderY(note);
  note.rw = LOGICAL_W;
  note.rh = LOGICAL_H;
}

/* PRD §6.2's cap is "45% of board width"; 405 was that fraction of the fixed
   900 sheet, and at 1:1 a fixed 405 is ~98% of a phone — no cap at all, and the
   spatial board collapses into one column. Desktop keeps the literal: its
   LOGICAL_W is derived per layout (B20), and 45% of it would widen desktop
   notes to ~570px, which B32 does not license. */
const noteMaxW = () => isDesktop ? MAX_NOTE_W : Math.round(LOGICAL_W * 0.45);

function setHitInset(node, note) {
  const w = node.offsetWidth, h = node.offsetHeight;   // logical (transform-independent)
  const k = note.scale * renderScale;
  const physW = w * k, physH = h * k;
  const floor = isDesktop ? HIT_FLOOR_DESKTOP : HIT_FLOOR;
  const inset = Math.max(0, (floor - physW) / 2, (floor - physH) / 2) / (k || 1);
  node.style.setProperty('--hit', inset + 'px');
}

function placeCaretAtPoint(node, clientX, clientY) {
  let range = null;
  if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(clientX, clientY);
  else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(clientX, clientY);
    if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); range.collapse(true); }
  }
  const sel = window.getSelection();
  sel.removeAllRanges();
  if (range && node.contains(range.startContainer)) { sel.addRange(range); }
  else { const r = document.createRange(); r.selectNodeContents(node); r.collapse(false); sel.addRange(r); }
}
function caretToEnd(node) {
  const sel = window.getSelection(), r = document.createRange();
  r.selectNodeContents(node); r.collapse(false);
  sel.removeAllRanges(); sel.addRange(r);
}

/* --- 6. Rendering -------------------------------------------------------- */

/* B8 at rest, not only at blur: "no empty frames ever exist" (PRD §6.2). The
   blur discard covers a frame the user abandons; it cannot cover one whose
   editor never took focus, because no blur ever comes. Any such husk already
   in storage is swept the next time its board is drawn, so old data heals
   itself on first sight and the bug leaves nothing behind (B31). Rendering is
   the right layer: it is the one choke point every board passes through, and
   it rebuilds the frames anyway. */
function sanitizeBoard(board) {
  const keep = r => (r.text || '').trim().length > 0;
  const n = board.notes.length, l = board.parkingLot.length;
  board.notes = board.notes.filter(keep);
  board.parkingLot = board.parkingLot.filter(keep);
  return board.notes.length !== n || board.parkingLot.length !== l;
}

function renderBoard() {
  clearSelection();                  // note DOM is about to be rebuilt
  if (sanitizeBoard(current)) scheduleSave();
  // Anchors.
  for (const key of ['title', 'components', 'requirements']) {
    const node = anchorEls[key];
    node.textContent = current[key] || '';
    node.classList.toggle('filled', !!(current[key] && current[key].length));
  }
  // Notes (array order = z-order; DOM order mirrors it).
  noteEls.forEach(n => n.remove()); noteEls.clear();
  for (const note of current.notes) el.board.appendChild(makeNoteEl(note));
  // Parking Lot.
  el.lotItems.textContent = ''; lotEls.clear();
  for (const item of current.parkingLot) el.lotItems.appendChild(makeLotEl(item));
  applyLayout();
}

function makeNoteEl(note) {
  const node = document.createElement('div');
  node.className = 'note' + (note.state === 'complete' ? ' complete' : '');
  node.dataset.id = note.id;
  node.setAttribute('tabindex', '0');
  node.style.left = renderX(note) + 'px';
  node.style.top = renderY(note) + 'px';
  node.style.transform = 'scale(' + note.scale + ')';

  const text = document.createElement('div');
  text.className = 'note-text';
  text.setAttribute('role', 'textbox');
  text.setAttribute('aria-multiline', 'true');
  text.textContent = note.text;

  const scratch = document.createElement('div');
  scratch.className = 'note-scratch';
  scratch.setAttribute('aria-hidden', 'true');

  node.appendChild(text); node.appendChild(scratch);
  applyCompleteA11y(node, note.state === 'complete');
  noteEls.set(note.id, node);
  requestAnimationFrame(() => setHitInset(node, note));
  return node;
}

function makeLotEl(item) {
  const node = document.createElement('div');
  node.className = 'lot-item' + (item.state === 'complete' ? ' complete' : '');
  node.dataset.id = item.id;
  node.setAttribute('tabindex', '0');

  const text = document.createElement('div');
  text.className = 'lot-text';
  text.setAttribute('role', 'textbox');
  text.setAttribute('aria-multiline', 'true');
  text.textContent = item.text;

  const scratch = document.createElement('div');
  scratch.className = 'lot-scratch';
  scratch.setAttribute('aria-hidden', 'true');

  node.appendChild(text); node.appendChild(scratch);
  applyCompleteA11y(node, item.state === 'complete');
  lotEls.set(item.id, node);
  return node;
}

function applyCompleteA11y(node, complete) {
  const text = node.firstChild;
  if (complete) {
    node.setAttribute('aria-label', 'completed note');
    text.setAttribute('aria-hidden', 'true');
  } else {
    node.removeAttribute('aria-label');
    text.removeAttribute('aria-hidden');
  }
}

/* --- 7. Gesture recognizer ----------------------------------------------- */
// One recognizer over the board. Targets: note | anchor | lot-item | lot | canvas.
const pointers = new Map();          // pointerId -> {x,y,startX,startY}
let g = null;                        // active gesture context
let swallowTap = false;              // the pointerdown that dismissed a menu is inert (B30)

/* Only these carry a long-press menu. The creation surfaces — bare canvas and
   the lot background — have no item to act on, so no timer is armed over them
   and the press stays a pending tap: hold as long as you like on empty paper
   and the release still captures a note. B5 rules that a deliberate press
   which isn't a long-press must still act; a press that *is* one, over a
   surface with nothing to open, is the same case one step further out, and
   capture precedes structure (PRD §1). Boards is unaffected — it lives on the
   anchors. (Previously every one of these presses vibrated and then threw in
   openMenuFor, which also suppressed the release: the dropped taps in the
   Z Fold capture video.) */
const HAS_MENU = new Set(['note', 'lot-item', 'anchor']);

function classifyTarget(target) {
  // Selection chrome first: action buttons (notes and lot rows share .sel-btn),
  // then the resize frame — both must win over the elements beneath them.
  const selBtn = target.closest('.sel-btn');
  if (selBtn) return { type: 'sel-btn', node: selBtn };
  if (target.closest('#selection')) return { type: 'sel-frame', node: selEl };
  const note = target.closest('.note');
  if (note) return { type: 'note', node: note };
  const lotItem = target.closest('.lot-item');
  if (lotItem) return { type: 'lot-item', node: lotItem };
  const anchor = target.closest('.anchor');
  if (anchor) return { type: 'anchor', node: anchor };
  if (target.closest('#lot')) return { type: 'lot', node: el.lot };
  return { type: 'canvas', node: el.board };
}

el.board.addEventListener('pointerdown', onPointerDown);

function onPointerDown(e) {
  if (swallowTap) { swallowTap = false; return; }  // this press only dismissed a menu (B30)
  if (isEditing(e.target)) return;                 // let text editing receive taps/caret
  // Past that guard the recognizer owns this press outright, so the browser's
  // compatibility mouse events are suppressed at their source (B27). They are
  // dispatched after pointerup and, because setPointerCapture retargets them
  // to #board — which cannot hold focus — their default action pulls focus out
  // of the editor the tap just opened. The note is then empty on blur and B8
  // discards it: the tap that appeared to do nothing. Every focus and caret
  // placement on this path is explicit, so nothing is lost by suppressing them.
  e.preventDefault();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });

  // Second pointer on a note in progress → pinch.
  if (pointers.size === 2 && g && g.target.type === 'note') {
    startPinch();
    return;
  }
  if (pointers.size > 1) return;                   // ignore extra pointers otherwise

  const target = classifyTarget(e.target);
  g = {
    target, pointerId: e.pointerId,
    startX: e.clientX, startY: e.clientY,
    mode: 'pending', longPressed: false, moved: false,
    note: target.type === 'note' ? current.notes.find(n => n.id === target.node.dataset.id) : null,
  };
  if (isDesktop && target.type === 'sel-frame' && selected && selected.kind === 'note') {
    startResize(e);
  }
  try { el.board.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }

  if (!isDesktop && HAS_MENU.has(target.type)) {   // desktop removes click-and-hold entirely (issue #4)
    g.longPressTimer = setTimeout(() => {
      if (!g || g.mode !== 'pending' || g.moved) return;
      g.longPressed = true;
      if (navigator.vibrate) navigator.vibrate(10);
      openMenuFor(target, g.startX, g.startY);
    }, LONGPRESS_MS);
  }
}

el.board.addEventListener('pointermove', onPointerMove);
function onPointerMove(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;

  if (g && g.mode === 'pinch') { updatePinch(); return; }
  if (g && g.mode === 'resize') { if (g.pointerId === e.pointerId) updateResize(e); return; }
  if (!g || g.pointerId !== e.pointerId) return;

  const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
  if (!g.moved && Math.hypot(dx, dy) >= MOVE_THRESHOLD) {
    g.moved = true;
    clearTimeout(g.longPressTimer);
    if (g.target.type === 'note' && !g.longPressed) startDrag();
    else g.mode = 'cancelled';                      // canvas/anchor/lot don't drag; board never pans
  }
  if (g.mode === 'drag') updateDrag(e);
}

el.board.addEventListener('pointerup', onPointerUp);
el.board.addEventListener('pointercancel', onPointerUp);
function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (!g) return;

  if (g.mode === 'pinch') {
    if (pointers.size < 2) endPinch();
    return;
  }
  if (g.pointerId !== e.pointerId) return;
  clearTimeout(g.longPressTimer);

  if (g.mode === 'drag') { endDrag(); }
  else if (g.mode === 'resize') { endResize(); }
  else if (g.mode === 'pending' && !g.longPressed && !g.moved) { handleTap(g.target, e.clientX, e.clientY); }
  g = null;
}

/* --- 8. Editing, drag, pinch, z-order ------------------------------------ */
/* Editing means an editor that actually holds focus, not merely one wearing the
   attribute. The attribute alone can outlive its edit — a focus() the browser
   refused never fires focusout, so nothing strips it — and an unfocused husk
   answering yes here would swallow every pointerdown over it at source: an
   invisible dead patch of paper. Requiring focus makes such a node an ordinary
   note again, which the next tap focuses and the following blur discards. */
function isEditing(node) {
  const ed = node.closest && node.closest('[contenteditable]');
  return !!(ed && document.activeElement === ed);
}

/* Every click commits ACTION_DELAY after the release, never on the same frame.
   The window is not dead time — dead time is indistinguishable from a dropped
   tap, and this interface must never be thought about (UIUX §1). The tapped
   thing acknowledges immediately in the language the system already speaks:
   captured content thickens its ink (the same "I have this" a note shows on
   drag, `.pressed`), furniture and controls fill with their own ink. The
   acknowledgment releases as the action lands.

   One action is in flight at a time, and a tap inside an open window is
   dropped rather than queued: an impatient double-tap must not create two
   notes or delete twice. First tap wins. */
let pendingAction = null;

function delayAction(ackNode, fn) {
  if (pendingAction) return;
  if (ackNode) ackNode.classList.add('tapped');
  pendingAction = setTimeout(() => {
    pendingAction = null;
    if (ackNode) ackNode.classList.remove('tapped');
    fn();
  }, ACTION_DELAY);
}

/* Empty canvas has no element to acknowledge, so the frame the tap is about to
   produce is drawn first, at its lightest weight — the note motif before it has
   any content. The real note replaces it when the window closes. */
function makeTapGhost(clientX, clientY) {
  const pt = toLogical(clientX, clientY);
  const ghost = document.createElement('div');
  ghost.className = 'tap-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = clamp(pt.x, 0, LOGICAL_W - 4) + 'px';
  ghost.style.top = clamp(pt.y, 0, LOGICAL_H - 4) + 'px';
  el.board.appendChild(ghost);
  return ghost;
}

/* No blanket pendingAction guard here (issue #13): delayAction carries its own
   drop-guard, so B18(d) holds exactly where an action fires — while inert taps
   (select, deselect) stay live even during an open window. */
function handleTap(target, x, y) {
  switch (target.type) {
    case 'sel-btn': {
      // Complete/Restore/Delete — real actions, so B18's window applies.
      const lotRow = target.node.closest('.lot-item');
      const isDel = target.node.classList.contains('sel-delete');
      delayAction(target.node, () => {
        if (lotRow) {
          const item = current.parkingLot.find(i => i.id === lotRow.dataset.id);
          if (!item) return;
          if (isDel) { clearSelection(); deleteLot(lotRow); }
          else {
            if (item.state === 'complete') restoreLot(lotRow); else completeLot(lotRow);
            updateSelectionUI();
          }
        } else if (selected && selected.kind === 'note') {
          const node = noteEls.get(selected.id);
          const note = current.notes.find(n => n.id === selected.id);
          if (!node || !note) return;
          if (isDel) { clearSelection(); deleteNote(node); }
          else {
            if (note.state === 'complete') restoreNote(node); else completeNote(node);
            updateSelectionUI();
          }
        }
      });
      break;
    }
    case 'sel-frame': break;           // a motionless click on the ring does nothing
    case 'canvas': {
      // Creation surfaces deselect first (issue #12 desktop / #41 mobile): with
      // a selection active, or a note mid-edit, a tap only dismisses; capture
      // is only primary when nothing is selected or being edited.
      if (isDesktop && selected) { clearSelection(); break; }
      if (!isDesktop) {
        if (isEditing(document.activeElement)) { document.activeElement.blur(); break; }
        createNote(x, y); break;                                // capture is instant (B27)
      }
      if (pendingAction) break;        // don't draw a ghost a dropped tap would orphan
      const ghost = makeTapGhost(x, y);
      delayAction(ghost, () => { ghost.remove(); createNote(x, y); });
      break;
    }
    case 'lot': {
      if (isDesktop && selected) { clearSelection(); break; }   // creation surface too
      if (!isDesktop) {
        if (isEditing(document.activeElement)) { document.activeElement.blur(); break; }
        createLotItem(); break;                                 // B27
      }
      delayAction(el.lot, createLotItem);
      break;
    }
    case 'note': {
      const node = target.node;
      const note = current.notes.find(n => n.id === node.dataset.id);
      if (!note) break;
      if (isDesktop) {
        // Click selects (instant, inert); a second click within the pairing
        // window edits with the caret at the end (issue #4). Completed notes
        // never edit — same guard as the mobile tap path.
        const key = 'note:' + note.id, now = Date.now();
        if (selected && selected.kind === 'note' && selected.id === note.id &&
            lastTap.key === key && now - lastTap.t < DBLCLICK_MS) {
          lastTap = { key: null, t: 0 };
          if (note.state === 'active') {
            clearSelection();
            surfaceNote(node);
            editText(node.querySelector('.note-text'));   // no coords → caret at end
          }
        } else {
          selectNote(note.id);
          lastTap = { key, t: now };
        }
        break;
      }
      surfaceNote(node);                                        // B27
      if (note.state === 'active') editNoteText(node, x, y);
      break;
    }
    case 'lot-item': {
      const node = target.node;
      const item = current.parkingLot.find(i => i.id === node.dataset.id);
      if (!item) break;
      if (isDesktop) {
        const key = 'lot:' + item.id, now = Date.now();
        if (selected && selected.kind === 'lot' && selected.id === item.id &&
            lastTap.key === key && now - lastTap.t < DBLCLICK_MS) {
          lastTap = { key: null, t: 0 };
          if (item.state === 'active') {
            clearSelection();
            editText(node.querySelector('.lot-text'));    // no coords → caret at end
          }
        } else {
          selectLot(item.id);
          lastTap = { key, t: now };
        }
        break;
      }
      if (item.state === 'active') editText(node.querySelector('.lot-text'), x, y);  // B27
      break;
    }
    case 'anchor':
      if (isDesktop) delayAction(target.node, () => editText(target.node, x, y));
      else editText(target.node, x, y);                         // B27
      break;
  }
}

/* Enter inline edit on any editable text node. */
function enableEditing(textNode) {
  textNode.setAttribute('contenteditable', CE);
}
function disableEditing(textNode) {
  textNode.removeAttribute('contenteditable');
}
function editText(textNode, clientX, clientY) {
  enableEditing(textNode);
  textNode.focus();
  if (clientX != null) placeCaretAtPoint(textNode, clientX, clientY);
  else caretToEnd(textNode);
}
function editNoteText(noteNode, clientX, clientY) {
  editText(noteNode.querySelector('.note-text'), clientX, clientY);
}

/* Create a note in edit mode at the tapped point (PRD §6.2).

   The focus check closes B8's one gap (B31). Commit-on-blur is what discards
   an empty frame, and blur presupposes focus: if focus is refused the frame
   never commits, never discards, and persists as a husk that is invisible
   (.note-text:empty) yet keeps its 44 px hit collar. Creation therefore
   verifies its own premise in the same breath. It is a no-op whenever focus
   lands, which — since the whole capture path now runs inside the gesture
   (B27) — is the ordinary case. */
function createNote(clientX, clientY) {
  const pt = toLogical(clientX, clientY);
  const note = { id: uuid(), text: '', x: clamp(pt.x, 0, LOGICAL_W - 4),
                 y: clamp(pt.y, 0, LOGICAL_H - 4), rw: LOGICAL_W, rh: LOGICAL_H,
                 scale: 1.0, state: 'active' };
  current.notes.push(note);                          // top of z-order
  const node = makeNoteEl(note);
  el.board.appendChild(node);
  const text = node.querySelector('.note-text');
  enableEditing(text); text.focus(); caretToEnd(text);
  if (document.activeElement !== text) removeNoteSilently(note, node);
}

function createLotItem() {
  const item = { id: uuid(), text: '', state: 'active' };
  current.parkingLot.push(item);
  const node = makeLotEl(item);
  el.lotItems.appendChild(node);
  const text = node.querySelector('.lot-text');
  enableEditing(text); text.focus(); caretToEnd(text);
  if (document.activeElement !== text) removeLotSilently(item, node);
}

/* Commit-on-blur for every editable region; empty new notes/items are discarded. */
document.addEventListener('focusout', (e) => {
  const t = e.target;
  if (!t.hasAttribute || !t.hasAttribute('contenteditable')) return;
  disableEditing(t);
  if (t.classList.contains('note-text')) commitNote(t.closest('.note'));
  else if (t.classList.contains('lot-text')) commitLot(t.closest('.lot-item'));
  else if (t.classList.contains('anchor')) commitAnchor(t);
  // A viewport change held back during the edit lands now that nothing is at
  // stake — the keyboard's own retraction resize would repeat it, but a
  // rotation or fold has no such second chance.
  if (layoutDeferred) { layoutDeferred = false; requestAnimationFrame(applyLayout); }
});

/* Keyboard/AT users focus a region → enter edit. The pointer path owns taps, so
   auto-edit only when no pointer gesture is in control (otherwise a tabindexed
   note would open the keyboard on pointerdown before drag/long-press resolve). */
document.addEventListener('focusin', (e) => {
  if (pointers.size) return;
  const t = e.target;
  if (!t.classList) return;
  if (t.classList.contains('anchor') && !t.hasAttribute('contenteditable')) {
    enableEditing(t);
  } else if (t.classList.contains('note')) {
    const note = current && current.notes.find(n => n.id === t.dataset.id);
    if (!note) return;
    if (isDesktop) { selectNote(note.id); return; }    // Tab selects; Enter edits (issue #13)
    if (note.state === 'active') editText(t.querySelector('.note-text'));
  } else if (t.classList.contains('lot-item')) {
    const item = current && current.parkingLot.find(i => i.id === t.dataset.id);
    if (!item) return;
    if (isDesktop) { selectLot(item.id); return; }
    if (item.state === 'active') editText(t.querySelector('.lot-text'));
  }
});

/* Desktop keyboard (additive, issue #4 "mnk"): inert while the menu is open —
   menuKeyHandler owns Escape/Tab/arrows there, and Delete must not destroy the
   selection underneath an open menu (issue #10). */
document.addEventListener('keydown', (e) => {
  if (!isDesktop || menuOpen) return;
  const editing = isEditing(document.activeElement);
  if (e.key === 'Escape') {
    if (editing) { document.activeElement.blur(); }    // commit-on-blur path runs
    else if (selected) clearSelection();
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) {
    e.preventDefault();
    const s = selected;
    clearSelection();
    if (s.kind === 'note') { const n = noteEls.get(s.id); if (n) deleteNote(n); }
    else { const n = lotEls.get(s.id); if (n) deleteLot(n); }
  } else if (e.key === 'Enter' && selected && !editing) {
    e.preventDefault();
    const s = selected;
    if (s.kind === 'note') {
      const rec = current.notes.find(n => n.id === s.id);
      const n = noteEls.get(s.id);
      if (rec && n && rec.state === 'active') {
        clearSelection(); surfaceNote(n); editText(n.querySelector('.note-text'));
      }
    } else {
      const rec = current.parkingLot.find(i => i.id === s.id);
      const n = lotEls.get(s.id);
      if (rec && n && rec.state === 'active') {
        clearSelection(); editText(n.querySelector('.lot-text'));
      }
    }
  }
});

/* Live growth = capture feedback; debounced persistence (PRD §4 writes). */
el.board.addEventListener('input', (e) => {
  const t = e.target;
  if (t.classList.contains('note-text')) {
    const note = current.notes.find(n => n.id === t.closest('.note').dataset.id);
    if (note) { note.text = t.textContent; setHitInset(t.closest('.note'), note); scheduleSave(); }
  } else if (t.classList.contains('lot-text')) {
    const item = current.parkingLot.find(i => i.id === t.closest('.lot-item').dataset.id);
    if (item) { item.text = t.textContent; scheduleSave(); }
  } else if (t.classList.contains('anchor')) {
    current[t.dataset.anchor] = t.textContent;
    t.classList.toggle('filled', !!t.textContent.length);
    if (isDesktop && t.dataset.anchor === 'title') updateActiveCardTitle();
    scheduleSave();
  }
});

function commitNote(node) {
  const note = current.notes.find(n => n.id === node.dataset.id);
  if (!note) return;
  note.text = node.querySelector('.note-text').textContent;
  if (note.text.trim().length === 0) { removeNoteSilently(note, node); return; }  // no empty frames ever
  saveNow();
}
function removeNoteSilently(note, node) {
  if (selected && selected.kind === 'note' && selected.id === note.id) clearSelection();
  const i = current.notes.indexOf(note);
  if (i >= 0) current.notes.splice(i, 1);
  node.remove(); noteEls.delete(note.id);
  saveNow();
}
function commitLot(node) {
  const item = current.parkingLot.find(i => i.id === node.dataset.id);
  if (!item) return;
  item.text = node.querySelector('.lot-text').textContent;
  if (item.text.trim().length === 0) { removeLotSilently(item, node); return; }
  saveNow();
}
function removeLotSilently(item, node) {
  if (selected && selected.kind === 'lot' && selected.id === item.id) clearSelection();
  const i = current.parkingLot.indexOf(item);
  if (i >= 0) current.parkingLot.splice(i, 1);
  node.remove(); lotEls.delete(item.id);
  saveNow();
}
function commitAnchor(node) {
  current[node.dataset.anchor] = node.textContent;
  node.classList.toggle('filled', !!node.textContent.length);
  if (isDesktop && node.dataset.anchor === 'title') renderPane(); // reconcile the date line
  saveNow();
}

/* Drag (PRD §6.3): free overlap, no snap, clamp to page bounds only. */
function startDrag() {
  g.mode = 'drag';
  g.target.node.classList.add('pressed');
  surfaceNote(g.target.node);
  const note = g.note;
  rebaseNote(note);                  // grab math runs in current-frame units (issue #15)
  if (isDesktop) { selectNote(note.id); setSelectionHidden(true); }
  const startLogical = toLogical(g.startX, g.startY);
  g.grabDX = startLogical.x - note.x;
  g.grabDY = startLogical.y - note.y;
}
function updateDrag(e) {
  const note = g.note, node = g.target.node;
  const pt = toLogical(e.clientX, e.clientY);
  const footW = node.offsetWidth * note.scale, footH = node.offsetHeight * note.scale;
  note.x = clamp(pt.x - g.grabDX, 0, Math.max(0, LOGICAL_W - footW));
  note.y = clamp(pt.y - g.grabDY, 0, Math.max(0, LOGICAL_H - footH));
  node.style.left = note.x + 'px';
  node.style.top = note.y + 'px';
}
function endDrag() {
  g.target.node.classList.remove('pressed');
  saveNow();
  if (isDesktop) updateSelectionUI();  // reposition + unhide at the drop point
}

/* Pinch (PRD §6.3 / UIUX §5): transform scale only, clamp 0.5–2.0,
   transform-origin top-left so stored x,y stays truthful and the note
   doesn't drift; re-clamp position if the grown footprint exits the page. */
function startPinch() {
  clearTimeout(g.longPressTimer);
  if (g.mode === 'drag') g.target.node.classList.remove('pressed');
  const pts = [...pointers.values()];
  g.mode = 'pinch';
  rebaseNote(g.note);                // grab math runs in current-frame units (issue #15)
  g.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  g.startScale = g.note.scale;
  g.target.node.classList.add('pressed');
}
/* Shared tail of pinch and the desktop frame-drag resize: apply the clamped
   scale, re-clamp the footprint into the page, refresh the hit area. The note
   was rebased at grab, so note.x is current-frame and needs no renderX here. */
function applyNoteScale(note, node, scale) {
  note.scale = scale;
  node.style.transform = 'scale(' + scale + ')';
  const footW = node.offsetWidth * scale, footH = node.offsetHeight * scale;
  note.x = clamp(note.x, 0, Math.max(0, LOGICAL_W - footW));
  note.y = clamp(note.y, 0, Math.max(0, LOGICAL_H - footH));
  node.style.left = note.x + 'px';
  node.style.top = note.y + 'px';
  setHitInset(node, note);
}

function updatePinch() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return;
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  applyNoteScale(g.note, g.target.node,
    clamp(g.startScale * (dist / g.startDist), MIN_SCALE, MAX_SCALE));
}
function endPinch() {
  if (g) { g.target.node.classList.remove('pressed'); saveNow(); }
  g = null;
}

/* Z-order: last-touched note to the top (end of array + end of DOM). */
function surfaceNote(node) {
  const id = node.dataset.id;
  const note = current.notes.find(n => n.id === id);
  if (!note) return;
  const i = current.notes.indexOf(note);
  if (i === current.notes.length - 1) { return; }    // already on top
  current.notes.splice(i, 1); current.notes.push(note);
  el.board.appendChild(node);                         // move to top of DOM among notes
  saveNow();
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* --- 8.5 Desktop selection (issues #12/#13, #4 select-then-act) -----------
   One selected thing at a time — a note or a Parking Lot line. Selection is
   inert, reversible state: it commits nothing, so it is instant and opens no
   acknowledged window (B18 governs actions). It never calls surfaceNote — that
   would write, and the overlay renders above every note regardless.
   Notes wear a #selection overlay (frame + handles + the two action buttons),
   a sibling of the notes in board space: it inherits renderScale but never
   note.scale, so the chrome stays constant-weight at any note size. Buttons
   are routed through the recognizer — setPointerCapture retargets click, so
   native listeners inside #board are unreliable by construction. */
let selected = null;                 // { kind: 'note'|'lot', id }
let lastTap = { key: null, t: 0 };   // double-click pairing across taps
let selEl = null, selActions = null, selPrimary = null, selDelete = null;

function ensureSelectionEl() {
  if (selEl) return;
  selEl = document.createElement('div');
  selEl.id = 'selection';
  // The outline is visual only; hit-testing lives in four edge bands + the
  // corner handles, so the note's interior stays clickable for the second
  // click of a double-click (a parent's hit area can't be carved out).
  const ring = document.createElement('div');
  ring.className = 'sel-ring';
  selEl.appendChild(ring);
  for (const side of ['n', 's', 'w', 'e']) {
    const b = document.createElement('div');
    b.className = 'sel-edge ' + side;
    selEl.appendChild(b);
  }
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    const h = document.createElement('div');
    h.className = 'sel-handle ' + corner;
    h.setAttribute('aria-hidden', 'true');
    selEl.appendChild(h);
  }
  selActions = document.createElement('div');
  selActions.className = 'sel-actions';
  selPrimary = document.createElement('button');
  selPrimary.type = 'button'; selPrimary.className = 'sel-btn sel-complete';
  selDelete = document.createElement('button');
  selDelete.type = 'button'; selDelete.className = 'sel-btn sel-delete';
  selDelete.textContent = COPY.delete;
  selActions.appendChild(selPrimary); selActions.appendChild(selDelete);
  selEl.appendChild(selActions);
}

function selectNote(id) {
  if (selected && selected.kind === 'note' && selected.id === id) { updateSelectionUI(); return; }
  clearSelection();
  const node = noteEls.get(id);
  if (!node) return;
  selected = { kind: 'note', id };
  node.classList.add('selected');
  ensureSelectionEl();
  el.board.appendChild(selEl);
  updateSelectionUI();
}

function selectLot(id) {
  if (selected && selected.kind === 'lot' && selected.id === id) return;
  clearSelection();
  const node = lotEls.get(id);
  if (!node) return;
  selected = { kind: 'lot', id };
  node.classList.add('selected');
  // Lot rows keep their buttons inline at the right edge (#lot-items clips
  // below-the-row placement on the last visible row) — issue #11.
  const act = document.createElement('span');
  act.className = 'lot-actions';
  const p = document.createElement('button');
  p.type = 'button'; p.className = 'sel-btn sel-complete';
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'sel-btn sel-delete';
  d.textContent = COPY.delete;
  act.appendChild(p); act.appendChild(d);
  node.appendChild(act);
  updateSelectionUI();
}

function clearSelection() {
  if (!selected) return;
  if (selected.kind === 'note') {
    const node = noteEls.get(selected.id);
    if (node) node.classList.remove('selected');
    if (selEl) selEl.remove();
  } else {
    const node = lotEls.get(selected.id);
    if (node) {
      node.classList.remove('selected');
      const act = node.querySelector('.lot-actions');
      if (act) act.remove();
    }
  }
  selected = null;
}

function setSelectionHidden(hidden) {  // drag/resize in flight: chrome steps aside
  if (selEl) selEl.classList.toggle('hidden', hidden);
}

function updateSelectionUI() {
  if (!selected || !current) return;
  if (selected.kind === 'note') {
    const note = current.notes.find(n => n.id === selected.id);
    const node = noteEls.get(selected.id);
    if (!note || !node || !selEl) return;
    const w = node.offsetWidth * note.scale, h = node.offsetHeight * note.scale;
    selEl.style.left = renderX(note) + 'px';
    const top = renderY(note);
    selEl.style.top = top + 'px';
    selEl.style.width = w + 'px';
    selEl.style.height = h + 'px';
    selPrimary.textContent = note.state === 'complete' ? COPY.restore : COPY.complete;
    // Buttons sit under the bottom frame edge; flip above when they'd leave the page.
    selActions.classList.toggle('above', top + h + 64 > LOGICAL_H);
    setSelectionHidden(false);
  } else {
    const node = lotEls.get(selected.id);
    const item = current.parkingLot.find(i => i.id === selected.id);
    if (!node || !item) return;
    const p = node.querySelector('.sel-complete');
    if (p) p.textContent = item.state === 'complete' ? COPY.restore : COPY.complete;
  }
}

/* Frame-drag resize (issue #4): scale from the pointer's distance to the
   note's fixed top-left origin — same clamp, re-clamp, and hit math as pinch. */
function startResize(e) {
  const note = current.notes.find(n => n.id === selected.id);
  const node = noteEls.get(selected.id);
  if (!note || !node) { g.mode = 'cancelled'; return; }
  rebaseNote(note);                  // grab math runs in current-frame units (issue #15)
  g.mode = 'resize';
  g.note = note;
  g.target = { type: 'note', node };
  g.originX = note.x; g.originY = note.y;
  const pt = toLogical(e.clientX, e.clientY);
  g.grabDist = Math.hypot(pt.x - g.originX, pt.y - g.originY) || 1;
  g.startScale = note.scale;
  node.classList.add('pressed');
  setSelectionHidden(true);
}
function updateResize(e) {
  const pt = toLogical(e.clientX, e.clientY);
  const dist = Math.hypot(pt.x - g.originX, pt.y - g.originY);
  applyNoteScale(g.note, g.target.node,
    clamp(g.startScale * (dist / g.grabDist), MIN_SCALE, MAX_SCALE));
}
function endResize() {
  g.target.node.classList.remove('pressed');
  saveNow();
  updateSelectionUI();               // reposition + unhide at the new footprint
}

/* --- 9. Complete / restore / delete + Undo toast ------------------------- */
function completeNote(node) {
  const note = current.notes.find(n => n.id === node.dataset.id);
  note.state = 'complete'; node.classList.add('complete');
  applyCompleteA11y(node, true); saveNow();
}
function restoreNote(node) {
  const note = current.notes.find(n => n.id === node.dataset.id);
  note.state = 'active'; node.classList.remove('complete');
  applyCompleteA11y(node, false); saveNow();
}
function completeLot(node) {
  const item = current.parkingLot.find(i => i.id === node.dataset.id);
  item.state = 'complete'; node.classList.add('complete');
  applyCompleteA11y(node, true); saveNow();
}
function restoreLot(node) {
  const item = current.parkingLot.find(i => i.id === node.dataset.id);
  item.state = 'active'; node.classList.remove('complete');
  applyCompleteA11y(node, false); saveNow();
}

function deleteNote(node) {
  if (selected && selected.kind === 'note' && selected.id === node.dataset.id) clearSelection();
  const note = current.notes.find(n => n.id === node.dataset.id);
  const index = current.notes.indexOf(note);
  const snapshot = JSON.parse(JSON.stringify(note));
  current.notes.splice(index, 1);
  leave(node, () => { node.remove(); noteEls.delete(note.id); });
  saveNow();
  showUndo(() => {
    current.notes.splice(index, 0, snapshot);          // exact z-order
    el.board.appendChild(makeNoteEl(snapshot));
    reorderNotesDOM();
    saveNow();
  });
}
function deleteLot(node) {
  if (selected && selected.kind === 'lot' && selected.id === node.dataset.id) clearSelection();
  const item = current.parkingLot.find(i => i.id === node.dataset.id);
  const index = current.parkingLot.indexOf(item);
  const snapshot = JSON.parse(JSON.stringify(item));
  current.parkingLot.splice(index, 1);
  leave(node, () => { node.remove(); lotEls.delete(item.id); });
  saveNow();
  showUndo(() => {
    current.parkingLot.splice(index, 0, snapshot);
    const newNode = makeLotEl(snapshot);
    const ref = el.lotItems.children[index] || null;
    el.lotItems.insertBefore(newNode, ref);
    saveNow();
  });
}
// Rebuild note DOM order to match array order (used after undo-insert).
function reorderNotesDOM() {
  for (const note of current.notes) {
    const node = noteEls.get(note.id);
    if (node) el.board.appendChild(node);
  }
}
function leave(node, done) {
  node.classList.add('leaving');
  setTimeout(done, LEAVE_MS);
}

/* Undo toast (UIUX §9): 5s, restores exact state; a new delete finalizes prior. */
let undoTimer = null;
function showUndo(undoFn, scope) {
  clearTimeout(undoTimer);
  el.toast.dataset.mode = 'undo';                      // capture priority over save-error
  el.toast.dataset.scope = scope || 'item';            // 'item' undo is current-bound (finding 1)
  el.toast.textContent = '';
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = COPY.deleted;
  const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = COPY.undo;
  // Clear the finalize timer on the click itself, not at the end of the action
  // window, so a late Undo (≈4.6s+) can't be finalized out from under it.
  btn.addEventListener('click', () => {
    clearTimeout(undoTimer);
    delayAction(btn, () => { hideToast(); undoFn(); });
  });
  el.toast.appendChild(msg); el.toast.appendChild(btn);
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('show'));
  undoTimer = setTimeout(hideToast, UNDO_MS);          // timeout finalizes the delete
}
function hideToast() {
  delete el.toast.dataset.mode;
  delete el.toast.dataset.scope;
  el.toast.classList.remove('show');
  setTimeout(() => { if (!el.toast.classList.contains('show')) el.toast.hidden = true; }, 160);
}
function showSaveError() {
  if (el.toast.dataset.mode === 'undo') return;        // never clobber a pending undo
  el.toast.dataset.mode = 'save';
  el.toast.textContent = '';
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = COPY.saveError;
  el.toast.appendChild(msg);
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('show'));
}
function hideSaveError() {
  if (el.toast.dataset.mode === 'save') { delete el.toast.dataset.mode; hideToast(); }
}

/* --- 10. Long-press menu ------------------------------------------------- */
let menuOpen = false, menuKeyHandler = null, menuOutsideHandler = null;
let menuInvoker = null;              // desktop contextmenu: focus returns here on close

function openMenuFor(target, clientX, clientY) {
  let items = [];
  if (target.type === 'anchor') {
    items = [{ label: COPY.boards, glyph: GLYPH.boards, action: goToList }];
  } else {
    const node = target.node;
    const isNote = target.type === 'note';
    const rec = isNote ? current.notes.find(n => n.id === node.dataset.id)
                       : current.parkingLot.find(i => i.id === node.dataset.id);
    if (!rec) return;                // a menu over nothing has nothing to offer
    const completed = rec.state === 'complete';
    // Order (UIUX §7): Complete/Restore · Boards · Delete (destructive last).
    if (completed) items.push({ label: COPY.restore, glyph: GLYPH.restore,
        action: () => (isNote ? restoreNote(node) : restoreLot(node)) });
    else items.push({ label: COPY.complete, glyph: GLYPH.complete,
        action: () => (isNote ? completeNote(node) : completeLot(node)) });
    items.push({ label: COPY.boards, glyph: GLYPH.boards, action: goToList });
    items.push({ sep: true });
    items.push({ label: COPY.delete, glyph: GLYPH.delete, danger: true,
        action: () => (isNote ? deleteNote(node) : deleteLot(node)) });
  }
  buildMenu(items, clientX, clientY);
}

function buildMenu(items, clientX, clientY) {
  closeMenu();
  el.menu.textContent = '';
  const buttons = [];
  for (const it of items) {
    if (it.sep) { const s = document.createElement('div'); s.className = 'sep'; el.menu.appendChild(s); continue; }
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    if (it.danger) b.className = 'danger';
    const g1 = document.createElement('span'); g1.className = 'glyph'; g1.setAttribute('aria-hidden', 'true'); g1.textContent = it.glyph;
    const lb = document.createElement('span'); lb.textContent = it.label;
    b.appendChild(g1); b.appendChild(lb);
    // The menu holds open with the chosen item filled for the window, then
    // closes and acts. One site covers every menu action, board rows included.
    b.addEventListener('click', () => delayAction(b, () => { closeMenu(); it.action(); }));
    el.menu.appendChild(b); buttons.push(b);
  }
  el.menu.hidden = false;
  // Position adjacent to the press point, flipped to stay on-viewport.
  const mw = el.menu.offsetWidth, mh = el.menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight, pad = 8;
  let x = clientX, y = clientY + 8;
  if (x + mw > vw - pad) x = clientX - mw;
  if (x < pad) x = pad;
  if (y + mh > vh - pad) y = clientY - mh - 8;
  if (y < pad) y = pad;
  el.menu.style.left = x + 'px';
  el.menu.style.top = y + 'px';
  requestAnimationFrame(() => el.menu.classList.add('show'));
  menuOpen = true;
  if (buttons[0]) buttons[0].focus();

  menuKeyHandler = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); closeMenu(); }
    else if (ev.key === 'Tab') {                        // trap focus while open
      ev.preventDefault();
      const i = buttons.indexOf(document.activeElement);
      const next = ev.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
      buttons[next].focus();
    } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const i = Math.max(0, buttons.indexOf(document.activeElement));
      const next = ev.key === 'ArrowDown' ? (i + 1) % buttons.length : (i <= 0 ? buttons.length - 1 : i - 1);
      buttons[next].focus();
    }
  };
  document.addEventListener('keydown', menuKeyHandler, true);
  // Dismissal is inert (B30): this handler runs in the capture phase, so the
  // very press that closes the menu would otherwise go on to reach the
  // recognizer and capture a note on the paper the menu was covering.
  menuOutsideHandler = (ev) => {
    if (el.menu.contains(ev.target)) return;
    if (el.board.contains(ev.target)) {
      swallowTap = true;
      setTimeout(() => { swallowTap = false; }, 0);   // never outlives this press
    }
    closeMenu();
  };
  setTimeout(() => document.addEventListener('pointerdown', menuOutsideHandler, true), 0);
}

function closeMenu() {
  if (!menuOpen && el.menu.hidden) return;
  el.menu.classList.remove('show');
  el.menu.hidden = true;
  menuOpen = false;
  if (menuKeyHandler) document.removeEventListener('keydown', menuKeyHandler, true);
  if (menuOutsideHandler) document.removeEventListener('pointerdown', menuOutsideHandler, true);
  menuKeyHandler = menuOutsideHandler = null;
  if (menuInvoker) { const m = menuInvoker; menuInvoker = null; m.focus(); }
}

/* --- 11. Board list + routing -------------------------------------------- */
let listOpen = false;

// One comparator for every board listing (issue #14): creation order, newest
// first — immutable, so a card's slot never moves — with an id tiebreak so
// equal-millisecond creates can't reorder between renders. Boot/recovery keep
// updatedAt deliberately: updatedAt selects continuity, createdAt orders space.
const boardOrder = (a, b) => (b.createdAt - a.createdAt) ||
  (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

// Shared row/card content: title, or untitled placeholder + creation date.
function fillRowContent(node, b) {
  node.textContent = '';
  const titled = !!(b.title && b.title.trim().length);
  const title = document.createElement('span'); title.className = 'row-title';
  title.textContent = titled ? b.title : COPY.untitled;
  if (!titled) title.classList.add('untitled');
  node.appendChild(title);
  if (!titled) {
    const date = document.createElement('span'); date.className = 'row-date';
    date.textContent = formatDate(b.createdAt);
    node.appendChild(date);
  }
}

async function renderList() {
  const all = await idbGetAll();
  all.sort(boardOrder);
  el.listRows.textContent = '';
  for (const b of all) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'board-row'; row.setAttribute('role', 'listitem');
    row.dataset.id = b.id;
    fillRowContent(row, b);
    attachRowGestures(row, b);
    el.listRows.appendChild(row);
  }
}
function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// List rows: tap → open; long-press → Delete (board) with Undo.
function attachRowGestures(row, board) {
  let t = null, sx = 0, sy = 0, longed = false, moved = false;
  row.addEventListener('pointerdown', (e) => {
    sx = e.clientX; sy = e.clientY; longed = false; moved = false;
    if (!isDesktop) {
      t = setTimeout(() => { longed = true; if (navigator.vibrate) navigator.vibrate(10); openBoardRowMenu(row, board, e.clientX, e.clientY); }, LONGPRESS_MS);
    }
  });
  row.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) >= MOVE_THRESHOLD) { moved = true; clearTimeout(t); }
  });
  row.addEventListener('pointerup', () => { clearTimeout(t); if (!longed && !moved) delayAction(row, () => openBoardById(board.id)); });
  row.addEventListener('pointercancel', () => clearTimeout(t));
}
function openBoardRowMenu(row, board, x, y) {
  buildMenu([{ sep: false, label: COPY.delete, glyph: GLYPH.delete, danger: true, action: () => deleteBoard(board.id, row) }], x, y);
}

async function deleteBoard(id, row) {
  const snapshot = await idbGet(id);
  await idbDelete(id);
  if (row) leave(row, () => row.remove());
  const wasCurrent = current && current.id === id;
  if (wasCurrent) current = null;                      // guard invalid current on return
  if (isDesktop) {
    // No list screen heals a dead `current` on desktop — do it now, or the next
    // interaction dereferences current.notes (review finding 2).
    if (wasCurrent) await ensureCurrentValid();
    renderPane();
  }
  showUndo(async () => {
    await idbPut(snapshot);
    if (!isDesktop) { renderList(); return; }
    if (wasCurrent) swapBoard(snapshot.id); else renderPane();
  }, 'board');
}

async function openBoardById(id) {
  finalizeItemUndo();                                   // see swapBoard (finding 1)
  const rec = await idbGet(id);
  if (!rec) return;
  current = rec;
  history.back();                                       // pop the list state → board
}

function openBoardObj(board) {
  current = board;
  renderBoard();
}

async function newBoard() {
  finalizeItemUndo();                                   // see swapBoard (finding 1)
  const board = newBoardRecord();
  await idbPut(board);
  current = board;
  history.back();                                       // page-turn back to the board
}

/* --- 11.5 Desktop board pane (issues #9 / #10 / #14) ---------------------- */
let swapping = false;                // async re-entrancy guard beyond delayAction's window

/* A pending note/lot Undo splices into whatever board is `current` at undo
   time — switching boards would resurrect it onto the wrong board. Board
   swaps finalize it (the delete is already persisted). Board-scoped Undo is
   cross-board-safe and survives. (Review finding 1.) */
function finalizeItemUndo() {
  if (el.toast.dataset.scope === 'item') { clearTimeout(undoTimer); hideToast(); }
}

async function swapBoard(id) {
  if (swapping) return;
  if (current && current.id === id) return;
  finalizeItemUndo();
  swapping = true;
  saveNow();                          // persist() snapshots `current` synchronously — safe
  const rec = await idbGet(id);
  if (!rec) { swapping = false; renderPane(); return; }
  el.board.classList.add('swapping');
  setTimeout(() => {                  // setTimeout, not transitionend: the reduced-motion
    current = rec;                    // kill-switch zeroes transitions (§8)
    renderBoard();
    renderPane();
    el.board.classList.remove('swapping');
    swapping = false;
  }, SWAP_MS);
}

async function renderPane() {
  if (!isDesktop || !el.paneCards) return;
  const all = await idbGetAll();
  all.sort(boardOrder);
  el.paneCards.textContent = '';
  for (const b of all) {
    const row = document.createElement('div');
    row.className = 'pane-row'; row.setAttribute('role', 'listitem');
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'pane-card'; card.dataset.id = b.id;
    fillRowContent(card, b);
    row.appendChild(card);
    if (current && b.id === current.id) {
      card.classList.add('active');
      // Deletion path (a), issue #10: a permanent control on the open board's
      // card only — deleting keeps the board's contents in front of you.
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'pane-del';
      del.setAttribute('aria-label', 'Delete board');
      del.textContent = GLYPH.delete;
      del.addEventListener('click', () => delayAction(del, () => deleteBoard(b.id, row)));
      row.appendChild(del);
    } else {
      // `click` never fires for the secondary button, so this cannot collide
      // with the contextmenu path below.
      card.addEventListener('click', () => delayAction(card, () => swapBoard(b.id)));
    }
    // Deletion path (b), issue #10: right-click any card → the existing
    // one-item danger menu. The one summoning gesture "remove click-and-hold"
    // doesn't touch, and it collides with nothing else in the app.
    card.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();            // scoped to the card; elsewhere stays native
      let x = ev.clientX, y = ev.clientY;
      if (!x && !y) {                 // Shift+F10 fires contextmenu at 0,0
        const r = card.getBoundingClientRect();
        x = r.left + r.width / 2; y = r.top + r.height / 2;
      }
      menuInvoker = card;             // focus returns to the card on close
      openBoardRowMenu(row, b, x, y);
    });
    el.paneCards.appendChild(row);
  }
  updatePaneOverflow();
}

/* §10's truncation law at list level (issue #9): when boards overflow the
   rail, the bottom edge says so; when they don't, it says nothing. */
function updatePaneOverflow() {
  if (!el.paneCards || !el.paneMore) return;
  el.paneMore.hidden = el.paneCards.scrollHeight <= el.paneCards.clientHeight + 1;
}

/* Live title (issue #14): the active card updates in place per keystroke; a
   full renderPane on commit reconciles the untitled date line. */
function updateActiveCardTitle() {
  const card = el.paneCards && el.paneCards.querySelector('.pane-card.active');
  if (!card || !current) return;
  const titleEl = card.querySelector('.row-title');
  if (!titleEl) return;
  const titled = !!(current.title && current.title.trim().length);
  titleEl.textContent = titled ? current.title : COPY.untitled;
  titleEl.classList.toggle('untitled', !titled);
}

/* Desktop new-board: same filled control as the list view (shared class), its
   own listener — the mobile path ends in history.back(), which desktop never
   pushed. The new board's card appears at the top (createdAt order). */
el.paneNew.addEventListener('click', () => delayAction(el.paneNew, async () => {
  const board = newBoardRecord();
  await idbPut(board);
  swapBoard(board.id);
}));

function goToList() {
  if (listOpen) return;
  history.pushState({ v: 'list' }, '');
  showList();
}
async function showList() {
  listOpen = true;
  await renderList();
  el.listView.hidden = false;
}
async function ensureCurrentValid() {
  if (current) { const still = await idbGet(current.id); if (still) return; }
  const all = await idbGetAll();
  current = all.length ? all.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)) : newBoardRecord();
  if (!all.length) await idbPut(current);
  renderBoard();
}
async function showBoardFromList() {
  listOpen = false;
  el.listView.hidden = true;
  if (!current) { await ensureCurrentValid(); }
  else { renderBoard(); }
}

window.addEventListener('popstate', () => {
  closeMenu();
  if (history.state && history.state.v === 'list') { showList(); }
  else { showBoardFromList(); }
});

el.newBoard.addEventListener('click', () => delayAction(el.newBoard, newBoard));

/* --- 12. Boot + service worker ------------------------------------------- */
window.addEventListener('resize', onViewportResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportResize);

async function boot() {
  const all = await idbGetAll();
  let board;
  if (!all.length) { board = newBoardRecord(); await idbPut(board); }
  else { board = all.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)); }  // launch → most recent
  openBoardObj(board);
  if (isDesktop) renderPane();
}
boot();

// Register the service worker at top level (not inside async boot, whose IDB
// awaits can resolve after 'load' has already fired — the listener would miss).
if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') navigator.serviceWorker.register('sw.js').catch(() => {});
  else window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
