import { useEffect, useRef, useState } from 'react';
import { Pencil, RotateCcw, X } from 'lucide-react';
import type { SiteContent } from '@workspace/api-client-react';
import { useFocusScope } from '../hooks/useFocusScope';

type TextOverrides = SiteContent['textOverrides'];
type TextOverride = TextOverrides[string];

type TextTarget = {
  key: string;
  source: string;
  value: string;
  x: number;
  y: number;
};

type SiteTextEditorOverlayProps = {
  enabled: boolean;
  overrides: TextOverrides;
  isSaving: boolean;
  onSave: (key: string, source: string, text: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
};

type PointDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function isEditableTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !node.data.trim()) return false;
  return !parent.closest(
    'script, style, noscript, textarea, input, select, option, [contenteditable="true"], [data-site-text-editor]',
  );
}

function getTextNodeAtPoint(x: number, y: number): Text | null {
  const hit = document.elementFromPoint(x, y);
  if (!hit || hit.closest('[data-site-text-editor]')) return null;

  const pointDocument = document as PointDocument;
  const position = pointDocument.caretPositionFromPoint?.(x, y);
  const rangeNode = position?.offsetNode;
  const legacyNode = pointDocument.caretRangeFromPoint?.(x, y)?.startContainer;
  const caretNode = rangeNode?.nodeType === Node.TEXT_NODE
    ? rangeNode as Text
    : legacyNode?.nodeType === Node.TEXT_NODE
      ? legacyNode as Text
      : null;
  if (caretNode && isEditableTextNode(caretNode)) return caretNode;

  const walker = document.createTreeWalker(hit, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (isEditableTextNode(textNode)) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      if (Array.from(range.getClientRects()).some((rect) =>
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      )) {
        return textNode;
      }
    }
    node = walker.nextNode();
  }
  return null;
}

function getTextNodeKey(node: Text): string {
  const path: string[] = [];
  let element = node.parentElement;

  while (element && element !== document.body) {
    const stableId = element.id || element.getAttribute('data-site-text-key');
    if (stableId) {
      path.unshift(`#${stableId}`);
      break;
    }

    const tag = element.tagName.toLowerCase();
    const siblings = element.parentElement
      ? Array.from(element.parentElement.children).filter((sibling) => sibling.tagName === element?.tagName)
      : [element];
    const position = siblings.indexOf(element) + 1;
    const classes = Array.from(element.classList).sort().join('.');
    path.unshift(`${tag}${classes ? `.${classes}` : ''}[${position}]`);
    element = element.parentElement;
  }

  const textSiblings = node.parentNode
    ? Array.from(node.parentNode.childNodes).filter((sibling) => sibling.nodeType === Node.TEXT_NODE)
    : [node];
  return `${path.join('/')}/text[${textSiblings.indexOf(node)}]`;
}

function applyTextOverrides(
  overrides: TextOverrides,
  previousOverrides: TextOverrides,
) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    if (isEditableTextNode(textNode)) {
      const key = getTextNodeKey(textNode);
      const override = overrides[key];
      const previousOverride = previousOverrides[key];

      if (override && textNode.data === override.source) {
        textNode.data = override.text;
      } else if (!override && previousOverride && textNode.data === previousOverride.text) {
        textNode.data = previousOverride.source;
      }
    }
    node = walker.nextNode();
  }
}

