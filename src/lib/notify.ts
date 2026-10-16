/** 番茄钟结束时的提示：可配置时长的提示音 + 一条系统通知（若已授权）。 */

/**
 * 播放提示音。
 * @param durationSec 持续秒数，0～10；0 表示不发声。
 * 会按约 0.45s 一轮的双音 motif 循环铺满时长。
 */
export function playChime(durationSec = 1): void {
  const duration = Math.min(10, Math.max(0, durationSec));
  if (duration <= 0) return;

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const start = ctx.currentTime;
    const motifPeriod = 0.45;
    const noteGap = 0.16;
    const noteLen = 0.34;
    const frequencies = [880, 1174.66] as const;

    const rounds = Math.max(1, Math.ceil(duration / motifPeriod));

    for (let round = 0; round < rounds; round++) {
      const roundAt = start + round * motifPeriod;
      if (roundAt - start >= duration) break;

      frequencies.forEach((frequency, index) => {
        const at = roundAt + index * noteGap;
        if (at - start >= duration) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const remain = duration - (at - start);
        const playLen = Math.min(noteLen, remain);

        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.16, at + Math.min(0.02, playLen * 0.3));
        gain.gain.exponentialRampToValueAtTime(0.0001, at + playLen);

        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + playLen + 0.02);
      });
    }

    window.setTimeout(() => void ctx.close(), Math.ceil(duration * 1000) + 400);
  } catch {
    // 浏览器未授权音频或用户尚未交互时静默失败，不该因为提示音打断主流程
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notify(
  title: string,
  body: string,
  sound = true,
  durationSec = 1,
): void {
  if (sound) playChime(durationSec);

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: 'workbench-pomodoro' });
    } catch {
      // 部分浏览器在非安全上下文下会抛错，忽略即可
    }
  }
}
