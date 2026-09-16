import { useState } from 'react';
import { ChevronRight, Instagram, MessageCircle, Phone, X } from 'lucide-react';
import type { SiteContent } from '@workspace/api-client-react';

function internationalNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `421${digits.slice(1)}`;
  return digits;
}

export function ContactDock({ content }: { content: SiteContent }) {
  const [open, setOpen] = useState(false);
  const number = internationalNumber(content.contact.phone);
  const phoneHref = `tel:${content.contact.phone.replace(/[^\d+]/g, '')}`;
  const viberHref = `viber://chat?number=%2B${number}`;
  const whatsappHref = `https://wa.me/${number}`;

  return (
    <div className={`contact-dock${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="contact-dock-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Zavrieť kontakty' : content.contact.label}
      >
        {open ? <X size={20} /> : <Phone size={20} />}
        <span>{open ? 'Zavrieť' : 'Kontakt'}</span>
        {!open && <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="contact-dock-menu" role="menu" aria-label={content.contact.label}>
          <a href={phoneHref} role="menuitem">
            <Phone size={17} />
            <span><strong>{content.contact.phone}</strong><small>Zavolať</small></span>
          </a>
          <a href={viberHref} role="menuitem">
            <MessageCircle size={17} />
            <span>{content.contact.viberLabel}</span>
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="menuitem">
            <MessageCircle size={17} />
            <span>{content.contact.whatsappLabel}</span>
          </a>
          <a href={content.nav.instagramUrl} target="_blank" rel="noopener noreferrer" role="menuitem">
            <Instagram size={17} />
            <span>{content.contact.instagramLabel}</span>
          </a>
        </div>
      )}
    </div>
  );
}