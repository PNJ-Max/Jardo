import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const appFolder = join(__dirname, '..', '..');

function isIgnored(path: string) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--no-index', path], { cwd: appFolder });
    return true;
  } catch {
    return false;
  }
}

// Le dépôt est public, et `git add .` n'avertit de rien : ces fichiers portent des clés ou des mots de passe.
describe('.gitignore du dépôt public', () => {
  it.each([
    'credentials.json',
    'credentials/android/keystore.properties',
    'jardo-release.keystore',
    'jardo-release.jks',
    'google-services.json',
    'GoogleService-Info.plist',
    'play-service-account.json',
    'pc-api-1234.json',
    '.env',
    '.env.local',
    '.env.production',
    'jardo-preview.apk',
    'jardo-production.aab',
  ])('ignore %s', (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it.each(['.env.example', 'app.json', 'eas.json', 'package.json'])('garde %s', (path) => {
    expect(isIgnored(path)).toBe(false);
  });
});
