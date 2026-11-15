/**
 * Comprehensive Translation & Parity Verification Script
 * Validates:
 * 1. EN vs AR key parity in TRANSLATIONS (src/constants/translations.js)
 * 2. 0 missing or empty Arabic strings across all 12 primary story spacecrafts in CRAFT_STORIES
 * 3. 0 missing or empty Arabic strings in CRAFT_SOURCES
 * 4. 0 missing or empty Arabic strings in STORY_UI_COPY
 * 5. Complete absence of French ('fr') and Spanish ('es')
 */

const fs = require('fs');

async function runVerification() {
  console.log('====================================================');
  console.log('   ABANDONED BUT NOT FORGOTTEN — TRANSLATION AUDIT  ');
  console.log('====================================================\n');

  let failureCount = 0;

  // 1. Check TRANSLATIONS
  const translationsModule = await import('../src/constants/translations.js');
  const TRANSLATIONS = translationsModule.TRANSLATIONS;

  const languages = Object.keys(TRANSLATIONS);
  console.log(`[1] Registered translation languages: ${languages.join(', ')}`);
  if (languages.includes('fr') || languages.includes('es')) {
    console.error('❌ FAIL: French or Spanish found in TRANSLATIONS!');
    failureCount++;
  } else {
    console.log('✓ PASS: Only English and Arabic present in TRANSLATIONS.');
  }

  const en = TRANSLATIONS.en;
  const ar = TRANSLATIONS.ar;

  function deepDiff(obj1, obj2, path = '') {
    const missing = [];
    for (const key of Object.keys(obj1)) {
      const curPath = path ? `${path}.${key}` : key;
      if (!(key in obj2) || obj2[key] === undefined || obj2[key] === null || obj2[key] === '') {
        missing.push(curPath);
      } else if (typeof obj1[key] === 'object' && !Array.isArray(obj1[key])) {
        missing.push(...deepDiff(obj1[key], obj2[key], curPath));
      }
    }
    return missing;
  }

  const missingKeys = deepDiff(en, ar);
  if (missingKeys.length > 0) {
    console.error(`❌ FAIL: Missing or empty keys in Arabic TRANSLATIONS (${missingKeys.length}):`);
    missingKeys.forEach((k) => console.error(`   - ${k}`));
    failureCount += missingKeys.length;
  } else {
    console.log('✓ PASS: 100% key and content parity between EN and AR in TRANSLATIONS.');
  }

  // 2. Check CRAFT_STORIES & CRAFT_SOURCES
  const craftStoriesContent = fs.readFileSync('src/data/craftStories.js', 'utf8');
  const cleanCode = craftStoriesContent
    .replace(/import\s+[\s\S]*?;/g, '')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+default\s+/g, 'const def = ');

  const context = {
    readStoredSettings: () => ({ language: 'en' }),
    useState: () => {},
    useEffect: () => {},
  };

  const fn = new Function('ctx', `
    const { readStoredSettings, useState, useEffect } = ctx;
    ${cleanCode}
    return { CRAFT_STORIES, CRAFT_SOURCES, STORY_UI_COPY };
  `);

  const { CRAFT_STORIES, CRAFT_SOURCES, STORY_UI_COPY } = fn(context);

  // Check CRAFT_SOURCES
  console.log(`\n[2] Checking CRAFT_SOURCES (${CRAFT_SOURCES.length} references)...`);
  let sourcesMissing = 0;
  for (const src of CRAFT_SOURCES) {
    if (!src.label || !src.label.ar || src.label.ar.trim() === '') {
      console.error(`   - Source [${src.id}] missing Arabic label!`);
      sourcesMissing++;
    }
  }
  if (sourcesMissing > 0) {
    console.error(`❌ FAIL: ${sourcesMissing} sources missing Arabic labels.`);
    failureCount += sourcesMissing;
  } else {
    console.log('✓ PASS: All CRAFT_SOURCES have complete Arabic titles.');
  }

  // Check 12 primary crafts
  const targetCrafts = [
    'lunar-rover',
    'apollo-lunar-module',
    'lro-orbiter',
    'ladee-orbiter',
    'mer-opportunity',
    'ingenuity-helicopter',
    'viking-lander',
    'insight-lander',
    'mgs-orbiter',
    'odyssey-orbiter',
    'mro-orbiter',
    'maven-orbiter'
  ];

  console.log(`\n[3] Auditing 12 Primary Story Craft Dossiers for Arabic completeness...`);
  let craftFieldsMissing = 0;

  for (const id of targetCrafts) {
    const craft = CRAFT_STORIES[id];
    if (!craft) {
      console.error(`❌ FAIL: Missing spacecraft in CRAFT_STORIES: ${id}`);
      failureCount++;
      continue;
    }

    const checkL = (val, path) => {
      if (!val) return;
      if (typeof val === 'object' && 'en' in val && 'ar' in val) {
        if (!val.ar || val.ar.trim() === '') {
          console.error(`   - [${id}] Missing AR at ${path}: "${val.en.slice(0, 45)}..."`);
          craftFieldsMissing++;
        }
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => checkL(item, `${path}[${idx}]`));
      } else if (typeof val === 'object') {
        for (const k of Object.keys(val)) {
          checkL(val[k], `${path}.${k}`);
        }
      }
    };

    checkL(craft.name, 'name');
    checkL(craft.operator, 'operator');
    checkL(craft.launch, 'launch');
    checkL(craft.landing, 'landing');
    checkL(craft.statusNote, 'statusNote');
    checkL(craft.story, 'story');
    checkL(craft.quiz, 'quiz');
    checkL(craft.visitDecision, 'visitDecision');
  }

  if (craftFieldsMissing > 0) {
    console.error(`❌ FAIL: ${craftFieldsMissing} craft fields missing Arabic translations.`);
    failureCount += craftFieldsMissing;
  } else {
    console.log('✓ PASS: All 12 primary story craft dossiers have 100% Arabic coverage (INFO, TASK, QUIZ, DECISION).');
  }

  // Check STORY_UI_COPY
  console.log(`\n[4] Auditing STORY_UI_COPY...`);
  const uiEn = STORY_UI_COPY.en;
  const uiAr = STORY_UI_COPY.ar;
  const missingUiKeys = deepDiff(uiEn, uiAr);
  if (missingUiKeys.length > 0) {
    console.error(`❌ FAIL: Missing or empty keys in Arabic STORY_UI_COPY (${missingUiKeys.length}):`);
    missingUiKeys.forEach((k) => console.error(`   - ${k}`));
    failureCount += missingUiKeys.length;
  } else {
    console.log('✓ PASS: 100% parity in STORY_UI_COPY.');
  }

  console.log('\n----------------------------------------------------');
  if (failureCount === 0) {
    console.log('🎉 AUDIT COMPLETE: ALL TRANSLATION TESTS PASSED WITH 0 ERRORS!');
    console.log('----------------------------------------------------');
    process.exit(0);
  } else {
    console.error(`⚠️ AUDIT FAILED WITH ${failureCount} TOTAL ISSUES.`);
    console.log('----------------------------------------------------');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
