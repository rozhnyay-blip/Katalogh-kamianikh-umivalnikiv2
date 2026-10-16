import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readInitialLocale, resolveInitialLocale, saveLocalePreference } from '../src/lib/localePreference.ts';

test('Slovak is the default; Czech is detected only as the preferred browser language', () => {
  for (const languages of [[], ['sk-SK'], ['uk-UA'], ['en-US'], ['de-DE'], ['sk-SK', 'cs-CZ'], ['en-US', 'cs-CZ']]) {
    assert.equal(resolveInitialLocale(null, languages), 'sk');
  }
  for (const language of ['cs', 'cs-CZ', 'CS-cz', 'cs_CZ']) {
    assert.equal(resolveInitialLocale(null, [language, 'en']), 'cs');
  }
});

test('every explicit supported choice takes priority over browser language', () => {
  for (const locale of ['sk', 'cs', 'en', 'uk']) {
    assert.equal(resolveInitialLocale(locale, ['cs-CZ']), locale);
    assert.equal(resolveInitialLocale(locale, ['sk-SK']), locale);
  }
  assert.equal(resolveInitialLocale('invalid', ['cs-CZ']), 'cs');
  assert.equal(resolveInitialLocale('invalid', ['uk-UA']), 'sk');
});

test('browser integration remembers manual choices and handles blocked storage', () => {
  const values = new Map();
  globalThis.window = {
    navigator: { languages: ['cs-CZ'], language: 'cs-CZ' },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    assert.equal(readInitialLocale(), 'cs');
    assert.equal(values.size, 0, 'automatic detection must not save an explicit preference');
    saveLocalePreference('uk');
    assert.equal(readInitialLocale(), 'uk');
    window.localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    assert.equal(readInitialLocale(), 'cs');
    assert.doesNotThrow(() => saveLocalePreference('sk'));
    window.navigator.languages = [];
    window.navigator.language = 'sk-SK';
    assert.equal(readInitialLocale(), 'sk');
  } finally {
    delete globalThis.window;
  }
  assert.equal(readInitialLocale(), 'sk');
});
