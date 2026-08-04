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
const LOGICAL_W = 900, LOGICAL_H = 1000;
const MAX_NOTE_W = 405;              // 45% of board width (PRD §6.2)
const MIN_SCALE = 0.5, MAX_SCALE = 2.0;
const MOVE_THRESHOLD = 10;           // px before a drag begins / long-press cancels
const LONGPRESS_MS = 500;
const HIT_FLOOR = 44;                // px physical (PRD §5.3, UIUX §6)
const SAVE_DEBOUNCE = 300;
const UNDO_MS = 5000;
const LEAVE_MS = 120;

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
  renderScale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  offX = (vw - LOGICAL_W * renderScale) / 2;
  offY = (vh - LOGICAL_H * renderScale) / 2;
  el.board.style.setProperty('--rs', renderScale);
  el.board.style.setProperty('--offx', offX + 'px');
  el.board.style.setProperty('--offy', offY + 'px');
  // Recompute decoupled hit areas for every note (physical size changed).
  noteEls.forEach((node, id) => {
    const note = current && current.notes.find(n => n.id === id);
    if (note) setHitInset(node, note);
  });
  // Toast sits 12px below the page's bottom edge, over letterbox where any exists.
  const bottomGap = Math.max(12, offY + 12);
  document.documentElement.style.setProperty('--toast-bottom', bottomGap + 'px');
}

/* --- 5. Coordinate + caret helpers --------------------------------------- */
const toLogical = (clientX, clientY) => ({
  x: (clientX - offX) / renderScale,
  y: (clientY - offY) / renderScale,
});

