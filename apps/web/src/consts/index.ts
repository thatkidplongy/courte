/**
 * Presentation-only constants. Anything that crosses the wire lives in @courte/contract
 * instead, so the two services cannot disagree about it.
 *
 * Split by what makes each group change: labels move when the domain gains a value, search
 * moves when the marketplace gains a filter, and the rest barely move at all. Callers import
 * '@/consts' and need not know which file an entry sits in.
 */
export * from './api';
export * from './labels';
export * from './map';
export * from './search';
export * from './site';
