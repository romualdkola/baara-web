import { Pipe, PipeTransform } from '@angular/core';

const amount = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const dayTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** 15000 → « 15 000 FCFA » ; rien → « — » */
export function fcfa(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${amount.format(value)} FCFA`;
}

/** Note moyenne sur 5, à la française : 4.85 → « 4,9 » */
export function rating(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

/** Temps écoulé, en français : « il y a 5 min », « il y a 2 jours ». */
export function ago(value: string | null | undefined): string {
  if (!value) return '—';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}

export function initials(name: string | null | undefined): string {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return fcfa(value);
  }
}

@Pipe({ name: 'rating' })
export class RatingPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return rating(value);
  }
}

@Pipe({ name: 'ago' })
export class AgoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return ago(value);
  }
}

@Pipe({ name: 'dayTime' })
export class DayTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? dayTime.format(new Date(value)) : '—';
  }
}

@Pipe({ name: 'day' })
export class DayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? day.format(new Date(value)) : '—';
  }
}

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return initials(value);
  }
}
