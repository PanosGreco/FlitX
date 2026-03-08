

## Plan — Full i18n System with Browser Detection & AI Language Support

### Architecture

**Library**: `react-i18next` + `i18next` + `i18next-browser-languagedetector`

**Language resolution priority** (configured in i18next detector):
1. Profile language (fetched from DB, set programmatically via `i18next.changeLanguage()`)
2. localStorage (`i18nextLng` key)
3. Browser language (via `i18next-browser-languagedetector`)
4. Fallback: `en`

**Fallback protection**: `fallbackLng: 'en'` ensures missing keys in any language file resolve to English, never showing raw keys.

### Database

Add `language` column to `profiles`:
```sql
ALTER TABLE public.profiles ADD COLUMN language text DEFAULT 'en';
```

### File Structure

```text
src/i18n/
  index.ts              ← i18next init + detector config
  locales/
    en/
      common.json       ← nav, buttons, shared
      fleet.json
      finance.json
      home.json
      auth.json
      ai.json           ← AI assistant UI chrome
      profile.json
      tracking.json
      dailyProgram.json
    el/ ...
    it/ ...
    es/ ...
    de/ ...
    fr/ ...
```

### Changes

#### 1. New: `src/i18n/index.ts`
Initialize i18next with `react-i18next` and `i18next-browser-languagedetector`. Configure detection order: `['localStorage', 'navigator']`. Set `fallbackLng: 'en'`. Import all locale JSON files as bundled resources.

#### 2. New: `src/i18n/locales/*/*.json`
Extract all ~200 English keys from the current `translations.en` object in `LanguageContext.tsx` into namespaced JSON files. Extract Greek keys from `translations.el` into `el/*.json`. Create `it/`, `es/`, `de/`, `fr/` JSON files with translated strings for all namespaces.

#### 3. Refactor: `src/contexts/LanguageContext.tsx`
- Remove the ~450-line inline `translations` object
- Simplify to: expose `language`, `setLanguage(lang)`, `isLanguageLoading`
- `setLanguage` calls `i18next.changeLanguage(lang)`, saves to localStorage, and updates `profiles.language` in DB
- On mount: fetch `profiles.language` → if found, call `i18next.changeLanguage(profileLang)` (this overrides detector)
- Language type changes from `"en" | "el"` to `string` supporting `en | el | it | es | de | fr`

#### 4. Refactor: All ~39 component files using `useLanguage()`
- Replace `const { t } = useLanguage()` with `const { t } = useTranslation('namespace')`
- Replace property access `t.someKey` with function call `t('someKey')`
- Components affected: navigation, fleet, finance, home, profile, auth, AI assistant, daily program, tracking, booking dialogs, etc.

#### 5. Update: `src/components/signup/LanguageSwitcher.tsx`
Replace EN/EL toggle with a dropdown showing all 6 languages. On select: call `setLanguage()` from context.

#### 6. Update: Signup country → language mapping
In `Auth.tsx` Step 2 submission, map selected country to language code:
```ts
const COUNTRY_LANGUAGE_MAP = { italy: 'it', spain: 'es', germany: 'de', france: 'fr', greece: 'el' };
```
Save resolved language to profile on signup.

#### 7. Update: `supabase/functions/ai-chat/index.ts`
- Accept `language` parameter from the client request body
- Fetch `profiles.language` as fallback
- Inject into system prompt: `"The user's language is ${lang}. Always respond in ${languageName}."`

#### 8. Update: `src/hooks/useAIChat.ts`
- Pass the current language code in the `sendMessage` fetch body: `language: i18next.language`

#### 9. Register in `src/main.tsx`
Import `src/i18n/index.ts` before `<App />` renders to initialize i18next.

### No changes to
- Auth logic, database schema (beyond adding `language` column), routing, edge function AI data contract

### Implementation Phases

**Phase 1**: Install deps, create `src/i18n/`, extract EN+EL JSONs, refactor `LanguageContext`, add `language` DB column, update `main.tsx`. Migrate a few core components to validate the pattern.

**Phase 2**: Migrate all remaining components from `t.key` to `t('key')`. Create IT/ES/DE/FR JSON files. Update `LanguageSwitcher` to dropdown.

**Phase 3**: Wire country→language in signup. Update AI edge function to accept and use language parameter. Final audit for any hardcoded strings.

