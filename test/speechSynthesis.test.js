const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const javaSource = fs.readFileSync(
  path.join(root, 'src', 'android', 'SpeechSynthesis.java'),
  'utf8'
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

test('uses the dependency-free Node test runner', () => {
  assert.equal(packageJson.scripts.test, 'node --test test/*.test.js');
});

test('keeps each queued utterance callback under its own native id', () => {
  assert.match(javaSource, /ConcurrentHashMap<String, CallbackContext>/);
  assert.match(
    javaSource,
    /utteranceCallbacks\.put\(utteranceId, callbackContext\)/
  );
  assert.match(
    javaSource,
    /utteranceCallbacks\.remove\(utteranceId\)/
  );
  assert.doesNotMatch(
    javaSource,
    /private CallbackContext callbackContext;/
  );
});

test('rejects speech before touching an unready native engine', () => {
  const speakBranch = javaSource.slice(
    javaSource.indexOf('if (action.equals("speak"))'),
    javaSource.indexOf('} else if (action.equals("cancel"))')
  );
  assert.ok(speakBranch.indexOf('if (!isReady())') >= 0);
  assert.ok(
    speakBranch.indexOf('if (!isReady())') <
      speakBranch.indexOf('mTts.setLanguage')
  );
});

test('settles queued callbacks when speech is cancelled or destroyed', () => {
  assert.match(
    javaSource,
    /action\.equals\("cancel"\)[\s\S]*?mTts\.stop\(\);[\s\S]*?failPendingUtterances\(\)/
  );
  assert.match(
    javaSource,
    /public void onDestroy\(\)[\s\S]*?failPendingUtterances\(\)/
  );
});
