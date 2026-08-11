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
    10.5 PDF export (issue #43)
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
  // "All boards" (issue #60): the menu item is a destination, and "Boards"
  // alone read as a category label. One key renames every menu site at once;
  // the #list-title page heading is not a menu and keeps its own text.
  complete: 'Complete', restore: 'Restore', delete: 'Delete', boards: 'All boards',
  deleted: 'Deleted', undo: 'Undo',
  copy: 'Copy', copied: 'Copied', copyError: 'Couldn’t copy.',
  // One word, no ellipsis, no object noun — the menu's existing grammar. There
  // is exactly one export, so "to what?" has one answer; the day a second
  // format exists this has to become a submenu with PDF as the leaf.
  export: 'Export',
  exportError: 'Couldn’t export.',
  exportLossy: 'Some characters aren’t in the PDF font.',
  saveError: 'Couldn’t save — retrying.',
  untitled: 'What’s up?',
};
// ⇩ is "out of the app, down to the device". Not ↓ (the browser-download
// convention, borrowed rather than reasoned) and not 📄, which restates the
// noun and puts a colour emoji against ▦'s geometric weight.
// ⧉ is "this, again, elsewhere" — two frames, one content; the note motif
// doubled, in the set's geometric weight.
const GLYPH = { complete: '✓', restore: '↺', boards: '▦', export: '⇩', copy: '⧉', delete: '🗑' };

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
  el.board.style.setProperty('--lot-h', lotH() + 'px');
  // After --logical-w: the card's width sets how many lines the title takes.
  syncCardHeight();
  // Re-derive each note's on-sheet x, y AND size (proportional across frames —
  // the multiplier tracks LOGICAL_W, issue #57) and its decoupled hit area
  // (physical size changed).
  noteEls.forEach((node, id) => {
    const note = current && current.notes.find(n => n.id === id);
    if (note) {
      node.style.left = renderX(note) + 'px';
      node.style.top = renderY(note) + 'px';
      node.style.transform = 'scale(' + effScale(note) + ')';
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

/* Homothetic size (issue #57, B39): renderX's law, applied to visual scale.
   Along x, position ×k and width ×k together preserve horizontal overlap
   exactly for any change of sheet width — resizing the viewport resizes the
   notes at the same ratio instead of sliding constant-size notes into each
   other. y stays on renderY's height law, so when the two ratios diverge (an
   aspect change) vertical clearances can still shift — accepted in B39. The
   multiplier is never clamped: MIN/MAX_SCALE bound the *authored* scale at
   gesture time, not this frame mapping. */
const noteMult = (note) => LOGICAL_W / (note.rw || 900);
const effScale = (note) => (note.scale || 1) * noteMult(note);   // ‖1: heal a scale-less legacy record

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
  // Fold the homothetic multiplier into the authored scale (issue #57, B39):
  // effScale before equals note.scale after, so the grab is visually silent —
  // and with mult ≡ 1 from here on, every gesture (drag footprints, pinch and
  // resize scaling) runs in current-frame units unmodified. The folded scale
  // may leave [MIN_SCALE, MAX_SCALE]; the gesture clamps widen to admit it.
  const m = noteMult(note);
  note.x = renderX(note);
  note.y = renderY(note);
  note.scale = (note.scale || 1) * m;  // ‖1 mirrors effScale: never fold NaN into storage
  note.rw = LOGICAL_W;
  note.rh = LOGICAL_H;
}

/* PRD §6.2's cap is "45% of board width"; 405 was that fraction of the fixed
   900 sheet, and at 1:1 a fixed 405 is ~98% of a phone — no cap at all, and the
   spatial board collapses into one column. Desktop keeps the literal: its
   LOGICAL_W is derived per layout (B20), and 45% of it would widen desktop
   notes to ~570px, which B32 does not license. */
const noteMaxW = () => isDesktop ? MAX_NOTE_W : Math.round(LOGICAL_W * 0.45);

/* The Parking Lot's visible row budget (B37, issue #49). Whole rows only: a row
   is a 44px hit target (§6) and #lot-items clips, so a fraction of the sheet
   would draw a row cut in half. Three rows plus the 16px bottom margin is 182 —
   fine on the 1000-unit reference sheet at 18%, a quarter of a 737-unit phone.
   Below 900 the lot drops to two. It is chosen here rather than in CSS for the
   same reason --note-max-w is: CSS cannot step a length by whole rows.
   Desktop always takes three — B20 pins LOGICAL_H >= 1000. */
const LOT_HEAD = 34, LOT_ROW = 44, LOT_3ROW_MIN_H = 900;
const lotH = () => LOT_HEAD + LOT_ROW * (LOGICAL_H >= LOT_3ROW_MIN_H ? 3 : 2);

/* The card's *rendered* height, republished so the header labels sit under the
   card it actually is rather than the two-line card --card-h assumes (B37).
   A phone card is ~145 units wide and a real title often takes three lines; at
   the min-height alone the labels stayed put and "Requirements" — width:
   max-content, spilling inward by design (B35) — ran under the card's frame.
   Cheap: one offsetHeight read, and only where the title can have changed. */
function syncCardHeight() {
  el.board.style.setProperty('--card-actual-h', anchorEls.title.offsetHeight + 'px');
}

function setHitInset(node, note) {
  const w = node.offsetWidth, h = node.offsetHeight;   // logical (transform-independent)
  const k = effScale(note) * renderScale;              // what the note draws at (issue #57)
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
  node.style.transform = 'scale(' + effScale(note) + ')';   // homothetic (issue #57)

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
      // Complete/Restore/Copy/Delete — every button runs through B18's window,
      // Copy included: one grammar for the row, and the drain animation is the
      // acknowledgment a clipboard write otherwise lacks (issue #59). Copy of
      // a completed item is allowed — the record still holds the text.
      const lotRow = target.node.closest('.lot-item');
      const isDel = target.node.classList.contains('sel-delete');
      const isCopy = target.node.classList.contains('sel-copy');
      delayAction(target.node, () => {
        if (lotRow) {
          const item = current.parkingLot.find(i => i.id === lotRow.dataset.id);
          if (!item) return;
          if (isCopy) copyText(item.text);
          else if (isDel) { clearSelection(); deleteLot(lotRow); }
          else {
            if (item.state === 'complete') restoreLot(lotRow); else completeLot(lotRow);
            updateSelectionUI();
          }
        } else if (selected && selected.kind === 'note') {
          const node = noteEls.get(selected.id);
          const note = current.notes.find(n => n.id === selected.id);
          if (!node || !note) return;
          if (isCopy) copyText(note.text);
          else if (isDel) { clearSelection(); deleteNote(node); }
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
    if (t.dataset.anchor === 'title') {
      syncCardHeight();                  // the card grows as it is typed into
      if (isDesktop) updateActiveCardTitle();
    }
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
  // Page bounds for the drag, fixed once (the footprint cannot change mid-
  // drag) and widened to include the grab position (B39): a cross-frame note
  // can arrive bigger than the sheet or past its edge, and the plain
  // [0, max(0, sheet − foot)] range would teleport it on the first move —
  // the visually-silent-grab promise broken by its own clamp. For a note
  // already in range these are exactly the old bounds.
  const node = g.target.node;
  const footW = node.offsetWidth * note.scale, footH = node.offsetHeight * note.scale;
  g.dragMinX = Math.min(0, note.x);
  g.dragMaxX = Math.max(note.x, Math.max(0, LOGICAL_W - footW));
  g.dragMinY = Math.min(0, note.y);
  g.dragMaxY = Math.max(note.y, Math.max(0, LOGICAL_H - footH));
}
function updateDrag(e) {
  const note = g.note, node = g.target.node;
  const pt = toLogical(e.clientX, e.clientY);
  note.x = clamp(pt.x - g.grabDX, g.dragMinX, g.dragMaxX);
  note.y = clamp(pt.y - g.grabDY, g.dragMinY, g.dragMaxY);
  node.style.left = note.x + 'px';
  node.style.top = note.y + 'px';
}
function endDrag() {
  g.target.node.classList.remove('pressed');
  saveNow();
  if (isDesktop) updateSelectionUI();  // reposition + unhide at the drop point
}

/* Pinch (PRD §6.3 / UIUX §5): transform scale only, clamp 0.5–2.0 (bounds
   widen to admit a folded cross-frame scale, B39), transform-origin top-left
   so stored x,y stays truthful and the note doesn't drift; re-clamp position
   if the grown footprint exits the page. */
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
  // A footprint can exceed the sheet only via a folded cross-frame scale
  // (B39); there the old [0, max(0, sheet − foot)] range degenerates to [0,0]
  // and pins the note to the corner. Min/max of the same pair inverts the
  // constraint instead — sheet-inside-note where note-inside-sheet is
  // impossible. For a fitting note this is the old clamp unchanged.
  note.x = clamp(note.x, Math.min(0, LOGICAL_W - footW), Math.max(0, LOGICAL_W - footW));
  note.y = clamp(note.y, Math.min(0, LOGICAL_H - footH), Math.max(0, LOGICAL_H - footH));
  node.style.left = note.x + 'px';
  node.style.top = note.y + 'px';
  setHitInset(node, note);
}

/* The widened gesture clamp (issue #57, B39): bounds admit the start value, so
   a folded cross-frame scale outside [MIN_SCALE, MAX_SCALE] never snaps at
   gesture start — yet it can always be scaled back into the authored range,
   and never further out. Shared by pinch and frame-drag resize (B22). */
const gestureScale = (start, f) =>
  clamp(start * f, Math.min(MIN_SCALE, start), Math.max(MAX_SCALE, start));

function updatePinch() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return;
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  applyNoteScale(g.note, g.target.node, gestureScale(g.startScale, dist / g.startDist));
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
let selEl = null, selActions = null, selPrimary = null, selCopy = null, selDelete = null;

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
  // Copy sits between them (issue #59): Complete · Copy · Delete — the same
  // non-destructive-first, destructive-last order as the long-press menu (B42).
  selCopy = document.createElement('button');
  selCopy.type = 'button'; selCopy.className = 'sel-btn sel-copy';
  selCopy.textContent = COPY.copy;
  selDelete = document.createElement('button');
  selDelete.type = 'button'; selDelete.className = 'sel-btn sel-delete';
  selDelete.textContent = COPY.delete;
  selActions.appendChild(selPrimary); selActions.appendChild(selCopy);
  selActions.appendChild(selDelete);
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
  const c = document.createElement('button');
  c.type = 'button'; c.className = 'sel-btn sel-copy';
  c.textContent = COPY.copy;                     // lot rows copy too (issue #59)
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'sel-btn sel-delete';
  d.textContent = COPY.delete;
  act.appendChild(p); act.appendChild(c); act.appendChild(d);
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
    const w = node.offsetWidth * effScale(note), h = node.offsetHeight * effScale(note);
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
  applyNoteScale(g.note, g.target.node, gestureScale(g.startScale, dist / g.grabDist));
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
  delete el.toast.dataset.seq;
  el.toast.classList.remove('show');
  setTimeout(() => { if (!el.toast.classList.contains('show')) el.toast.hidden = true; }, 160);
}
/* A message with no action. `save` is persistent (hideSaveError clears it when
   the write lands); `export` and `copy` carry a ttl, because nothing later will
   come along to retract them. */
let noticeSeq = 0;
function showNotice(text, mode, ttl) {
  if (el.toast.dataset.mode === 'undo') return;        // never clobber a pending undo
  // Each notice stamps the toast; the ttl timer only hides its own stamp. A
  // mode check alone let a stale timer hide a newer same-mode notice early —
  // copying two items inside 1.5s (issue #59) is how that became observable.
  const seq = String(++noticeSeq);
  el.toast.dataset.mode = mode;
  el.toast.dataset.seq = seq;
  el.toast.textContent = '';
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = text;
  el.toast.appendChild(msg);
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('show'));
  if (ttl) setTimeout(() => {
    if (el.toast.dataset.mode === mode && el.toast.dataset.seq === seq) hideToast();
  }, ttl);
}
function showSaveError() {
  // A retrying save re-announces itself on every attempt, so it can afford to
  // wait behind a notice that will time out; the reverse is not true.
  if (el.toast.dataset.mode === 'export') return;
  showNotice(COPY.saveError, 'save');
}
function hideSaveError() {
  if (el.toast.dataset.mode === 'save') { delete el.toast.dataset.mode; hideToast(); }
}

/* Copy an item's plain text — the record field, never the DOM (issue #59).
   clipboard.writeText is the real API; where it's missing or rejects (insecure
   origin, permission policy) fall back to the execCommand route through a
   throwaway textarea. Success gets a short notice; failure gets a longer one,
   because it is the only evidence anything went wrong. */
function copyText(text) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    // The body forbids selection, so the textarea must opt back in or select()
    // grabs nothing and execCommand copies nothing. Off-viewport, not hidden:
    // a display:none control cannot hold a selection either.
    ta.style.cssText =
      'position:fixed;top:0;left:-9999px;user-select:text;-webkit-user-select:text;';
    let done = false;
    try {
      document.body.appendChild(ta);
      ta.select();
      done = document.execCommand('copy');
    } catch (err) { /* done stays false */ }
    finally { ta.remove(); }
    if (done) showNotice(COPY.copied, 'copy', 1500);
    else showNotice(COPY.copyError, 'copy', UNDO_MS);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showNotice(COPY.copied, 'copy', 1500), fallback);
  } else fallback();
}

