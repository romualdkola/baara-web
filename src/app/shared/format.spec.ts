import { ago, fcfa, initials, rating } from './format';
import { badge } from './labels';

describe('affichage', () => {
  it('écrit les montants en FCFA à la française', () => {
    expect(fcfa(15000).replace(/\s/g, ' ')).toBe('15 000 FCFA');
    expect(fcfa(null)).toBe('—');
  });

  it('écrit les notes avec une virgule', () => {
    expect(rating(4.85)).toBe('4,9');
    expect(rating(5)).toBe('5');
    expect(rating(null)).toBe('—');
  });

  it('dit depuis quand', () => {
    const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
    expect(ago(minutesAgo(0))).toBe('à l’instant');
    expect(ago(minutesAgo(8))).toBe('il y a 8 min');
    expect(ago(minutesAgo(5 * 60))).toBe('il y a 5 h');
    expect(ago(minutesAgo(26 * 60))).toBe('hier');
    expect(ago(minutesAgo(3 * 24 * 60))).toBe('il y a 3 jours');
  });

  it('prend les initiales des deux premiers mots', () => {
    expect(initials('Moussa Diallo Traoré')).toBe('MD');
    expect(initials(null)).toBe('?');
  });

  it('traduit les statuts de l’API', () => {
    expect(badge('provider', 'APPROVED')).toEqual({ label: 'Vérifié', tone: 'green' });
    expect(badge('request', 'OFFERS_RECEIVED').label).toBe('Propositions reçues');
    // Un statut inconnu reste lisible plutôt que de casser l'écran
    expect(badge('mission', 'NOUVEAU')).toEqual({ label: 'NOUVEAU', tone: '' });
  });
});