export function SiteTextEditorOverlay({
  enabled,
  overrides,
  isSaving,
  onSave,
  onReset,
}: SiteTextEditorOverlayProps) {
  const [hovered, setHovered] = useState<TextTarget | null>(null);
  const [editing, setEditing] = useState<TextTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const previousOverridesRef = useRef(overrides);

  const closeEditor = () => {
    if (!isSaving) {
      setEditing(null);
      setError('');
    }
  };
  useFocusScope(dialogRef, closeEditor, isSaving, Boolean(editing));

  useEffect(() => {
    const previousOverrides = previousOverridesRef.current;
    const apply = () => applyTextOverrides(overrides, previousOverrides);

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    previousOverridesRef.current = overrides;

    return () => observer.disconnect();
  }, [overrides]);

  useEffect(() => {
    if (!enabled) {
      setHovered(null);
      return undefined;
    }

    let timer: number | undefined;
    let candidateKey: string | null = null;
    let lastPoint = { x: 0, y: 0 };

    const clearCandidate = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      candidateKey = null;
      setHovered(null);
    };

    const handlePointer = (event: PointerEvent) => {
      lastPoint = { x: event.clientX, y: event.clientY };
      const hit = document.elementFromPoint(lastPoint.x, lastPoint.y);
      if (hit?.closest('[data-site-text-editor]')) return;

      const textNode = getTextNodeAtPoint(lastPoint.x, lastPoint.y);
      if (!textNode) {
        clearCandidate();
        return;
      }

      const key = getTextNodeKey(textNode);
      if (key === candidateKey) return;

      if (timer !== undefined) window.clearTimeout(timer);
      candidateKey = key;
      setHovered(null);
      timer = window.setTimeout(() => {
        const currentNode = getTextNodeAtPoint(lastPoint.x, lastPoint.y);
        if (!currentNode || getTextNodeKey(currentNode) !== candidateKey) return;

        const value = currentNode.data;
        const existing = overrides[key];
        const rect = currentNode.parentElement?.getBoundingClientRect();
        const x = Math.min(Math.max(8, lastPoint.x - 10), window.innerWidth - 150);
        const y = rect && rect.bottom + 48 > window.innerHeight
          ? Math.max(8, rect.top - 50)
          : Math.min(window.innerHeight - 48, (rect?.bottom ?? lastPoint.y) + 8);
        setHovered({
          key,
          source: existing?.source ?? value,
          value,
          x,
          y,
        });
      }, 3000);
    };

    const handleWindowBlur = () => clearCandidate();
    document.addEventListener('pointerover', handlePointer, true);
    document.addEventListener('pointermove', handlePointer, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('pointerover', handlePointer, true);
      document.removeEventListener('pointermove', handlePointer, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, overrides]);

  const beginEditing = () => {
    if (!hovered) return;
    setEditing(hovered);
    setDraft(hovered.value);
    setError('');
    setHovered(null);
  };

  const save = async () => {
    if (!editing || isSaving) return;
    setError('');
    try {
      await onSave(editing.key, editing.source, draft);
      setEditing(null);
    } catch {
      setError('Text sa nepodarilo uložiť. Skúste to znova.');
    }
  };

  const reset = async () => {
    if (!editing || isSaving) return;
    setError('');
    try {
      await onReset(editing.key);
      setEditing(null);
    } catch {
      setError('Pôvodný text sa nepodarilo obnoviť. Skúste to znova.');
    }
  };

  const activeOverride: TextOverride | undefined = editing ? overrides[editing.key] : undefined;

  return (
    <div className="site-text-editor-root" data-site-text-editor>
      {hovered && !editing && (
        <button
          className="site-text-edit-trigger"
          type="button"
          style={{ left: hovered.x, top: hovered.y }}
          onClick={beginEditing}
          aria-label="Upraviť tento text"
        >
          <Pencil size={14} aria-hidden="true" />
          Upraviť text
        </button>
      )}

      {editing && (
        <div className="modal-backdrop site-text-edit-backdrop" data-site-text-editor>
          <section
            ref={dialogRef}
            className="order-modal site-text-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-text-edit-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeEditor}
              disabled={isSaving}
              aria-label="Zavrieť úpravu textu"
            >
              <X size={19} />
            </button>
            <span className="eyebrow">Úprava stránky</span>
            <h2 className="display modal-title" id="site-text-edit-title">Upraviť text</h2>
            <p className="site-text-edit-help">Zmena sa uloží a zobrazí návštevníkom stránky.</p>
            <label className="site-text-edit-label" htmlFor="site-text-edit-input">Text na stránke</label>
            <textarea
              id="site-text-edit-input"
              className="site-text-edit-input"
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
            />
            {error && <p className="site-text-edit-error" role="alert">{error}</p>}
            <div className="site-text-edit-actions">
              {activeOverride && (
                <button className="button-quiet" type="button" onClick={reset} disabled={isSaving}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Obnoviť pôvodný text
                </button>
              )}
              <button className="button-quiet" type="button" onClick={closeEditor} disabled={isSaving}>
                Zrušiť
              </button>
              <button className="button-primary" type="button" onClick={save} disabled={isSaving}>
                {isSaving ? 'Ukladám…' : 'Uložiť'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}