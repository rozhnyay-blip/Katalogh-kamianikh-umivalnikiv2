import { useState } from 'react';
import { ChevronRight, Instagram, MessageCircle, Phone, X } from 'lucide-react';
import type { SiteContent } from '@workspace/api-client-react';
import { toInternationalPhoneNumber } from '../lib/phone';
import { trackSiteEvent } from '../lib/analytics';

export function ContactDock({ content, analyticsEnabled }: { content: SiteContent; analyticsEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const number = toInternationalPhoneNumber(content.contact.phone);
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
          <a href={phoneHref} role="menuitem" onClick={() => analyticsEnabled && trackSiteEvent('contact_phone_click')}>
            <Phone size={17} />
            <span><strong>{content.contact.phone}</strong><small>Zavolať</small></span>
          </a>
          <a href={viberHref} role="menuitem" onClick={() => analyticsEnabled && trackSiteEvent('contact_viber_click')}>
            <MessageCircle size={17} />
            <span>{content.contact.viberLabel}</span>
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => analyticsEnabled && trackSiteEvent('contact_whatsapp_click')}>
            <MessageCircle size={17} />
            <span>{content.contact.whatsappLabel}</span>
          </a>
          <a href={content.nav.instagramUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => analyticsEnabled && trackSiteEvent('contact_instagram_click')}>
            <Instagram size={17} />
            <span>{content.contact.instagramLabel}</span>
          </a>
        </div>
      )}
    </div>
  );
}