/* --- 10. Long-press menu ------------------------------------------------- */
let menuOpen = false, menuKeyHandler = null, menuOutsideHandler = null;
let menuInvoker = null;              // desktop contextmenu: focus returns here on close

function openMenuFor(target, clientX, clientY) {
  let items = [];
  if (target.type === 'anchor') {
    // Long-press on the board you're looking at (issue #43): export it
    // directly rather than routing through the list. Both items are
    // non-destructive, so no separator — same rule as everywhere else.
    items = [
      { label: COPY.export, glyph: GLYPH.export, action: () => exportBoardPdf(current) },
      { label: COPY.boards, glyph: GLYPH.boards, action: goToList },
    ];
  } else {
    const node = target.node;
    const isNote = target.type === 'note';
    const rec = isNote ? current.notes.find(n => n.id === node.dataset.id)
                       : current.parkingLot.find(i => i.id === node.dataset.id);
    if (!rec) return;                // a menu over nothing has nothing to offer
    const completed = rec.state === 'complete';
    // Order (B42, issues #59/#60): All boards · Complete/Restore · Copy ·
    // Delete. A1's Complete-first placement is superseded; UIUX §7's law —
    // destructive last, in --danger, behind a hairline — still holds.
    items.push({ label: COPY.boards, glyph: GLYPH.boards, action: goToList });
    if (completed) items.push({ label: COPY.restore, glyph: GLYPH.restore,
        action: () => (isNote ? restoreNote(node) : restoreLot(node)) });
    else items.push({ label: COPY.complete, glyph: GLYPH.complete,
        action: () => (isNote ? completeNote(node) : completeLot(node)) });
    // Copy reads the live record, not a snapshot — an edit between open and
    // act (impossible by gesture, cheap to honour) still copies the truth.
    items.push({ label: COPY.copy, glyph: GLYPH.copy, action: () => copyText(rec.text) });
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

/* --- 10.5 PDF export (issue #43) -----------------------------------------
   A board leaves the device as a .pdf, not a screenshot. PDF is a text format
   and the base-14 fonts need no embedding, so the whole exporter is written
   here rather than vendored: a library would be the app's first dependency and
   its first precache entry, and B1 already settled that this project hand-rolls
   its encoders (the icons come out of a dependency-free PNG writer).

   Two pages. Page 1 is the board itself — the same furniture and the same note
   positions, drawn as vectors, which is what the screenshot was standing in
   for. Page 2 is the text of the board, for search and for reading.

   Everything is drawn in ONE convention: origin top-left, y down, matching CSS
   and matching the stored coordinates. Each page opens with a y-flip so the
   numbers below transcribe straight out of styles.css. Text is the exception a
   flip creates — a mirrored CTM would mirror the glyphs — so every string sets
   its own `1 0 0 -1` text matrix, which cancels the flip and leaves the scale.
   ---------------------------------------------------------------------- */

const A4_W = 595.28, A4_H = 841.89;  // pt; the fit is one constant either way
const PDF_MARGIN = 36;
const PDF_ASC = 0.718, PDF_DESC = 0.207;   // Helvetica em box, for baselines

/* The export sheet is the 900x1000 REFERENCE frame, never the live
   LOGICAL_W/LOGICAL_H — those are viewport-derived (B20/B32), so exporting at
   them would make the same board a different document on every device. */
const EXPORT_W = 900, EXPORT_H = 1000;

/* Always the light palette. Dark mode is a screen affordance; --paper at
   #1A161C prints as a slab of near-black and costs a cartridge to find out. */
const PDF_PAPER = [0.933, 0.922, 0.937];   // --paper  #EEEBEF
const PDF_INK   = [0.133, 0.110, 0.141];   // --ink    #221C24
const PDF_SHADE = [0.514, 0.482, 0.533];   // --ink-shadow #837B88
// The scratch-out is 0.97 opaque over paper; mixing it down beats carrying an
// ExtGState object just to say so.
const PDF_SCRATCH = PDF_INK.map((c, i) => c * 0.97 + PDF_PAPER[i] * 0.03);

/* Helvetica / Helvetica-Bold advance widths, WinAnsi 32..255, two base-36
   digits each. The PDF viewer sets in ITS Helvetica, not the browser's system
   font, so wrapping has to be measured against these and not against the DOM. */
const PDF_W_REG =
  '7q7q9vfgfgopij5b9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg7q7qg8g8g8fgs7ijijk2k2ijgzlmk27qdwijfgn5k2lm' +
  'ijlmk2ijgzk2ijq8ijijgz7q7q7qd1fg99fgfgdwfgfg7qfgfg6666dw66n5fgfgfgfg99dw7qfgdwk2dwdwdw9a789ag800' +
  'fg0066fg99rsfgfg99rsij99rs00gz0000666699999qfgrs99rsdw99q800dwij7q99fgfgfgfg78fg99khaafgg899kh99' +
  'b4g8999999fgex7q9999a5fgn6n6n6gzijijijijijijrsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgz' +
  'fgfgfgfgfgfgopdwfgfgfgfg7q7q7q7qfgfgfgfgfgfgfgg8gzfgfgfgfgdwfgdw';
const PDF_W_BOLD =
  '7q99d6fgfgopk26m9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg9999g8g8g8gzr3k2k2k2k2ijgzlmk27qfgk2gzn5k2lm' +
  'ijlmk2ijgzk2ijq8ijijgz997q99g8fg99fggzfggzfg99gzgz7q7qfg7qopgzgzgzgzatfg99gzfglmfgfgdwat7satg800' +
  'fg007qfgdwrsfgfg99rsij99rs00gz00007q7qdwdw9qfgrs99rsfg99op00dwij7q99fgfgfgfg7sfg99khaafgg899kh99' +
  'b4g8999999gzfg7q9999a5fgn6n6n6gzk2k2k2k2k2k2rsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgz' +
  'fgfgfgfgfgfgopfgfgfgfgfg7q7q7q7qgzgzgzgzgzgzgzg8gzgzgzgzgzfggzfg';

/* CP1252's own 0x80-0x9F block — the only codes whose Unicode is not their
   byte. The app's own copy lives here (’), so this is not a nicety. */
const PDF_CP1252 = {
  0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134,
  0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140,
  0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149,
  0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155,
  0x0153: 156, 0x017E: 158, 0x0178: 159,
};

/* Unicode -> WinAnsi. A base-14 font cannot say CJK or emoji and embedding one
   that could would mean shipping a font file — the dependency this exporter
   exists to avoid. Those characters export as '?', and the substitution is
   reported rather than swallowed: §10's law is that truncation is always
   indicated, and a silently mangled line is truncation. See DECISIONS B34. */
let pdfLossy = false;
function pdfCode(ch) {
  const u = ch.codePointAt(0);
  if (u === 9) return 32;                              // tab -> space
  if ((u >= 32 && u <= 126) || (u >= 160 && u <= 255)) return u;
  const m = PDF_CP1252[u];
  if (m !== undefined) return m;
  pdfLossy = true;
  return 63;
}
function pdfAdv(code, bold) {
  if (code < 32 || code > 255) return 0;
  const t = bold ? PDF_W_BOLD : PDF_W_REG, p = (code - 32) * 2;
  return parseInt(t.charAt(p) + t.charAt(p + 1), 36) || 0;
}
function pdfTextW(str, bold, size) {
  let u = 0;
  for (const ch of String(str)) u += pdfAdv(pdfCode(ch), bold);
  return u * size / 1000;
}

/* A PDF literal string. Escaping to octal above 126 keeps every byte we ever
   append <= 0x7F, which is what lets `String.length` stand in for byte length
   when the xref offsets are computed. */
function pdfStr(str) {
  let out = '(';
  for (const ch of String(str)) {
    const c = pdfCode(ch);
    if (c === 40 || c === 41 || c === 92) out += '\\' + String.fromCharCode(c);
    else if (c < 32 || c > 126) out += '\\' + ('00' + c.toString(8)).slice(-3);
    else out += String.fromCharCode(c);
  }
  return out + ')';
}

// Fixed-notation numbers: a PDF has no exponent syntax, and 1e-7 is a syntax
// error rather than a rounding difference.
function pdfNum(n) {
  if (!isFinite(n)) n = 0;
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/* `white-space: pre-wrap` + `overflow-wrap: break-word`, measured in Helvetica.
   Hard breaks are honoured; a word wider than the box breaks mid-word rather
   than overflowing it, which is what the note frames rely on to stay 405 wide. */
function pdfWrap(str, bold, size, maxW) {
  const lines = [];
  if (!(maxW > 0)) return [String(str)];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (let word of para.split(' ')) {
      while (pdfTextW(word, bold, size) > maxW) {
        let cut = 1;
        while (cut < word.length && pdfTextW(word.slice(0, cut + 1), bold, size) <= maxW) cut++;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const trial = line ? line + ' ' + word : word;
      if (!line || pdfTextW(trial, bold, size) <= maxW) line = trial;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}
// `width: max-content` — the widest hard line, i.e. what the box measures when
// nothing is allowed to soft-wrap. This is how a note frame shrink-wraps.
function pdfNaturalW(str, bold, size) {
  let w = 0;
  for (const para of String(str).split('\n')) w = Math.max(w, pdfTextW(para, bold, size));
  return w;
}
// Where a baseline sits inside a CSS line box of height `lh`.
function pdfBaseline(top, lh, size) {
  return top + (lh - size * (PDF_ASC + PDF_DESC)) / 2 + size * PDF_ASC;
}

/* ---- Content-stream builder --------------------------------------------
   Board coordinates in, operators out. Every method returns `p` so the
   drawing code below reads as a sequence rather than a pile of pushes. */
function pdfCanvas() {
  const ops = [];
  const p = {
    ops,
    raw(s) { ops.push(s); return p; },
    q() { return p.raw('q'); },
    Q() { return p.raw('Q'); },
    cm(a, b, c, d, e, f) {
      return p.raw([a, b, c, d, e, f].map(pdfNum).join(' ') + ' cm');
    },
    flip(h) { return p.cm(1, 0, 0, -1, 0, h); },       // top-left origin, y down
    fill(c) { return p.raw(c.map(pdfNum).join(' ') + ' rg'); },
    strokeColor(c) { return p.raw(c.map(pdfNum).join(' ') + ' RG'); },
    lineWidth(w) { return p.raw(pdfNum(w) + ' w'); },
    rect(x, y, w, h) {
      return p.raw([x, y, w, h].map(pdfNum).join(' ') + ' re');
    },
    line(x1, y1, x2, y2) {
      return p.raw(pdfNum(x1) + ' ' + pdfNum(y1) + ' m ' + pdfNum(x2) + ' ' + pdfNum(y2) + ' l');
    },
    // Rounded rect as a path; radius 2 everywhere, as everywhere in the CSS.
    rrect(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      if (!r) return p.rect(x, y, w, h);
      const k = r * 0.5523, X = x + w, Y = y + h;
      const c = (x1, y1, x2, y2, x3, y3) =>
        p.raw([x1, y1, x2, y2, x3, y3].map(pdfNum).join(' ') + ' c');
      p.raw(pdfNum(x + r) + ' ' + pdfNum(y) + ' m');
      p.raw(pdfNum(X - r) + ' ' + pdfNum(y) + ' l');
      c(X - r + k, y, X, y + r - k, X, y + r);
      p.raw(pdfNum(X) + ' ' + pdfNum(Y - r) + ' l');
      c(X, Y - r + k, X - r + k, Y, X - r, Y);
      p.raw(pdfNum(x + r) + ' ' + pdfNum(Y) + ' l');
      c(x + r - k, Y, x, Y - r + k, x, Y - r);
      p.raw(pdfNum(x) + ' ' + pdfNum(y + r) + ' l');
      c(x, y + r - k, x + r - k, y, x + r, y);
      return p.raw('h');
    },
    clip() { return p.raw('W n'); },
    // A CSS border is drawn inside the box; a PDF stroke straddles the path.
    // Inset by half the width so a 2px frame lands where the browser puts it.
    frame(x, y, w, h, r, bw, bg) {
      if (bg) { p.fill(bg); p.rrect(x, y, w, h, r); p.raw('f'); }
      p.strokeColor(PDF_INK).lineWidth(bw);
      p.rrect(x + bw / 2, y + bw / 2, w - bw, h - bw, Math.max(0, r - bw / 2));
      return p.raw('S');
    },
    /* One line of text on a baseline. The text matrix cancels the page flip;
       without it every glyph would render upside down. */
    text(str, x, baseline, size, bold, color) {
      if (!String(str).length) return p;
      p.fill(color || PDF_INK);
      p.raw('BT');
      p.raw('/' + (bold ? 'F2' : 'F1') + ' ' + pdfNum(size) + ' Tf');
      p.raw('1 0 0 -1 ' + pdfNum(x) + ' ' + pdfNum(baseline) + ' Tm');
      p.raw(pdfStr(str) + ' Tj');
      return p.raw('ET');
    },
    // align: 'left' | 'center' | 'right', measured in the box's own width.
    lines(arr, x, w, top, size, lh, bold, align, color) {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (!s.length) continue;
        let tx = x;
        if (align === 'center') tx = x + (w - pdfTextW(s, bold, size)) / 2;
        else if (align === 'right') tx = x + w - pdfTextW(s, bold, size);
        p.text(s, tx, pdfBaseline(top + i * lh, lh, size), size, bold, color);
      }
      return p;
    },
    /* The scratch-out: the three repeating-linear-gradients of styles.css §4.3
       as three families of ruled lines. Clip first — this fills whatever the
       current clip allows. Angles are CSS's, and in a y-down space a positive
       angle rotates clockwise on screen, same as CSS reads them. */
    scratch(w, h) {
      const bands = [[8, 5, 8], [-14, 4, 7], [79, 3, 5]];
      const R = Math.hypot(w, h) / 2 + 4;
      p.strokeColor(PDF_SCRATCH);
      for (const [deg, thick, period] of bands) {
        const a = deg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
        p.q().cm(cos, sin, -sin, cos, w / 2, h / 2).lineWidth(thick);
        for (let y = -R; y <= R; y += period) p.line(-R, y + thick / 2, R, y + thick / 2);
        p.raw('S').Q();
      }
      return p;
    },
    stream() { return ops.join('\n'); },
  };
  return p;
}

/* ---- Document assembly --------------------------------------------------
   Object numbers are fixed rather than allocated: catalog 1, pages 2, the two
   fonts 3 and 4, then page/content pairs from 5. Offsets are counted off the
   string as it grows, which is only sound because every byte appended is
   ASCII — pdfStr guarantees it for the one place user text gets in. */
function pdfAssemble(streams, title) {
  const n = streams.length;
  const kids = [];
  for (let i = 0; i < n; i++) kids.push((5 + i * 2) + ' 0 R');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  for (let i = 0; i < n; i++) {
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pdfNum(A4_W) + ' ' + pdfNum(A4_H) + ']' +
              ' /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>' +
              ' /Contents ' + (6 + i * 2) + ' 0 R >>');
    objs.push('<< /Length ' + streams[i].length + ' >>\nstream\n' + streams[i] + '\nendstream');
  }
  // No dates in /Info: without them the same unchanged board exports to
  // byte-identical files, which is both a nice property and a cheap test.
  const infoNo = objs.length + 1;
  objs.push('<< /Title ' + pdfStr(title) + ' /Producer ' + pdfStr('To-Do Boards') + ' >>');

  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(out.length);
    out += (i + 1) + ' 0 obj\n' + objs[i] + '\nendobj\n';
  }
  const startxref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  for (const off of offsets) out += ('0000000000' + off).slice(-10) + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info ' + infoNo + ' 0 R >>\n' +
         'startxref\n' + startxref + '\n%%EOF\n';

  // The offsets above are string indices. They are byte offsets only because
  // every byte we append is 7-bit — pdfStr octal-escapes the one path user text
  // takes in. Assert it rather than trust it: a stray non-ASCII character
  // shifts every entry and presents as "damaged file", which is a wretched bug
  // to find later.
  if (/[^\x00-\x7F]/.test(out)) throw new Error('pdf: non-ascii byte in stream');
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
  return bytes;
}

/* ---- Page 1: the board ---------------------------------------------------
   Geometry is styles.css read against the 900x1000 sheet: the 2.6667% gutter
   is 24, the card is 280..620 (37.7778%, B35), so the Components zone ends at
   272 and Requirements starts at 628 — the card's edges ±the 8px gap. Draw
   order is the stacking order — the card must cover the band rule (B33), and
   notes sit above every piece of furniture. */
const EXPORT_GEO = {
  gutter: 24, ruleY: 48,                // --band-top + --card-h / 2 (B37)
  bandTop: 14,
  compL: 24, compR: 272, reqL: 628, reqR: 876,
  cardL: 280, cardW: 340, cardTop: 14, cardMinH: 68, cardPad: 12,
  // The export sheet is 1000 units tall, so it keeps the three-row lot (B37).
  lotTop: EXPORT_H - 16 - 166, lotH: 166, lotHeaderY: 8, lotItemsY: 34, lotRow: 44,
  headSize: 15, headLH: 19.5,          // 15px / 1.3, the band + card + lot header
  lotSize: 16, lotLH: 23.2,            // 16px / 1.45
  noteSize: 17, noteLH: 23.8,          // 17px / 1.4
  border: 2, radius: 2, notePadX: 12, notePadY: 10, noteMaxW: 405,
};

// The same proportional law as renderX/renderY (issue #15, B32), resolved
// against the export sheet instead of the viewport. Stored x/y are read only —
// B21's "committed positions are permanent" is not ours to break.
const exportX = (n) => n.x * (EXPORT_W / (n.rw || 900));
const exportY = (n) => n.rh
  ? n.y * (EXPORT_H / n.rh)
  : clamp(n.y * (EXPORT_H / LEGACY_H), 0, Math.max(0, EXPORT_H - HIT_FLOOR));
// exportX's law applied to visual scale — noteMult with EXPORT_W standing in
// for LOGICAL_W. One law shared with the screen (issue #57, B39): the PDF
// draws the proportions the board shows, instead of drifting whenever a note
// was authored on a frame other than 900.
const exportMult = (n) => EXPORT_W / (n.rw || 900);

// Border box of a note, before its own scale — `width: max-content` capped at
// the width cap of the frame it was authored in, height from however many
// lines that width produces. The cap restates noteMaxW against `rw` (B39):
// 45% of a mobile sheet, the literal 405 on desktop — and since desktop pins
// rw ≥ 900 (B20), min() of the two selects the right law without a mode flag.
// The literal 405 alone would re-wrap a phone note at desktop width and, under
// exportMult, run it off the export sheet.
function exportNoteBox(note) {
  const g = EXPORT_GEO;
  const chrome = 2 * g.notePadX + 2 * g.border;
  const cap = Math.min(g.noteMaxW, Math.round((note.rw || 900) * 0.45));
  const maxContent = cap - chrome;
  const content = Math.min(pdfNaturalW(note.text, false, g.noteSize), maxContent);
  const lines = pdfWrap(note.text, false, g.noteSize, content);
  return {
    w: content + chrome,
    h: lines.length * g.noteLH + 2 * g.notePadY + 2 * g.border,
    content, lines,
  };
}

function exportBoardPage(rec) {
  const g = EXPORT_GEO;
  const scale = Math.min((A4_W - 2 * PDF_MARGIN) / EXPORT_W, (A4_H - 2 * PDF_MARGIN) / EXPORT_H);
  const mx = (A4_W - EXPORT_W * scale) / 2;
  const my = (A4_H - EXPORT_H * scale) / 2;   // centred: the sheet is squarer than A4
  const p = pdfCanvas();
  p.q().flip(A4_H);
  // Paper edge to edge, not a paper rectangle floating on white. Paper tone is
  // named in styles.css §1 as part of the identity, alongside the frame and the
  // scratch-out, and the margin is margin — not a desk. B17 and B32 spent two
  // rulings deleting the letterbox; this is not the place to reintroduce it.
  p.fill(PDF_PAPER).rect(0, 0, A4_W, A4_H).raw('f');
  p.cm(scale, 0, 0, scale, mx, my);
  p.fill(PDF_PAPER).rect(0, 0, EXPORT_W, EXPORT_H).raw('f');   // the sheet itself

  // The band rule, then the two zones, then the card on top of the rule.
  p.fill(PDF_INK).rect(g.gutter, g.ruleY, EXPORT_W - 2 * g.gutter, 1).raw('f');

  const zones = [
    { text: rec.components, label: 'Components', l: g.compL, r: g.compR, align: 'left' },
    { text: rec.requirements, label: 'Requirements', l: g.reqL, r: g.reqR, align: 'right' },
  ];
  // Measured before the zones are drawn, because the labels hang off it: the
  // card is at least cardMinH and grows with the title, and the labels follow
  // it down (B37 — .band-zone reads --card-actual-h for the same reason).
  const title = rec.title || '';
  const cardContentW = g.cardW - 2 * g.cardPad - 2 * g.border;
  const titleLines = title ? pdfWrap(title, true, g.headSize, cardContentW) : [];
  const cardH = Math.max(g.cardMinH,
                         titleLines.length * g.headLH + 2 * g.cardPad + 2 * g.border);
  for (const z of zones) {
    const w = z.r - z.l;
    // 6px under the card, mirroring .band-label's `top: calc(100% + 6px)`.
    const labelTop = g.cardTop + cardH + 6;
    if (z.text) {
      // .anchor has padding 2px 0 4px. Not clipped to the zone: on screen the
      // zone sets no overflow, so a long entry flows down over the canvas, and
      // since B37 made the zone the card's own 68-unit box a clip here would
      // start cutting text at three lines that the board still shows. The
      // export draws what the screen draws (B34).
      p.lines(pdfWrap(z.text, true, g.headSize, w), z.l, w, g.bandTop + 2,
              g.headSize, g.headLH, true, 'left');
    }
    p.lines([z.label], z.l, w, labelTop, g.headSize, g.headLH, true, z.align);
  }

  p.frame(g.cardL, g.cardTop, g.cardW, cardH, g.radius, g.border, PDF_PAPER);
  if (titleLines.length) {
    // justify-content: center — the block is centred in the card, then each
    // line is centred in the block.
    const blockH = titleLines.length * g.headLH;
    const top = g.cardTop + (cardH - blockH) / 2;
    p.lines(titleLines, g.cardL + g.border + g.cardPad, cardContentW, top,
            g.headSize, g.headLH, true, 'center');
  }

  // Parking Lot. #lot-items is overflow:hidden, so the export clips too —
  // otherwise a long lot walks off the bottom of the page.
  const lotW = EXPORT_W - 2 * g.gutter;
  p.fill(PDF_INK).rect(g.gutter, g.lotTop, lotW, 1).raw('f');
  p.lines(['Parking Lot'], g.gutter, lotW, g.lotTop + g.lotHeaderY,
          g.headSize, g.headLH, true, 'left');
  const itemsTop = g.lotTop + g.lotItemsY;
  const itemsH = g.lotH - g.lotItemsY;
  p.q().rect(g.gutter, itemsTop, lotW, itemsH).clip();
  let ly = itemsTop;
  for (const item of rec.parkingLot || []) {
    if (ly >= itemsTop + itemsH) break;
    const lines = pdfWrap(item.text, false, g.lotSize, lotW);
    const rowH = Math.max(g.lotRow, lines.length * g.lotLH + 4);
    if (item.state === 'complete') {
      // Hatching only. The words are not in the file at all, which is a
      // stronger promise than the screen's "no screenshot recovers it".
      p.q().rect(g.gutter, ly, lotW, rowH).clip()
        .cm(1, 0, 0, 1, g.gutter, ly).scratch(lotW, rowH).Q();
    } else {
      const top = ly + (rowH - lines.length * g.lotLH) / 2;
      p.lines(lines, g.gutter, lotW, top, g.lotSize, g.lotLH, false, 'left');
    }
    ly += rowH;
  }
  p.Q();

  // Notes last: array order is z-order, and DOM order mirrors it.
  for (const note of rec.notes || []) {
    const box = exportNoteBox(note);
    const s = (note.scale || 1) * exportMult(note);   // homothetic (issue #57)
    // transform-origin: top left — translate to the note, then scale in place.
    p.q().cm(s, 0, 0, s, exportX(note), exportY(note));
    p.frame(0, 0, box.w, box.h, g.radius, g.border, PDF_PAPER);
    if (note.state === 'complete') {
      p.q().rrect(0, 0, box.w, box.h, g.radius).clip().scratch(box.w, box.h).Q();
    } else {
      p.lines(box.lines, g.border + g.notePadX, box.content, g.border + g.notePadY,
              g.noteSize, g.noteLH, false, 'left');
    }
    p.Q();
  }

  return p.Q().stream();
}

/* ---- Page 2+: the text ---------------------------------------------------
   The board again, as prose — so the file is searchable and readable at a
   glance. Completed items keep their place in the order but not their words. */
function exportTextPages(rec) {
  const L = PDF_MARGIN, R = A4_W - PDF_MARGIN, W = R - L;
  const BOTTOM = A4_H - PDF_MARGIN;
  const streams = [];
  let p = null, y = 0;

  const openPage = () => {
    p = pdfCanvas();
    p.q().flip(A4_H);
    p.fill(PDF_PAPER).rect(0, 0, A4_W, A4_H).raw('f');   // same paper as page 1
    y = PDF_MARGIN;
  };
  const closePage = () => { if (p) { streams.push(p.Q().stream()); p = null; } };
  const room = (h) => { if (y + h > BOTTOM) { closePage(); openPage(); } };

  const para = (str, size, lh, bold, color, indent) => {
    const x = L + (indent || 0);
    const w = W - (indent || 0);
    for (const line of pdfWrap(str, bold, size, w)) {
      room(lh);
      if (line.length) p.text(line, x, pdfBaseline(y, lh, size), size, bold, color);
      y += lh;
    }
  };
  const heading = (str) => {
    room(30);
    y += 12;
    para(str, 11, 15, true, PDF_INK);
    p.fill(PDF_SHADE).rect(L, y + 1, W, 0.5).raw('f');
    y += 6;
  };

  openPage();
  para(rec.title || COPY.untitled, 18, 24, true, PDF_INK);
  para(formatDate(rec.createdAt), 9, 13, false, PDF_SHADE);

  if (rec.components) { heading('COMPONENTS'); para(rec.components, 10, 14, false, PDF_INK); }
  if (rec.requirements) { heading('REQUIREMENTS'); para(rec.requirements, 10, 14, false, PDF_INK); }

  const bullets = (label, items) => {
    if (!items.length) return;
    heading(label);
    for (const it of items) {
      // A completed item keeps its place in the order but not its words —
      // the same promise the scratch-out makes on page 1.
      const done = it.state === 'complete';
      const color = done ? PDF_SHADE : PDF_INK;
      const lines = pdfWrap(done ? '— completed —' : it.text, false, 10, W - 14);
      room(14);                                  // keep the bullet with its first line
      p.text('•', L, pdfBaseline(y, 14, 10), 10, false, color);
      for (const line of lines) {
        room(14);
        if (line.length) p.text(line, L + 14, pdfBaseline(y, 14, 10), 10, false, color);
        y += 14;
      }
    }
  };
  bullets('NOTES', rec.notes || []);
  bullets('PARKING LOT', rec.parkingLot || []);

  closePage();
  return streams;
}

function buildBoardPdf(rec) {
  return pdfAssemble([exportBoardPage(rec)].concat(exportTextPages(rec)),
                     rec.title || COPY.untitled);
}

/* ---- The menu action ---------------------------------------------------- */

// A filename someone can find later: the board's own words, then the day it
// started. An untitled board has no words, so the date carries it alone.
function pdfFilename(rec) {
  const slug = String(rec.title || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    .replace(/-+$/, '');
  const d = new Date(rec.createdAt || Date.now());
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  return (slug || 'board') + '-' + stamp + '.pdf';
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Long enough for every engine to have started the write before the URL goes.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* Export runs off the board RECORD, not the live DOM: the menu belongs to a
   board card, and the card is usually not the board that happens to be open.

   Which copy of the record, though. renderPane/renderList close over an
   idbGetAll() snapshot taken when the rail was drawn, so right-clicking the
   ACTIVE card after typing would export the board as it was some keystrokes
   ago. `current` is the one that is ahead of storage (saves are debounced by
   SAVE_DEBOUNCE), so it wins for the open board; every other card reads back
   from IndexedDB in case its snapshot has aged. */
async function exportBoardPdf(board) {
  try {
    const src = (current && current.id === board.id)
      ? current : ((await idbGet(board.id)) || board);
    // B8/B31's sweep on a COPY. Records reach the menu straight from
    // idbGetAll(), so they have never been through renderBoard's sanitize, and
    // a whitespace husk would export as an empty framed box. Copying rather
    // than filtering in place matters: `src` may be `current`, and mutating
    // live state from an export is exactly the silent write B21 forbids.
    const keep = (r) => (r.text || '').trim().length > 0;
    const rec = {
      title: src.title, requirements: src.requirements, components: src.components,
      createdAt: src.createdAt || board.createdAt,
      notes: (src.notes || []).filter(keep),
      parkingLot: (src.parkingLot || []).filter(keep),
    };
    pdfLossy = false;
    const bytes = buildBoardPdf(rec);
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), pdfFilename(rec));
    if (pdfLossy) showNotice(COPY.exportLossy, 'export', UNDO_MS);
  } catch (e) {
    showNotice(COPY.exportError, 'export', UNDO_MS);
  }
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
// Order (A1 / UIUX §7): non-destructive first, destructive last, hairline
// between. One call site, so this lights up on both the mobile long-press and
// the desktop right-click.
function openBoardRowMenu(row, board, x, y) {
  buildMenu([
    { label: COPY.export, glyph: GLYPH.export, action: () => exportBoardPdf(board) },
    { sep: true },
    { label: COPY.delete, glyph: GLYPH.delete, danger: true, action: () => deleteBoard(board.id, row) },
  ], x, y);
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
    // Deletion path (b), issue #10: right-click any card → the board menu
    // (Export, then Delete). The one summoning gesture "remove click-and-hold"
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
