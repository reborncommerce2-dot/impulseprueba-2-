let nativeBiometric: any = null;

async function loadNative() {
  if (nativeBiometric) return nativeBiometric;
  try { nativeBiometric = await import('@aparajita/capacitor-biometric-auth'); return nativeBiometric; }
  catch { return null; }
}

const KEY = 'impulse.biometric.enabled';
export function biometricEnabled() { return localStorage.getItem(KEY) === '1'; }
export function setBiometricEnabled(v:boolean) { localStorage.setItem(KEY, v ? '1' : '0'); }
export async function isBiometricAvailable(): Promise<boolean> {
  const mod = await loadNative();
  if (!mod?.BiometricAuth) return false;
  try { const r = await mod.BiometricAuth.checkBiometry(); return !!r?.isAvailable; } catch { return false; }
}
export async function authenticateBiometric(): Promise<boolean> {
  const mod = await loadNative();
  if (!mod?.BiometricAuth) return false;
  try { await mod.BiometricAuth.authenticate({ reason: 'Desbloquear Impulse', title: 'Impulse' }); return true; } catch { return false; }
}