function setHitInset(node, note) {
  const w = node.offsetWidth, h = node.offsetHeight;   // logical (transform-independent)
  const k = note.scale * renderScale;
  const physW = w * k, physH = h * k;
  const inset = Math.max(0, (HIT_FLOOR - physW) / 2, (HIT_FLOOR - physH) / 2) / (k || 1);
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
function renderBoard() {
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
  node.style.left = note.x + 'px';
  node.style.top = note.y + 'px';
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

function classifyTarget(target) {
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
  if (isEditing(e.target)) return;                 // let text editing receive taps/caret
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
  try { el.board.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }

  g.longPressTimer = setTimeout(() => {
    if (!g || g.mode !== 'pending' || g.moved) return;
    g.longPressed = true;
    if (navigator.vibrate) navigator.vibrate(10);
    openMenuFor(target, g.startX, g.startY);
  }, LONGPRESS_MS);
}

el.board.addEventListener('pointermove', onPointerMove);
function onPointerMove(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;

  if (g && g.mode === 'pinch') { updatePinch(); return; }
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
  else if (g.mode === 'pending' && !g.longPressed && !g.moved) { handleTap(g.target, e); }
  g = null;
}

/* --- 8. Editing, drag, pinch, z-order ------------------------------------ */
function isEditing(node) {
  return !!(node.closest && node.closest('[contenteditable]'));
}

function handleTap(target, e) {
  switch (target.type) {
    case 'canvas': createNote(e.clientX, e.clientY); break;
    case 'lot':    createLotItem(); break;
    case 'note': {
      surfaceNote(target.node);
      const note = current.notes.find(n => n.id === target.node.dataset.id);
      if (note.state === 'active') editNoteText(target.node, e.clientX, e.clientY);
      break;
    }
    case 'lot-item': {
      const item = current.parkingLot.find(i => i.id === target.node.dataset.id);
      if (item.state === 'active') editText(target.node.querySelector('.lot-text'), e.clientX, e.clientY);
      break;
    }
    case 'anchor': editText(target.node, e.clientX, e.clientY); break;
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

/* Create a note in edit mode at the tapped point (PRD §6.2). */
function createNote(clientX, clientY) {
  const pt = toLogical(clientX, clientY);
  const note = { id: uuid(), text: '', x: clamp(pt.x, 0, LOGICAL_W - 4),
                 y: clamp(pt.y, 0, LOGICAL_H - 4), scale: 1.0, state: 'active' };
  current.notes.push(note);                          // top of z-order
  const node = makeNoteEl(note);
  el.board.appendChild(node);
  const text = node.querySelector('.note-text');
  enableEditing(text); text.focus(); caretToEnd(text);
}

function createLotItem() {
  const item = { id: uuid(), text: '', state: 'active' };
  current.parkingLot.push(item);
  const node = makeLotEl(item);
  el.lotItems.appendChild(node);
  const text = node.querySelector('.lot-text');
  enableEditing(text); text.focus(); caretToEnd(text);
}

/* Commit-on-blur for every editable region; empty new notes/items are discarded. */
document.addEventListener('focusout', (e) => {
  const t = e.target;
  if (!t.hasAttribute || !t.hasAttribute('contenteditable')) return;
  disableEditing(t);
  if (t.classList.contains('note-text')) commitNote(t.closest('.note'));
  else if (t.classList.contains('lot-text')) commitLot(t.closest('.lot-item'));
  else if (t.classList.contains('anchor')) commitAnchor(t);
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
    if (note && note.state === 'active') editText(t.querySelector('.note-text'));
  } else if (t.classList.contains('lot-item')) {
    const item = current && current.parkingLot.find(i => i.id === t.dataset.id);
    if (item && item.state === 'active') editText(t.querySelector('.lot-text'));
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
  const i = current.notes.indexOf(note);
  if (i >= 0) current.notes.splice(i, 1);
  node.remove(); noteEls.delete(note.id);
  saveNow();
}
function commitLot(node) {
  const item = current.parkingLot.find(i => i.id === node.dataset.id);
  if (!item) return;
  item.text = node.querySelector('.lot-text').textContent;
  if (item.text.trim().length === 0) {
    const i = current.parkingLot.indexOf(item);
    if (i >= 0) current.parkingLot.splice(i, 1);
    node.remove(); lotEls.delete(item.id);
  }
  saveNow();
}
function commitAnchor(node) {
  current[node.dataset.anchor] = node.textContent;
  node.classList.toggle('filled', !!node.textContent.length);
  saveNow();
}

/* Drag (PRD §6.3): free overlap, no snap, clamp to page bounds only. */
function startDrag() {
  g.mode = 'drag';
  g.target.node.classList.add('pressed');
  surfaceNote(g.target.node);
  const note = g.note;
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
}

/* Pinch (PRD §6.3 / UIUX §5): transform scale only, clamp 0.5–2.0,
   transform-origin top-left so stored x,y stays truthful and the note
   doesn't drift; re-clamp position if the grown footprint exits the page. */
function startPinch() {
  clearTimeout(g.longPressTimer);
  if (g.mode === 'drag') g.target.node.classList.remove('pressed');
  const pts = [...pointers.values()];
  g.mode = 'pinch';
  g.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  g.startScale = g.note.scale;
  g.target.node.classList.add('pressed');
}
function updatePinch() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return;
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  const scale = clamp(g.startScale * (dist / g.startDist), MIN_SCALE, MAX_SCALE);
  g.note.scale = scale;
  const node = g.target.node;
  node.style.transform = 'scale(' + scale + ')';
  const footW = node.offsetWidth * scale, footH = node.offsetHeight * scale;
  g.note.x = clamp(g.note.x, 0, Math.max(0, LOGICAL_W - footW));
  g.note.y = clamp(g.note.y, 0, Math.max(0, LOGICAL_H - footH));
  node.style.left = g.note.x + 'px';
  node.style.top = g.note.y + 'px';
  setHitInset(node, g.note);
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
function showUndo(undoFn) {
  clearTimeout(undoTimer);
  el.toast.dataset.mode = 'undo';                      // capture priority over save-error
  el.toast.textContent = '';
  const msg = document.createElement('span'); msg.className = 'msg'; msg.textContent = COPY.deleted;
  const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = COPY.undo;
  btn.addEventListener('click', () => { clearTimeout(undoTimer); hideToast(); undoFn(); });
  el.toast.appendChild(msg); el.toast.appendChild(btn);
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('show'));
  undoTimer = setTimeout(hideToast, UNDO_MS);          // timeout finalizes the delete
}
function hideToast() {
  delete el.toast.dataset.mode;
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

function openMenuFor(target, clientX, clientY) {
  let items = [];
  if (target.type === 'anchor') {
    items = [{ label: COPY.boards, glyph: GLYPH.boards, action: goToList }];
  } else {
    const node = target.node;
    const isNote = target.type === 'note';
    const rec = isNote ? current.notes.find(n => n.id === node.dataset.id)
                       : current.parkingLot.find(i => i.id === node.dataset.id);
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
    b.addEventListener('click', () => { closeMenu(); it.action(); });
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
  menuOutsideHandler = (ev) => { if (!el.menu.contains(ev.target)) closeMenu(); };
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
}

/* --- 11. Board list + routing -------------------------------------------- */
let listOpen = false;

async function renderList() {
  const all = await idbGetAll();
  all.sort((a, b) => b.createdAt - a.createdAt);       // creation order, newest first, stable
  el.listRows.textContent = '';
  for (const b of all) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'board-row'; row.setAttribute('role', 'listitem');
    row.dataset.id = b.id;
    const title = document.createElement('span'); title.className = 'row-title';
    if (b.title && b.title.trim().length) { title.textContent = b.title; }
    else { title.textContent = COPY.untitled; title.classList.add('untitled'); }
    row.appendChild(title);
    if (!(b.title && b.title.trim().length)) {
      const date = document.createElement('span'); date.className = 'row-date';
      date.textContent = formatDate(b.createdAt);
      row.appendChild(date);
    }
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
    t = setTimeout(() => { longed = true; if (navigator.vibrate) navigator.vibrate(10); openBoardRowMenu(row, board, e.clientX, e.clientY); }, LONGPRESS_MS);
  });
  row.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) >= MOVE_THRESHOLD) { moved = true; clearTimeout(t); }
  });
  row.addEventListener('pointerup', () => { clearTimeout(t); if (!longed && !moved) openBoardById(board.id); });
  row.addEventListener('pointercancel', () => clearTimeout(t));
}
function openBoardRowMenu(row, board, x, y) {
  buildMenu([{ sep: false, label: COPY.delete, glyph: GLYPH.delete, danger: true, action: () => deleteBoard(board.id, row) }], x, y);
}

async function deleteBoard(id, row) {
  const snapshot = await idbGet(id);
  await idbDelete(id);
  if (row) leave(row, () => row.remove());
  if (current && current.id === id) current = null;    // guard invalid current on return
  showUndo(async () => { await idbPut(snapshot); renderList(); });
}

async function openBoardById(id) {
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
  const board = newBoardRecord();
  await idbPut(board);
  current = board;
  history.back();                                       // page-turn back to the board
}

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

el.newBoard.addEventListener('click', newBoard);

/* --- 12. Boot + service worker ------------------------------------------- */
window.addEventListener('resize', applyLayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', applyLayout);

async function boot() {
  const all = await idbGetAll();
  let board;
  if (!all.length) { board = newBoardRecord(); await idbPut(board); }
  else { board = all.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)); }  // launch → most recent
  openBoardObj(board);
}
boot();

// Register the service worker at top level (not inside async boot, whose IDB
// awaits can resolve after 'load' has already fired — the listener would miss).
if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') navigator.serviceWorker.register('sw.js').catch(() => {});
  else window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
