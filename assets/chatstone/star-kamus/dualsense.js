// PS5 DualSense extras via WebHID (Chrome/Edge, USB recommended).
// Standard rumble already works through the Gamepad API; this adds adaptive
// trigger effects on R2 and direct haptic control. Report layout follows the
// community-documented USB output report 0x02 — if Sony firmware ever shifts
// it, effects fail silently and the game plays on unaffected.
export class DualSense {
  constructor() {
    this.dev = null;
    this.state = { rumbleL: 0, rumbleR: 0, r2: [0x05, 0, 0, 0] };
    this._rt = null;
  }

  get connected() {
    return !!(this.dev && this.dev.opened);
  }

  async connect() {
    if (!navigator.hid) throw new Error('WebHID unavailable in this browser');
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: 0x054c, productId: 0x0ce6 }], // Sony DualSense
    });
    if (!devices.length) throw new Error('no controller selected');
    this.dev = devices[0];
    if (!this.dev.opened) await this.dev.open();
    this.setTrigger('fire');
  }

  async _send() {
    if (!this.connected) return;
    const d = new Uint8Array(47);
    d[0] = 0x0f;                 // enable rumble + R2/L2 trigger effect blocks
    d[1] = 0x00;
    d[2] = this.state.rumbleR;   // right (weak) motor
    d[3] = this.state.rumbleL;   // left (strong) motor
    const t = this.state.r2;     // R2 adaptive trigger block
    d[10] = t[0]; d[11] = t[1]; d[12] = t[2]; d[13] = t[3];
    d[21] = 0x05;                // L2: effect off
    try { await this.dev.sendReport(0x02, d); } catch (e) { /* firmware said no */ }
  }

  rumble(strong, weak, ms) {
    if (!this.connected) return;
    this.state.rumbleL = Math.min(255, Math.round(strong * 255));
    this.state.rumbleR = Math.min(255, Math.round(weak * 255));
    this._send();
    clearTimeout(this._rt);
    this._rt = setTimeout(() => {
      this.state.rumbleL = 0;
      this.state.rumbleR = 0;
      this._send();
    }, ms);
  }

  // 'fire'   — weapon-style click partway down the pull (the spread gate)
  // 'heat'   — continuous resistance that stiffens with the heat fraction
  // 'plasma' — heavy continuous resistance while beams are armed
  // 'loose'  — trigger goes dead: the gun has overheated, let go
  setTrigger(mode, frac) {
    let next;
    if (mode === 'fire') next = [0x02, 0x40, 0xa0, 0xff];
    else if (mode === 'heat') {
      // quantize to coarse steps so the resistance climbs in discrete notches
      // (also keeps HID writes rare — setTrigger dedupes identical states)
      const step = Math.round(Math.min(1, Math.max(0, frac || 0)) * 10);
      next = [0x01, 0x28, 0x40 + step * 19, 0x00];
    } else if (mode === 'plasma') next = [0x01, 0x20, 0xff, 0x00];
    else next = [0x05, 0x00, 0x00, 0x00]; // 'loose' / off
    // don't spam HID writes with identical states
    const sig = next.join(',');
    if (sig === this._trigSig) return;
    this._trigSig = sig;
    this.state.r2 = next;
    this._send();
  }
}
