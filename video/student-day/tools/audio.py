#!/usr/bin/env python3
"""
Soundtrack for "יום בחיים של נער בן 15" (video/student-day): music + sound effects.

    python3 tools/audio.py [cues.json] [out.wav] [--report] [--stems]

Reads the cue list written by `node tools/render.mjs cues` (default: out/cues.json) and
writes out/audio.wav -- 48 kHz, 16-bit, stereo, exactly `total` seconds long.
  --report   print per-cue levels and a per-second loudness timeline
  --stems    also write out/audio-music.wav and out/audio-sfx.wav (post-master, for checking)

Everything is synthesized procedurally with numpy alone (no samples, nothing downloaded):
  * 36 sound-effect generators (table SFX below) placed at the cues' global times, panned,
    and run through a small synthetic acoustic space chosen from the scene (bedroom,
    bathroom tiles, outdoors, ...).  Cue fields: t, type, dur, vol (0..1); optional rate
    (footsteps/run_steps/brush), pan (-1..1), dir (whoosh/car_pass direction, -1/1).
    Timing: every sound starts at t, except door_close whose slam lands exactly on t;
    car_pass{dur=2.8} is closest (loudest, pitch drop) at t + dur/2.  Unknown types are
    skipped with a warning.
  * soft typewriter clicks for every scene's on-screen time stamp (added automatically,
    in sync with V.drawStamp: one character per 0.1 s from scene start + 0.25 s).
  * an original score: a warm D-major "day" theme from 3.0 s to the start of 16-friends
    (tempo map anchored to the scene cuts: intro / verse / time-lapse build / chorus /
    lunch break-down / training / calm homework), a lo-fi B-minor "night" theme for
    16-friends and a music-box lullaby in 17-sleep that fades out ~1.5 s before the end.
  * music ducked under loud cues, then master: rumble/DC high-pass, loudness normalisation
    to about -16 LUFS (BS.1770-style gated measurement), look-ahead limiter (<= -1 dBTP).
"""

import json
import math
import os
import sys
import time
import wave
import zlib

import numpy as np

SR = 48000
TAU = 2.0 * math.pi
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TARGET_LUFS = -16.0
MUSIC_RMS_DB = -20.0     # music stem level before the master stage (per-channel RMS)
CEILING_DB = -1.0        # true-peak ceiling

# =====================================================================================
# DSP basics
# =====================================================================================


def N(sec):
    """Length in samples (>= 1)."""
    return max(1, int(round(sec * SR)))


def I(sec):
    """Sample index."""
    return int(round(sec * SR))


def tv(n):
    return np.arange(n) / SR


def db(x):
    return 10.0 ** (x / 20.0)


def lin2db(x):
    return 20.0 * math.log10(max(float(x), 1e-12))


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def seeded(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def peak(x):
    return float(np.max(np.abs(x))) if x.size else 0.0


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)))) if x.size else 0.0


def nrm(x):
    r = rms(x)
    return x / r if r > 0 else x


def white(n, r):
    return r.standard_normal(n)


def fade(x, fin=0.003, fout=0.005):
    """Raised-cosine fade in/out (in place, last axis = time)."""
    n = x.shape[-1]
    a = min(n // 2, int(fin * SR))
    b = min(n // 2, int(fout * SR))
    if a > 0:
        x[..., :a] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    if b > 0:
        x[..., n - b:] *= 0.5 + 0.5 * np.cos(np.pi * (np.arange(b) + 1) / b)
    return x


def fastlen(n):
    """Smallest 2^a 3^b 5^c >= n (fast FFT size)."""
    n = int(max(1, n))
    best = 1 << (n - 1).bit_length()
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            p = p35
            while p < n:
                p *= 2
            best = min(best, p)
            p35 *= 3
        p5 *= 5
    return best


# ---- magnitude responses (used by the zero-phase FFT filters) ----
def lp(fc, order=2):
    return lambda f: 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def bp(f0, q):
    return lambda f: 1.0 / np.sqrt(1.0 + (q * (f / f0 - f0 / np.maximum(f, 1e-3))) ** 2)


def chain(*fs):
    def g(f):
        out = 1.0
        for h in fs:
            out = out * h(f)
        return out

    return g


def msum(*pairs):
    """Weighted sum of responses: msum((w1, r1), (w2, r2)...). A float r means a flat gain."""
    return lambda f: sum(w * (h(f) if callable(h) else h) for w, h in pairs)


def ffilt(x, resp, pad=0):
    """Zero-phase FFT filter with magnitude response resp(freqs)."""
    x = np.asarray(x, dtype=float)
    n = x.shape[-1]
    if pad:
        x = np.pad(x, [(0, 0)] * (x.ndim - 1) + [(pad, pad)])
    L = fastlen(x.shape[-1])
    X = np.fft.rfft(x, L)
    X *= resp(np.fft.rfftfreq(L, 1.0 / SR))
    y = np.fft.irfft(X, L)[..., : x.shape[-1]]
    return y[..., pad: pad + n] if pad else y


def tvfilt(x, resp_tf, nfft=1024):
    """Time-varying filter (STFT, hann, 75% overlap). resp_tf(t[:,None], f[None,:]) -> gains."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    hop = nfft // 4
    pad = nfft
    xp = np.concatenate([np.zeros(pad), x, np.zeros(pad + nfft)])
    nfr = (len(xp) - nfft) // hop + 1
    win = 0.5 - 0.5 * np.cos(TAU * np.arange(nfft) / nfft)
    idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]
    X = np.fft.rfft(xp[idx] * win, axis=1)
    tc = (np.arange(nfr) * hop + nfft / 2 - pad) / SR
    f = np.fft.rfftfreq(nfft, 1.0 / SR)
    Y = np.fft.irfft(X * resp_tf(tc[:, None], f[None, :]), nfft, axis=1) * win
    out = np.zeros(len(xp) + nfft)
    for j in range(4):
        blk = Y[j::4].reshape(-1)
        out[j * hop: j * hop + len(blk)] += blk
    return out[pad: pad + n] / 1.5


def conv(a, b):
    L = fastlen(a.shape[-1] + b.shape[-1] - 1)
    y = np.fft.irfft(np.fft.rfft(a, L) * np.fft.rfft(b, L), L)
    return y[..., : a.shape[-1] + b.shape[-1] - 1]


def upsample(c, H):
    """Linear upsampling of a control signal by an integer factor H (fast)."""
    c = np.asarray(c, dtype=float)
    nxt = np.append(c[1:], c[-1])
    ramp = np.arange(H) / H
    return (c[:, None] + (nxt - c)[:, None] * ramp[None, :]).reshape(-1)


# ---- envelopes & modulators ----
def env_pts(n, pts):
    ts = np.array([p[0] for p in pts], dtype=float)
    vs = np.array([p[1] for p in pts], dtype=float)
    return np.interp(np.arange(n) / SR, ts, vs)


def env_ad(n, a, tau):
    """Raised-cosine attack of `a` s, then exponential decay with time constant tau."""
    t = tv(n)
    e = np.exp(-np.maximum(t - a, 0.0) / tau)
    if a > 0:
        m = t < a
        e[m] = 0.5 - 0.5 * np.cos(np.pi * t[m] / a)
    return e


def srand(n, rate, r):
    """Smooth random modulation in [-1, 1] with ~`rate` new values per second."""
    m = int(n / SR * rate) + 3
    pts = r.uniform(-1.0, 1.0, m)
    x = np.arange(n) / SR * rate
    i = np.floor(x).astype(int)
    w = 0.5 - 0.5 * np.cos(np.pi * (x - i))
    return pts[i] * (1 - w) + pts[i + 1] * w


def modal(n, modes):
    """Sum of exponentially decaying sines: modes = [(freq, tau, amp), ...]."""
    t = tv(n)
    out = np.zeros(n)
    for f, tau, a in modes:
        if f < SR * 0.45:
            out += a * np.exp(-t / tau) * np.sin(TAU * f * t)
    return out


def bubble(f0, tau, rise=1.0):
    """Water droplet / bubble: decaying sine with rising pitch."""
    n = N(tau * 5)
    t = tv(n)
    s = np.exp(-t / tau) * np.sin(TAU * f0 * (t + rise * t * t / (2 * tau)))
    return fade(s, 0.0004, 0.002)


def glide(f1, f2, d, harm=0.12, shape=1.5, vib=0.0, vib_hz=0.0):
    """Exponential pitch glide with a sine-bump envelope (bird chirps, whistles)."""
    n = N(d)
    x = np.linspace(0.0, 1.0, n)
    f = f1 * (f2 / f1) ** x
    if vib:
        f = f * (1 + vib * np.sin(TAU * vib_hz * x * d))
    ph = TAU * np.cumsum(f) / SR
    return np.sin(np.pi * x) ** shape * (np.sin(ph) + harm * np.sin(2 * ph))


def panst(x, p):
    """Equal-power pan of a mono signal (p scalar or array in -1..1) -> (2, n)."""
    a = (np.clip(p, -1.0, 1.0) + 1.0) * (np.pi / 4)
    return np.stack([x * np.cos(a), x * np.sin(a)])


def balance(st, p):
    return np.stack([st[0] * min(1.0, 1.0 - p), st[1] * min(1.0, 1.0 + p)])


def at(buf, sig, t0, gain=1.0):
    """Add a signal into buf (same ndim) at time t0, clipped to the buffer."""
    i0 = I(t0)
    n = sig.shape[-1]
    a, b = max(0, i0), min(buf.shape[-1], i0 + n)
    if b > a:
        buf[..., a:b] += gain * sig[..., a - i0: b - i0]


def silence(d):
    return np.zeros(N(d))


def cat(*xs):
    return np.concatenate(xs)


# =====================================================================================
# Formant voice synthesis (crowd murmur, cheers, gulp, snore)
# =====================================================================================

CR = 400            # control rate (Hz)
HV = SR // CR       # samples per control step

VOWELS = {  # Peterson & Barney (adult male) F1-F3; scaled up for kids/teens
    'i': (270, 2290, 3010), 'I': (390, 1990, 2550), 'e': (530, 1840, 2480),
    'ae': (660, 1720, 2410), 'a': (730, 1090, 2440), 'o': (570, 840, 2410),
    'U': (440, 1020, 2240), 'u': (300, 870, 2240), 'A': (640, 1190, 2390),
}


def fvoice(f0c, Fc, ampc, kmax=4200.0, bws=(130.0, 160.0, 230.0), gains=(1.0, 0.6, 0.3), tilt=0.85):
    """Additive harmonic voice: harmonic k weighted by 3 formant resonances (control-rate
    f0 / formants / amplitude), harmonics generated with the Chebyshev recurrence."""
    f0c = np.asarray(f0c, dtype=float)
    ampc = np.asarray(ampc, dtype=float)
    Fc = np.asarray(Fc, dtype=float)
    f0 = upsample(f0c, HV)
    ph = TAU * np.cumsum(f0) / SR
    s_prev = np.zeros_like(ph)
    s = np.sin(ph)
    c2 = 2.0 * np.cos(ph)
    out = np.zeros_like(ph)
    K = int(kmax / max(60.0, float(f0c.min())))
    for k in range(1, K + 1):
        fk = k * f0c
        g = 0.012
        for i in range(3):
            g = g + gains[i] / np.sqrt(1.0 + ((fk - Fc[i]) / (0.5 * bws[i])) ** 2)
        g = g * (fk < kmax) * k ** -tilt * ampc
        if g.max() > 1e-4:
            out += upsample(g, HV) * s
        s_prev, s = s, c2 * s - s_prev
    return out


def babble_ctrl(m, r, f0b, fs):
    """Random syllable/phrase controls for one murmuring voice (no real words)."""
    amp = np.zeros(m)
    f0 = np.full(m, f0b)
    F = np.tile((np.array(VOWELS['A']) * fs)[:, None], (1, m))
    keys = list(VOWELS)
    onsets = []
    pos = int(r.uniform(-0.5, 0.7) * CR)
    while pos < m:
        nsyl = int(r.integers(2, 8))
        pf0 = f0b * r.uniform(0.9, 1.18)
        for s in range(nsyl):
            L = max(8, int(r.uniform(0.10, 0.22) * CR))
            a0, a1 = max(pos, 0), min(pos + L, m)
            if a1 > a0:
                x = (np.arange(a0, a1) - pos) / L
                amp[a0:a1] = np.maximum(amp[a0:a1], np.sin(np.pi * x) ** 0.6 * r.uniform(0.45, 1.0))
                f0[a0:a1] = pf0 * (1 - 0.16 * s / nsyl) * (1 + r.uniform(-0.04, 0.12) * np.sin(np.pi * x))
                F[:, a0:a1] = (np.array(VOWELS[keys[int(r.integers(len(keys)))]]) * fs)[:, None]
                if r.random() < 0.45:
                    onsets.append(a0)
            pos += L
        pos += int(r.uniform(0.12, 0.9) * CR)
    k = np.ones(12) / 12  # ~30 ms transitions
    f0 = np.convolve(np.pad(f0, 6, mode='edge'), k, 'same')[6:-6]
    F = np.array([np.convolve(np.pad(F[i], 6, mode='edge'), k, 'same')[6:-6] for i in range(3)])
    return f0, F, amp, onsets


# =====================================================================================
# Sound effects -- every generator returns mono (n,) or stereo (2, n), starting at cue t
# =====================================================================================


def g_alarm(c, r):
    dur = max(0.15, float(c.get('dur', 1.25)))
    n = N(dur)
    t = tv(n)
    f0 = 1024.0
    tone = np.zeros(n)
    k = 1
    while k * f0 < 9500:  # band-limited square-ish (odd harmonics), slightly rolled off
        tone += (1.0 / k) * lp(4500, 1)(k * f0) * np.sin(TAU * k * f0 * t)
        k += 2
    tone += 0.10 * np.sin(TAU * 2 * f0 * t) + 0.04 * np.sin(TAU * 4 * f0 * t)  # piezo grit
    gate = np.zeros(n)
    on, off, gap = 0.07, 0.05, 0.26   # beep-beep-beep-beep ... pause
    s = 0.0
    while s < dur - 0.02:
        for b in range(4):
            bs = s + b * (on + off)
            i0, i1 = I(bs), min(n, I(bs + on))
            if i1 - i0 < N(0.012):
                continue
            e = np.ones(i1 - i0)
            gate[i0:i1] = fade(e, 0.003, 0.004)
        s += 4 * (on + off) + gap
    return fade(tone * gate, 0.002, 0.006)


def g_slap(c, r):
    n = N(0.45)
    t = tv(n)
    f = 68 + 85 * np.exp(-t / 0.022)
    thud = np.sin(TAU * np.cumsum(f) / SR) * env_ad(n, 0.0015, 0.065)
    flesh = nrm(ffilt(white(n, r), chain(bp(1500, 0.8), lp(6000)))) * env_ad(n, 0.0004, 0.011)
    body = nrm(ffilt(white(n, r), lp(700))) * env_ad(n, 0.001, 0.03)
    click = np.zeros(n)
    at(click, modal(N(0.06), [(2350, .012, 1), (3720, .008, .6), (5150, .005, .4)]), 0.005)
    for dt, a in ((0.07, 0.35), (0.125, 0.2), (0.17, 0.1)):   # clock rattling on the nightstand
        k = r.uniform(0.95, 1.05)
        at(click, a * modal(N(0.05), [(1800 * k, .01, 1), (3100 * k, .006, .5), (640 * k, .015, .4)]), dt)
    return 1.0 * thud + 0.16 * flesh + 0.12 * body + 0.5 * click


def g_shower(c, r):
    dur = max(0.3, float(c.get('dur', 4.0)))
    n = N(dur)
    shape = chain(hp(280), lp(8500), msum((0.35, 1.0), (1.0, bp(3300, 0.7)), (0.45, bp(520, 1.3))))
    st = np.stack([nrm(ffilt(white(n, r), shape)) for _ in range(2)])
    st *= 1 + 0.16 * srand(n, 2.5, r) + 0.07 * srand(n, 13, r)
    for _ in range(int(dur * 38)):   # droplets
        b = bubble(r.uniform(1300, 4300), r.uniform(0.004, 0.012), r.uniform(0.5, 1.6)) * r.uniform(0.6, 2.2)
        at(st, panst(b, r.uniform(-0.8, 0.8)), r.uniform(0, dur))
    return fade(st, 0.25, 0.35)


def g_brush(c, r):
    dur = max(0.3, float(c.get('dur', 3.0)))
    n = N(dur)
    rate = float(c.get('rate', 4.2))
    a = nrm(ffilt(white(n, r), chain(bp(3300, 1.3), hp(1200))))
    b = nrm(ffilt(white(n, r), chain(bp(4800, 1.5), hp(1500))))
    wet = nrm(ffilt(white(n, r), bp(900, 1.4)))
    grain = 1 + 0.55 * srand(n, 90, r)
    ea, eb = np.zeros(n), np.zeros(n)
    s, k = 0.02, 0
    while s < dur - 0.05:   # back-and-forth strokes
        L = r.uniform(0.9, 1.1) / rate
        i0, i1 = I(s), min(n, I(s + 0.92 * L))
        if i1 - i0 > 8:
            x = np.linspace(0, 1, i1 - i0)
            (ea if k % 2 == 0 else eb)[i0:i1] += np.sin(np.pi * x ** 0.7) ** 1.3 * r.uniform(0.75, 1.0)
        s += L
        k += 1
    out = (a * ea + 0.85 * b * eb) * grain + 0.3 * wet * (ea + eb)
    return fade(out, 0.03, 0.06)


def g_spit(c, r):
    n = N(0.6)
    pop = nrm(ffilt(white(n, r), lp(900))) * env_ad(n, 0.0008, 0.008)
    spray = nrm(tvfilt(white(n, r), lambda tc, f: bp(np.interp(tc, [0, 0.15], [2700, 1500]), 1.2)(f)))
    spray *= env_pts(n, [(0, 0), (0.012, 1), (0.05, 0.7), (0.17, 0)]) * (1 + 0.5 * srand(n, 160, r))
    out = 0.35 * pop + 0.35 * spray
    m = N(0.12)
    at(out, 0.3 * nrm(ffilt(white(m, r), bp(1300, 0.9))) * env_ad(m, 0.002, 0.022), 0.21)  # splat in the sink
    for k in range(3):
        at(out, 0.35 * bubble(r.uniform(900, 2200), r.uniform(0.006, 0.012), 1.0), 0.22 + 0.03 * k + r.uniform(0, 0.02))
    return out


def g_splash(c, r):
    n = N(1.0)
    shape = chain(hp(500), lp(7500), msum((0.6, 1.0), (1.0, bp(2500, 0.8))))
    st = np.stack([nrm(ffilt(white(n, r), shape)) for _ in range(2)])
    st *= env_pts(n, [(0, 0), (0.006, 1), (0.05, 0.55), (0.35, 0.12), (0.7, 0)]) * (1 + 0.6 * srand(n, 70, r))
    for _ in range(14):   # dripping afterwards
        tt = 0.12 + r.exponential(0.18)
        if tt < 0.9:
            b = bubble(r.uniform(800, 2800), r.uniform(0.006, 0.014), 1.2) * r.uniform(1, 2.5) * (1 - tt)
            at(st, panst(b, r.uniform(-0.6, 0.6)), tt)
    return st


def g_whoosh(c, r):
    dur = max(0.15, float(c.get('dur', 0.42)))
    n = N(dur)
    pk = 0.55
    nz = nrm(tvfilt(white(n, r), lambda tc, f: bp(np.interp(tc / dur, [0, pk, 1], [450, 2600, 900]), 1.4)(f)))
    body = nrm(ffilt(white(n, r), lp(450)))
    x = np.linspace(0, 1, n)
    env = np.where(x < pk, (x / pk) ** 2, ((1 - x) / (1 - pk)) ** 1.6)
    d = float(c.get('dir', r.choice([-1.0, 1.0])))
    return panst((nz + 0.4 * body) * env, d * np.linspace(-0.55, 0.55, n))


def g_zipper(c, r):
    dur = max(0.15, float(c.get('dur', 0.45)))
    m = N(dur)
    n = m + N(0.02)
    x = np.linspace(0, 1, m)
    speed = np.sin(np.pi * x) ** 0.8
    ph = np.cumsum(60 + 200 * speed) / SR       # teeth per second
    idx = np.flatnonzero(np.diff(np.floor(ph)) > 0) + 1
    imp = np.zeros(n)
    imp[idx] = r.uniform(0.5, 1.0, len(idx)) * (0.4 + 0.6 * speed[idx])
    ir = modal(N(0.006), [(5200, .0009, 1), (3100, .0012, .6), (7600, .0006, .5)])
    ir[:40] += 0.3 * r.standard_normal(40) * np.linspace(1, 0, 40)
    clicks = conv(imp, ir)[:n]
    sp = np.zeros(n)
    sp[:m] = speed
    friction = nrm(ffilt(white(n, r), bp(3600, 0.8))) * sp * 0.12
    return clicks / max(peak(clicks), 1e-9) + friction


def g_door_open(c, r):
    n = N(1.1)
    out = np.zeros(n)
    at(out, 0.45 * modal(N(0.08), [(1950, .015, 1), (3300, .01, .6), (4850, .007, .35)]), 0.0)   # handle
    latch = modal(N(0.12), [(2450, .02, 1), (4100, .014, .7), (6000, .009, .4), (900, .025, .3), (170, .03, .5)])
    at(out, latch, 0.13)
    m = N(0.15)
    at(out, 0.4 * nrm(ffilt(white(m, r), lp(700))) * env_ad(m, 0.003, 0.04), 0.17)   # door unsticks
    air = nrm(ffilt(white(n, r), chain(lp(450), hp(60)))) * env_pts(n, [(0.15, 0), (0.4, 1), (0.7, 0.6), (1.05, 0)])
    return out + 0.3 * air


def g_door_close(c, r):
    n = N(0.9)
    out = 0.25 * nrm(ffilt(white(n, r), lp(500))) * env_pts(n, [(0, 0), (0.11, 1), (0.13, 0)])   # air push
    m = N(0.6)
    tm = tv(m)
    thump = np.sin(TAU * np.cumsum(52 + 30 * np.exp(-tm / 0.02)) / SR) * env_ad(m, 0.001, 0.09)
    wood = modal(m, [(118, .08, .6), (235, .06, .4), (410, .04, .3), (690, .03, .2)])
    nz = nrm(ffilt(white(m, r), lp(450))) * env_ad(m, 0.0008, 0.04)
    at(out, thump + wood + 0.35 * nz, 0.12)
    at(out, 0.5 * modal(N(0.1), [(2150, .02, 1), (3550, .014, .6), (5600, .01, .35)]), 0.135)   # latch
    for dt, a in ((0.2, 0.12), (0.26, 0.07)):   # small rattle
        at(out, a * modal(N(0.05), [(1600 * r.uniform(0.9, 1.1), .008, 1), (2900, .005, .5)]), dt)
    return out


def _step(r, heavy=False):
    n = N(0.22)
    t = tv(n)
    f = (55 if heavy else 72) + 70 * np.exp(-t / 0.012)
    thump = np.sin(TAU * np.cumsum(f) / SR) * env_ad(n, 0.002, 0.04 if heavy else 0.025)
    heel = nrm(ffilt(white(n, r), chain(bp(650 if heavy else 900, 0.7), lp(3500)))) * env_ad(n, 0.001, 0.03 if heavy else 0.018)
    toe = np.zeros(n)
    m = N(0.1)
    at(toe, nrm(ffilt(white(m, r), bp(1600, 0.8))) * env_ad(m, 0.004, 0.025), 0.03 if heavy else 0.045)
    grit = nrm(ffilt(white(n, r), hp(3000))) * env_ad(n, 0.001, 0.02) * (np.abs(srand(n, 900, r)) ** 3)
    if heavy:
        swish = nrm(ffilt(white(n, r), chain(hp(2000), lp(7000)))) * env_ad(n, 0.01, 0.05)
        return 0.9 * thump + 0.22 * heel + 0.08 * toe + 0.05 * grit + 0.05 * swish
    return 0.5 * thump + 0.2 * heel + 0.1 * toe + 0.06 * grit


def g_footsteps(c, r, heavy=False):
    dur = max(0.2, float(c.get('dur', 2.0)))
    rate = max(0.5, float(c.get('rate', 4.6 if heavy else 2.5)))
    out = np.zeros((2, N(dur + 0.3)))
    s, k = 0.02, 0
    while s < dur:
        a = db(r.uniform(-2.5, 0.8))
        at(out, panst(_step(r, heavy) * a, 0.08 if k % 2 else -0.08), max(0.0, s + r.uniform(-0.012, 0.012)))
        s += 1.0 / rate
        k += 1
    return out


def g_run_steps(c, r):
    return g_footsteps(c, r, heavy=True)


def _bird_song(r):
    kind = r.choice(['chirps', 'tweet', 'trill', 'feebee', 'warble'], p=[0.28, 0.2, 0.17, 0.15, 0.2])
    if kind == 'chirps':
        base = r.uniform(4500, 6200)
        parts = []
        for _ in range(int(r.integers(2, 5))):
            parts += [glide(base, base * r.uniform(0.58, 0.68), r.uniform(0.03, 0.045)), silence(r.uniform(0.05, 0.08))]
        return cat(*parts)
    if kind == 'tweet':
        lo, hi = r.uniform(2800, 3300), r.uniform(4600, 5400)
        parts = []
        for _ in range(int(r.integers(2, 4))):
            parts += [glide(lo, hi, r.uniform(0.05, 0.07), shape=1.2), silence(r.uniform(0.08, 0.12))]
        return cat(*parts)
    if kind == 'trill':
        d = r.uniform(0.3, 0.5)
        n = N(d)
        x = np.linspace(0, 1, n)
        f = r.uniform(3700, 4400) + 550 * np.sin(TAU * r.uniform(24, 30) * x * d)
        ph = TAU * np.cumsum(f) / SR
        return np.sin(np.pi * x) ** 0.8 * (np.sin(ph) + 0.1 * np.sin(2 * ph))
    if kind == 'feebee':
        a = r.uniform(3200, 3500)
        return cat(glide(a, a * 0.98, 0.22, 0.05, 0.6, 0.004, 9), silence(0.05),
                   glide(a * 0.84, a * 0.82, 0.28, 0.05, 0.6, 0.004, 9))
    notes = r.choice([2600, 3100, 3500, 4100, 4600, 5200], size=int(r.integers(5, 9)))
    parts = []
    for i in range(len(notes) - 1):
        parts += [glide(notes[i], notes[i + 1] * r.uniform(0.85, 1.0), r.uniform(0.05, 0.09), shape=1.0), silence(r.uniform(0.01, 0.03))]
    return cat(*parts)


def g_birds(c, r):
    dur = max(0.5, float(c.get('dur', 5.0)))
    n = N(dur + 0.8)
    out = np.zeros((2, n))
    s = r.uniform(0.0, 0.35)
    while s < dur - 0.2:
        song = _bird_song(r)
        dist = r.uniform(0.35, 1.0)
        if dist < 0.6:
            song = ffilt(song, lp(4800), pad=1024)
        at(out, panst(fade(song * dist, 0.002, 0.004), r.uniform(-0.75, 0.75)), s)
        s += len(song) / SR + 0.12 + r.exponential(0.55)
    air = np.stack([nrm(ffilt(white(n, r), chain(lp(1200), hp(80)))) for _ in range(2)])
    return fade(out + 0.012 * air, 0.25, 0.6)


def g_school_bell(c, r):
    dur = max(0.2, float(c.get('dur', 2.0)))
    n = N(dur + 1.4)
    imp = np.zeros(n)
    s = 0.0
    while s < dur:   # electric clapper ~22 strikes/s
        imp[I(s)] += r.uniform(0.75, 1.0) * min(1.0, 0.35 + s / 0.06)
        s += r.uniform(0.97, 1.03) / 22.0
    modes = [(1182, .9, 1.0), (1188, .9, .5), (2215, .5, .3), (2968, .45, .5), (4375, .3, .32), (6160, .18, .18), (7420, .1, .1)]
    ring = conv(imp, fade(modal(N(1.3), modes), 0.0003, 0.05))[:n]
    strike = conv(imp, nrm(ffilt(white(N(0.003), r), hp(2500))) * np.linspace(1, 0, N(0.003)))[:n]
    out = ring / peak(ring) + 0.15 * strike / max(peak(strike), 1e-9)
    out = np.tanh(1.6 * out) / math.tanh(1.6)
    buzz = np.sign(np.sin(TAU * 100 * tv(n))) * 0.02
    buzz[N(dur):] = 0
    return fade(out + ffilt(buzz, lp(2500)), 0.002, 0.05)


def g_crowd(c, r):
    dur = max(0.5, float(c.get('dur', 5.0)))
    m = int(dur * CR) + 2
    n = m * HV
    out = np.zeros((2, n))
    for _ in range(int(c.get('voices', 12))):
        kind = r.choice(['kid', 'boy', 'girl'], p=[0.35, 0.35, 0.3])
        f0b = {'kid': r.uniform(240, 320), 'boy': r.uniform(115, 165), 'girl': r.uniform(195, 250)}[kind]
        fs = {'kid': r.uniform(1.22, 1.32), 'boy': r.uniform(1.0, 1.08), 'girl': r.uniform(1.12, 1.2)}[kind]
        f0c, Fc, ac, onsets = babble_ctrl(m, r, f0b, fs)
        dist = r.uniform(0.3, 1.0)
        v = fvoice(f0c, Fc, ac, kmax=3800 if dist > 0.6 else 2600)
        v = v / max(peak(v), 1e-9) * dist
        for o in onsets:   # unvoiced consonant hints
            k = N(0.04)
            at(v, 0.12 * dist * nrm(ffilt(white(k, r), hp(3500))) * env_ad(k, 0.003, 0.012), o * HV / SR)
        at(out, panst(v, r.uniform(-0.85, 0.85)), 0.0)
    out = ffilt(out, lp(4200, 1))
    speech = msum((1.0, bp(500, 0.8)), (0.7, bp(1500, 1.0)), (0.35, bp(2800, 1.5)))
    bed = np.stack([nrm(ffilt(white(n, r), speech)) for _ in range(2)]) * (0.75 + 0.25 * srand(n, 4, r))
    out = out / max(rms(out), 1e-9) + 0.3 * bed
    return fade(out[:, :N(dur)], 0.35, 0.5)


def g_clock_fast(c, r):
    dur = max(0.2, float(c.get('dur', 2.5)))
    m = N(dur)
    n = m + N(0.05)
    x = np.arange(m) / m
    ph = np.cumsum(6.0 * (24.0 / 6.0) ** x) / SR     # 6 -> 24 ticks per second
    ticks = np.concatenate([[0], np.flatnonzero(np.diff(np.floor(ph)) > 0) + 1])
    a = modal(N(0.03), [(3200, .006, 1), (4900, .004, .6), (7300, .003, .4), (1500, .008, .25)])
    b = modal(N(0.03), [(2600, .006, 1), (4100, .004, .6), (6100, .003, .4), (1250, .008, .25)])
    out = np.zeros(n)
    for j, i in enumerate(ticks):
        at(out, (a if j % 2 == 0 else b) * (0.6 + 0.4 * i / m), i / SR)
    return out


def g_timewarp(c, r):
    dur = max(0.3, float(c.get('dur', 2.0)))
    n = N(dur)
    t = tv(n)
    x = t / dur
    sweep = nrm(tvfilt(white(n, r), lambda tc, f: bp(220.0 * 28.0 ** np.clip(tc / dur, 0, 1), 2.2)(f)))
    shimmer = nrm(ffilt(white(n, r), hp(6000)))
    fg = 110.0 * 8.0 ** (x ** 1.3)
    tone = np.zeros(n)
    for d in (-0.006, 0.006):
        ph = TAU * np.cumsum(fg * (1 + d)) / SR
        for k in range(1, 7):
            tone += np.sin(k * ph) / k
    tone *= 1 + 0.3 * np.sin(TAU * np.cumsum(2.0 + 10.0 * x) / SR)
    env = x ** 1.4 * np.clip((1 - x) / 0.1, 0, 1) ** 0.7
    mono = (sweep + 0.25 * shimmer * x ** 2 + 0.35 * tone / peak(tone) * 3) * env
    p = 0.5 * np.sin(TAU * np.cumsum(0.8 + 4.0 * x) / SR)
    return fade(panst(mono, p), 0.02, 0.03)


def g_tick(c, r):
    dur = max(0.2, float(c.get('dur', 3.0)))
    out = np.zeros(N(dur + 0.05))
    a = modal(N(0.04), [(2500, .008, 1), (3900, .005, .6), (1200, .01, .3)])
    b = modal(N(0.04), [(2150, .008, 1), (3400, .005, .6), (1050, .01, .3)])
    for k in range(int(math.ceil(dur - 1e-6))):
        at(out, a if k % 2 == 0 else b, float(k))
    return out


def g_clink(c, r):
    n = N(0.8)
    plate = [(2650, .28, 1), (4310, .2, .6), (6120, .13, .45), (7980, .08, .3), (1610, .32, .25), (9200, .05, .25), (11300, .03, .15)]
    out = modal(n, plate)
    out += 0.5 * nrm(ffilt(white(n, r), hp(4000))) * env_ad(n, 0.0002, 0.0015)
    second = modal(N(0.6), [(f, tau, a * r.uniform(0.3, 1.0)) for f, tau, a in plate])
    at(out, 0.45 * second, 0.075)
    return out


def g_chew(c, r):
    dur = max(0.3, float(c.get('dur', 2.5)))
    n = N(dur + 0.1)
    imp = np.zeros(n)
    wet_env = np.zeros(n)
    cyc = 1.0 / 1.7
    s = 0.0
    while s < dur - 0.1:
        crunchy = 1.0 - 0.5 * s / dur
        a, b = s + 0.1 * cyc, s + 0.55 * cyc
        k = r.poisson(260 * crunchy * (b - a))
        pos = r.uniform(a, b, k)
        imp[np.clip((pos * SR).astype(int), 0, n - 1)] += np.minimum(1.5, 0.3 * r.pareto(2.5, k) + 0.1) * crunchy
        i0, i1 = I(s), min(n, I(s + 0.6 * cyc))
        wet_env[i0:i1] += np.sin(np.pi * np.linspace(0, 1, i1 - i0)) ** 2
        s += cyc * r.uniform(0.92, 1.08)
    g1 = nrm(ffilt(white(N(0.004), r), bp(2600, 1.0))) * np.exp(-tv(N(0.004)) / 0.001)
    g2 = nrm(ffilt(white(N(0.008), r), bp(900, 1.0))) * np.exp(-tv(N(0.008)) / 0.003)
    crunch = conv(imp, g1)[:n] + 0.5 * conv(imp, g2)[:n]
    wet = nrm(ffilt(white(n, r), chain(lp(700), hp(120)))) * wet_env
    out = crunch / max(peak(crunch), 1e-9) + 0.06 * wet
    return fade(ffilt(out, lp(7000, 1)), 0.01, 0.05)


def g_gulp(c, r):
    n = N(0.4)
    out = np.zeros(n)
    at(out, 0.25 * modal(N(0.03), [(1700, .006, 1), (2900, .004, .4)]), 0.0)   # tongue click
    m = int(0.28 * CR)
    x = np.arange(m) / CR
    f0 = np.interp(x, [0, .03, .14, .19, .28], [380, 330, 170, 240, 240])
    amp = np.interp(x, [0, .02, .15, .2, .27, .28], [0, 1, .8, .9, 0, 0])
    F = np.array([np.full(m, 380.0), np.full(m, 950.0), np.full(m, 2300.0)])
    v = fvoice(f0, F, amp, kmax=3000)
    at(out, v / max(peak(v), 1e-9), 0.01)
    at(out, 0.4 * bubble(950, 0.02, 1.2), 0.19)
    return out


def g_whistle(c, r):
    dur = max(0.2, float(c.get('dur', 0.8)))
    n = N(dur)
    trill = 0.5 + 0.5 * np.sin(TAU * np.cumsum(34 + 3 * srand(n, 6, r)) / SR)   # the pea
    f = 3150 * (1 + 0.01 * srand(n, 5, r)) + 140 * (trill - 0.5)
    ph = TAU * np.cumsum(f) / SR
    am = 0.55 + 0.45 * trill
    tone = (np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)) * am
    breath = 0.25 * nrm(ffilt(white(n, r), bp(3150, 5))) * am + 0.06 * nrm(ffilt(white(n, r), chain(hp(1500), lp(8000))))
    env = env_pts(n, [(0, 0), (0.025, 1.15), (0.06, 1.0), (max(0.07, dur - 0.07), 0.95), (dur, 0)])
    return (tone + breath * 0.5) * env


def g_kick(c, r):
    n = N(0.45)
    t = tv(n)
    thump = np.sin(TAU * np.cumsum(52 + 75 * np.exp(-t / 0.018)) / SR) * env_ad(n, 0.001, 0.07)
    pok = modal(n, [(420, .025, 1), (760, .016, .5), (1180, .01, .3)])
    slap = nrm(ffilt(white(n, r), chain(hp(1500), lp(7000)))) * env_ad(n, 0.0003, 0.006)
    air = nrm(ffilt(white(n, r), bp(700, 0.7))) * env_pts(n, [(0.03, 0), (0.1, 1), (0.3, 0)])
    return thump + 0.5 * pok + 0.08 * slap + 0.05 * air


def g_net(c, r):
    n = N(0.9)
    st = []
    for _ in range(2):
        sw = nrm(tvfilt(white(n, r), lambda tc, f: bp(np.interp(tc, [0, 0.5], [4200, 1700]), 1.0)(f)))
        st.append(sw * (1 + 0.6 * srand(n, 55, r)))
    out = np.stack(st) * env_pts(n, [(0, 0), (0.015, 1), (0.12, 0.6), (0.55, 0)])
    imp = np.zeros(n)
    k = r.poisson(25)
    imp[(r.uniform(0.02, 0.5, k) * SR).astype(int)] = r.uniform(0.3, 1.0, k)
    rattle = conv(imp, modal(N(0.01), [(3400, .002, 1), (5200, .0015, .6)]))[:n]
    m = N(0.3)
    thud = np.sin(TAU * 85 * tv(m)) * env_ad(m, 0.003, 0.05)
    mono = 0.25 * rattle / max(peak(rattle), 1e-9)
    at(mono, 0.6 * thud, 0.4)
    return out + panst(mono, 0.0)


def g_cheer(c, r):
    dur = max(0.6, float(c.get('dur', 1.6)))
    n = N(dur + 0.4)
    out = np.zeros((2, n))
    for _ in range(6):
        word = r.choice(['yeah', 'woo', 'hey', 'yeah'])
        st = r.uniform(0.0, 0.22)
        L = max(0.4, min(dur - st, r.uniform(0.7, 1.3)))
        m = int(L * CR)
        x = np.linspace(0, 1, m)
        f0 = r.uniform(210, 360) * (0.82 + 0.3 * np.clip(x / 0.18, 0, 1) - 0.22 * np.clip((x - 0.55) / 0.45, 0, 1))
        f0 *= 1 + 0.025 * np.sin(TAU * r.uniform(5, 6.5) * np.arange(m) / CR)
        seq = {'yeah': [(0, 'i'), (0.12, 'e'), (0.35, 'ae'), (1, 'ae')], 'woo': [(0, 'u'), (1, 'U')],
               'hey': [(0, 'e'), (0.6, 'e'), (1, 'I')]}[word]
        fs = r.uniform(1.12, 1.28)
        Fc = np.array([np.interp(x, [p for p, _ in seq], [VOWELS[v][i] for _, v in seq]) for i in range(3)]) * fs
        amp = np.clip(x * L / 0.05, 0, 1) * (1 - 0.25 * x) * np.clip((1 - x) * L / 0.18, 0, 1)
        v = fvoice(f0, Fc, amp, kmax=5000)
        v = v / max(peak(v), 1e-9)
        breath = nrm(ffilt(white(len(v), r), chain(hp(900), lp(5000)))) * upsample(amp, HV) * 0.07
        if word == 'hey':
            k = N(0.06)
            breath[:k] += 0.3 * nrm(white(k, r)) * np.linspace(1, 0.3, k) * 0.3
        at(out, panst((v + breath) * r.uniform(0.55, 1.0), r.uniform(-0.7, 0.7)), st)
    for _ in range(int(r.integers(6, 11))):   # a few claps
        k = N(0.1)
        cl = nrm(ffilt(white(k, r), chain(bp(1300, 0.9), hp(400)))) * env_ad(k, 0.0004, 0.018) * 0.12
        at(out, panst(cl, r.uniform(-0.7, 0.7)), r.uniform(0.25, max(0.3, dur - 0.1)))
    return fade(out, 0.01, 0.15)


def g_pencil(c, r):
    dur = max(0.3, float(c.get('dur', 2.5)))
    n = N(dur)
    bands = [nrm(ffilt(white(n, r), chain(bp(fc, 0.9), hp(1500)))) for fc in (2700, 3700, 5000)]
    tex = 0.5 + 0.9 * np.abs(srand(n, 400, r)) + (r.random(n) < 0.002) * r.uniform(0.5, 2.0, n)
    out = np.zeros(n)
    s, k = 0.03, 0
    while s < dur - 0.08:
        L = r.uniform(0.07, 0.28)
        i0, i1 = I(s), min(n, I(s + L))
        e = env_pts(i1 - i0, [(0, 0), (0.008, 1), (L * 0.6, r.uniform(0.8, 1.1)), (L - 0.01, 0.8), (L, 0)])
        out[i0:i1] += bands[int(r.integers(3))][i0:i1] * e * r.uniform(0.6, 1.0)
        s += L + (r.uniform(0.15, 0.3) if k % 5 == 4 else r.uniform(0.02, 0.08))
        k += 1
    return fade(out * tex, 0.01, 0.03)


def g_page(c, r):
    n = N(0.6)
    sparks = np.zeros(n)
    k = r.poisson(70)
    sparks[(r.uniform(0, 0.45, k) * SR).astype(int)] = r.uniform(0.5, 3.0, k)
    crackle = 1 + np.convolve(sparks, np.ones(N(0.002)), 'same')
    crinkle = nrm(ffilt(white(n, r), chain(hp(1800), bp(4500, 0.6)))) * crackle
    crinkle *= env_pts(n, [(0, 0), (0.05, 0.6), (0.2, 1), (0.35, 0.5), (0.45, 0)])
    sweep = nrm(tvfilt(white(n, r), lambda tc, f: bp(np.interp(tc, [0.1, 0.45], [2500, 700]), 1.1)(f)))
    sweep *= env_pts(n, [(0.08, 0), (0.25, 1), (0.42, 0.3), (0.5, 0)])
    mono = 0.5 * crinkle + 0.6 * sweep
    m = N(0.15)
    at(mono, 0.6 * nrm(ffilt(white(m, r), lp(1500))) * env_ad(m, 0.002, 0.03), 0.42)   # page lands
    return panst(mono, np.linspace(0.3, -0.3, n))


def _chime(f, n):
    return modal(n, [(f, .9, 1), (2 * f, .45, .35), (3 * f, .25, .12), (4.16 * f, .12, .08), (5.43 * f, .06, .05), (6.8 * f, .01, .1)])


def g_ding(c, r):
    n = N(1.8)
    out = np.zeros((2, n))
    at(out, panst(0.75 * _chime(mtof(81), N(1.7)), -0.15), 0.0)    # A5 -> D6 (5 -> 1 in D major)
    at(out, panst(1.0 * _chime(mtof(86), N(1.7)), 0.15), 0.09)
    return out


def g_crickets(c, r):
    dur = max(0.5, float(c.get('dur', 6.0)))
    n = N(dur)
    t = tv(n)
    out = np.zeros((2, n))
    for i, level in enumerate((1.0, 0.7, 0.45, 0.3)):
        fc = r.uniform(4100, 5200)
        pulses, prate, period = int(r.integers(2, 5)), r.uniform(28, 40), r.uniform(0.32, 0.65)
        car = np.sin(TAU * fc * t + 0.3 * np.sin(TAU * 7 * t)) + 0.1 * np.sin(TAU * 2 * fc * t)
        gate = np.zeros(n)
        plen = 0.6 / prate
        pl = np.sin(np.pi * np.linspace(0, 1, N(plen))) ** 2
        s = r.uniform(0, period)
        while s < dur:
            for p in range(pulses):
                at(gate, pl * (0.8 + 0.2 * (p == 0)), s + p / prate)
            s += period * r.uniform(0.97, 1.03)
        at(out, panst(car * gate * level, r.uniform(-0.8, 0.8)), 0.0)
    bed = nrm(ffilt(white(n, r), bp(4600, 5))) * (0.5 + 0.5 * srand(n, 2, r)) * 0.05
    return fade(out + panst(bed, 0.0) * 1.4, 0.4, 0.6)


def g_clap(c, r):
    n = N(0.25)
    burst = nrm(ffilt(white(n, r), chain(bp(1300, 0.8), hp(400)))) * env_ad(n, 0.0004, 0.022)
    skin = modal(n, [(950, .012, .5), (1750, .008, .3), (240, .02, .25)])
    return burst + 1.2 * skin


def g_creak(c, r):
    dur = max(0.3, float(c.get('dur', 0.9)))
    n = N(dur)
    x = np.linspace(0, 1, n)
    f = np.interp(x, [0, .2, .55, .8, 1], [75, 110, 150, 120, 95]) * (1 + 0.12 * srand(n, 7, r))
    ph = np.cumsum(f) / SR
    idx = np.flatnonzero(np.diff(np.floor(ph)) > 0) + 1
    imp = np.zeros(n)
    imp[idx] = r.uniform(0.6, 1.0, len(idx))
    ir = modal(N(0.06), [(430, .018, 1), (790, .014, .7), (1260, .011, .55), (1980, .007, .4), (2900, .005, .25), (3800, .004, .15)])
    creak = conv(imp, ir)[:n]
    return creak * env_pts(n, [(0, 0), (0.06, 1), (0.8 * dur, 0.9), (dur, 0)])


def g_plop(c, r):
    n = N(0.8)
    t = tv(n)
    thump = np.sin(TAU * np.cumsum(45 + 35 * np.exp(-t / 0.04)) / SR) * env_ad(n, 0.006, 0.12)
    whump = nrm(ffilt(white(n, r), lp(300))) * env_ad(n, 0.005, 0.1)
    rustle = nrm(ffilt(white(n, r), chain(bp(2500, 0.7), hp(800)))) * (1 + 0.7 * srand(n, 80, r))
    rustle *= env_pts(n, [(0, 0), (0.02, 1), (0.15, 0.5), (0.5, 0)])
    springs = (np.sin(TAU * 300 * t + 0.4 * np.sin(TAU * 7 * t)) + np.sin(TAU * 470 * t)) * env_ad(n, 0.01, 0.22)
    return thump + 0.12 * whump + 0.035 * rustle + 0.03 * springs


def g_snore(c, r):
    dur = max(1.0, float(c.get('dur', 6.0)))
    n = N(dur)
    out = np.zeros(n)
    nasal = chain(msum((1.0, bp(480, 2.5)), (0.6, bp(1150, 3.0)), (0.5, bp(220, 2.0))), lp(2500, 2))
    s = 0.1
    while s + 1.0 < dur:
        L = min(1.25, dur - s)
        m = N(L)
        x = np.linspace(0, 1, m)
        ph = np.cumsum(27 + 6 * x + 2 * srand(m, 8, r)) / SR      # soft-palate flutter
        imp = np.zeros(m)
        idx = np.flatnonzero(np.diff(np.floor(ph)) > 0) + 1
        imp[idx] = r.uniform(0.6, 1.0, len(idx))
        g = white(N(0.004), r) * np.exp(-tv(N(0.004)) / 0.0012)
        rattle = ffilt(conv(imp, g)[:m], nasal)
        hum = fvoice(np.full(m // HV + 1, 95.0), np.array([[500.0], [900.0], [2400.0]]) * np.ones((1, m // HV + 1)),
                     np.ones(m // HV + 1), kmax=1500)[:m]
        ins = (rattle / max(peak(rattle), 1e-9) + 0.25 * hum / max(peak(hum), 1e-9)) * np.sin(np.pi * x) ** 1.2
        at(out, ins, s)
        if s + 1.4 < dur:   # exhale: gentle cartoon whistle
            L2 = min(1.0, dur - s - 1.4)
            m2 = N(L2)
            x2 = np.linspace(0, 1, m2)
            fw = np.interp(x2, [0, 1], [1150, 880])
            wh = np.sin(TAU * np.cumsum(fw) / SR) * 0.5 + 0.35 * nrm(ffilt(white(m2, r), bp(1000, 4))) * 0.4
            wh += 0.25 * nrm(ffilt(white(m2, r), lp(2000))) * 0.3
            at(out, 0.35 * wh * np.sin(np.pi * x2) ** 1.5, s + 1.4)
        s += 3.2
    return fade(out, 0.02, 0.1)


def g_pop(c, r):
    n = N(0.16)
    t = tv(n)
    ph = TAU * np.cumsum(380 + 900 * (1 - np.exp(-t / 0.012))) / SR
    sig = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * env_ad(n, 0.002, 0.04)
    sig += 0.15 * nrm(ffilt(white(n, r), hp(2000))) * env_ad(n, 0.0002, 0.0012)
    return sig


def g_sparkle(c, r):
    n = N(1.1)
    out = np.zeros((2, n))
    pent = [2349.3, 2637.0, 2960.0, 3520.0, 3951.1, 4698.6, 5274.0, 5919.9]   # D major pentatonic, 7th octave
    notes = np.sort(r.choice(pent, size=7, replace=True))
    s = 0.0
    for i, f in enumerate(notes):
        m = N(0.5)
        tk = modal(m, [(f, r.uniform(0.12, 0.3), 1.0), (f * 2.76, 0.05, 0.2)]) * r.uniform(0.5, 1.0) * (1 - 0.06 * i)
        at(out, panst(tk, -0.5 + i * 0.18), s)
        s += r.uniform(0.045, 0.07)
    at(out, panst(0.25 * glide(3000, 7000, 0.07, 0.0, 1.0), 0.2), 0.0)
    air = np.stack([nrm(ffilt(white(n, r), hp(7000))) for _ in range(2)]) * env_pts(n, [(0, 0), (0.1, 1), (0.6, 0)])
    return out + 0.08 * air


def g_car_pass(c, r):
    dur = max(1.0, float(c.get('dur', 2.8)))
    n = N(dur)
    t = tv(n)
    v, D, cs = float(c.get('speed', 13.0)), 5.0, 343.0
    s = v * (t - dur * 0.5)               # closest approach at mid-cue
    d = np.sqrt(s * s + D * D)
    dop = 1.0 / (1.0 + (v * s / d) / cs)
    amp = (D / d) ** 1.25
    ph = TAU * np.cumsum(92.0 * (1 + 0.03 * srand(n, 1.5, r)) * dop) / SR
    eng = np.zeros(n)
    s_prev, sk, c2 = np.zeros(n), np.sin(ph), 2 * np.cos(ph)
    for k in range(1, 13):
        eng += k ** -0.9 * r.uniform(0.7, 1.3) * sk
        s_prev, sk = sk, c2 * sk - s_prev
    eng = nrm(ffilt(eng, msum((0.6, 1.0), (1.0, bp(450, 1.2))))) * (1 + 0.15 * np.sin(TAU * 8 * t))
    tires = nrm(ffilt(white(n, r), chain(lp(1600), hp(80)))) + 0.5 * nrm(ffilt(white(n, r), bp(800, 1.0)))
    air = nrm(ffilt(white(n, r), chain(hp(1500), lp(6000)))) * amp ** 2
    mono = (0.9 * eng + 0.6 * tires) * amp + 0.25 * air
    mono = tvfilt(mono, lambda tc, f: lp(1200 + 7000 * np.interp(tc, t, D / d), 1)(f))
    dr = float(c.get('dir', 1.0))
    return fade(panst(mono, dr * 0.85 * s / d), 0.3, 0.3)


def typer_click(r):
    n = N(0.05)
    k = r.uniform(0.95, 1.05)
    body = modal(n, [(1850 * k, .006, 1), (3200 * k, .004, .6), (5100 * k, .003, .35), (760 * k, .01, .35)])
    body += 0.5 * nrm(ffilt(white(n, r), hp(2500))) * env_ad(n, 0.0002, 0.0015)
    at(body, 0.4 * modal(N(0.03), [(1300 * k, .005, .5), (2500 * k, .004, .3)]), 0.011)
    return fade(body * db(r.uniform(-2, 1)), 0.0005, 0.005)


# type: (generator, level mode, level dB, pan, space, music duck dB)
#   level mode 'peak' -> normalised peak; 'rms' -> normalised RMS (for long beds)
#   space 'scene' -> acoustic space of the cue's scene; 'fx' -> soft hall (non-diegetic)
SFX = {
    'alarm':       (g_alarm,       'peak', -10, -0.15, 'scene', 5.0),
    'slap':        (g_slap,        'peak', -5,  -0.15, 'scene', 0),
    'shower':      (g_shower,      'rms',  -21, 0.0,   'scene', 0),
    'brush':       (g_brush,       'rms',  -24, 0.0,   'scene', 0),
    'spit':        (g_spit,        'peak', -9, 0.0,   'scene', 0),
    'splash':      (g_splash,      'peak', -8, 0.0,   'scene', 0),
    'whoosh':      (g_whoosh,      'peak', -9, 0.0,   'scene', 0),
    'zipper':      (g_zipper,      'peak', -11, 0.1,   'scene', 0),
    'door_open':   (g_door_open,   'peak', -10, 0.25,  'scene', 0),
    'door_close':  (g_door_close,  'peak', -7, 0.25,  'scene', 0),
    'footsteps':   (g_footsteps,   'peak', -13, 0.0,   'scene', 0),
    'run_steps':   (g_run_steps,   'peak', -11, 0.0,   'scene', 0),
    'birds':       (g_birds,       'peak', -15, 0.0,   'scene', 0),
    'school_bell': (g_school_bell, 'peak', -9, 0.2,   'scene', 5.0),
    'crowd':       (g_crowd,       'rms',  -23, 0.0,   'scene', 1.5),
    'clock_fast':  (g_clock_fast,  'peak', -11, 0.0,   'fx',    0),
    'timewarp':    (g_timewarp,    'peak', -9, 0.0,   'fx',    2.0),
    'tick':        (g_tick,        'peak', -16, 0.1,   'scene', 0),
    'clink':       (g_clink,       'peak', -11, 0.1,   'scene', 0),
    'chew':        (g_chew,        'peak', -14, 0.0,   'scene', 0),
    'gulp':        (g_gulp,        'peak', -10, 0.0,   'scene', 0),
    'whistle':     (g_whistle,     'peak', -8, -0.2,  'scene', 5.0),
    'kick':        (g_kick,        'peak', -7, 0.0,   'scene', 0),
    'net':         (g_net,         'peak', -9, 0.15,  'scene', 0),
    'cheer':       (g_cheer,       'peak', -8, 0.0,   'scene', 4.5),
    'pencil':      (g_pencil,      'peak', -15, 0.05,  'scene', 0),
    'page':        (g_page,        'peak', -12, 0.0,   'scene', 0),
    'ding':        (g_ding,        'peak', -9, 0.0,   'fx',    1.5),
    'crickets':    (g_crickets,    'peak', -21, 0.0,   'scene', 0),
    'clap':        (g_clap,        'peak', -8, 0.0,   'scene', 0),
    'creak':       (g_creak,       'peak', -11, -0.2,  'scene', 0),
    'plop':        (g_plop,        'peak', -8, 0.0,   'scene', 0),
    'snore':       (g_snore,       'peak', -15, 0.0,   'scene', 0),
    'pop':         (g_pop,         'peak', -12, 0.0,   'fx_short', 0),
    'sparkle':     (g_sparkle,     'peak', -12, 0.0,   'fx',    0),
    'car_pass':    (g_car_pass,    'peak', -10, 0.0,   'scene', 2.0),
}
# sounds whose key moment is not at their first sample: start them early so it lands on the cue time
PREROLL = {'door_close': 0.12}   # air push before the slam
TYPER_DB = -25.0          # stamp typewriter clicks (peak), panned toward the stamp (bottom-right)
TYPER_PAN = 0.35

# acoustic spaces: (RT60 s, wet send, pre-delay s, brightness)
SPACES = {
    'room':    (0.45, 0.20, 0.006, 0.8),
    'tile':    (0.85, 0.35, 0.005, 1.0),
    'outdoor': (0.70, 0.12, 0.035, 0.6),
    'fx':      (1.60, 0.30, 0.020, 0.9),
    'fx_short': (0.50, 0.15, 0.010, 0.9),
}
SCENE_SPACE = {'01': 'room', '02': 'tile', '03': 'tile', '04': 'room', '05': 'outdoor', '06': 'outdoor',
               '07': 'outdoor', '08': 'outdoor', '09': 'outdoor', '10': 'room', '11': 'room', '12': 'outdoor',
               '13': 'outdoor', '14': 'tile', '15': 'room', '16': 'outdoor', '17': 'room'}

# =====================================================================================
# Reverb
# =====================================================================================


def make_ir(rt, pre=0.01, bright=1.0, seed=7, er=True):
    """Synthetic stereo impulse response (band-wise exponential decay of noise), unit energy."""
    length = min(4.0, rt * 1.25 + 0.1)
    n = N(length)
    r = np.random.default_rng(seed)
    t = tv(n)
    bands = [(lp(400), 1.15), (chain(hp(400), lp(1500)), 1.0), (chain(hp(1500), lp(5000)), 0.8), (hp(5000), 0.5 * bright)]
    out = np.zeros((2, n))
    for ch in range(2):
        w = r.standard_normal(n)
        for resp, k in bands:
            out[ch] += ffilt(w, resp) * np.exp(-6.91 * t / (rt * k))
    out *= 1 - np.exp(-t / 0.006)
    if er:   # a few early reflections
        for _ in range(6):
            i = int(r.uniform(0.004, 0.035) * SR)
            out[:, i] += r.uniform(-1, 1, 2) * 3.0
    out = np.pad(out, ((0, 0), (I(pre), 0)))
    return out / math.sqrt(np.mean(np.sum(out ** 2, axis=1)))


_IRS = {}


def space_ir(name):
    if name not in _IRS:
        rt, wet, pre, br = SPACES[name]
        _IRS[name] = make_ir(rt, pre, br, seed=zlib.crc32(name.encode()) & 0xffff)
    return _IRS[name]


def apply_space(st, name):
    if name not in SPACES:
        return st
    ir = space_ir(name)
    wet = SPACES[name][1]
    y = np.zeros((2, st.shape[1] + ir.shape[1] - 1))
    y[:, : st.shape[1]] += st
    y += wet * np.stack([conv(st[0], ir[0]), conv(st[1], ir[1])])
    return fade(y, 0.0, 0.05)


# =====================================================================================
# Music: instruments
# =====================================================================================

_cache = {}


def inst_pluck(m, dur, kind='pluck', bright=1.0):
    """Plucked/struck tones: 'pluck' (warm nylon-ish), 'mallet' (marimba), 'bell' (glock),
    'musicbox'.  Cached by (note, duration, timbre)."""
    key = ('p', m, round(dur, 3), kind, round(bright, 2))
    if key in _cache:
        return _cache[key]
    f = mtof(m)
    rel = 0.09 if kind == 'pluck' else 0.2
    n = N(dur + rel)
    t = tv(n)
    out = np.zeros(n)
    if kind == 'pluck':
        ph = TAU * f * t
        s_prev, s, c2 = np.zeros(n), np.sin(ph), 2 * np.cos(ph)
        q = np.exp(-t * 1.25)
        e = np.exp(-t * 2.0) * q
        for k in range(1, max(1, min(14, int(9000 / f))) + 1):
            out += k ** -1.15 * math.exp(-(k - 1) * 0.22 / bright) * e * s
            s_prev, s = s, c2 * s - s_prev
            e = e * q
        out += 0.05 * nrm(ffilt(seeded('pk', m).standard_normal(n), bp(min(f * 4, 9000), 1.0))) * np.exp(-t / 0.003)
    else:
        modes = {'mallet': [(1, 1.0, 2.8), (3.93, 0.32, 10.0), (9.2, 0.08, 24.0)],
                 'bell': [(1, 1.0, 1.7), (2.76, 0.22, 5.5), (5.4, 0.09, 11.0), (8.93, 0.04, 18)],
                 'musicbox': [(1, 1.0, 1.25), (3.0, 0.07, 7.0), (5.95, 0.06, 13.0)]}[kind]
        for ratio, a, d in modes:
            if f * ratio < 16000:
                out += a * np.exp(-t * d) * np.sin(TAU * f * ratio * t)
        out += 0.04 * nrm(ffilt(seeded('pk', m).standard_normal(n), hp(3000))) * np.exp(-t / 0.002)
    i, j = I(dur), min(n, I(dur + rel))
    if j > i:
        out[i:j] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(j - i) / (j - i))
    out[j:] = 0
    out = fade(out, 0.0015, 0.002)
    _cache[key] = out
    return out


def inst_pad(m, dur, bright=0.5, att=0.35, rel=0.8, det=0.08):
    """Warm detuned pad (wavetable, two voices -> stereo)."""
    key = ('pad', m, round(dur, 3), round(bright, 2), att, rel)
    if key in _cache:
        return _cache[key]
    f = mtof(m)
    n = N(dur + rel)
    fc = 500 + 2500 * bright
    T = 2048
    x = np.arange(T) / T
    table = np.zeros(T)
    for k in range(1, max(1, int(min(6000, 5 * fc) / f)) + 1):
        table += (1.0 / k) * lp(fc, 2)(k * f) * np.sin(TAU * k * x)
    table /= peak(table)
    out = np.zeros((2, n))
    t = tv(n)
    for ch, d in enumerate((-det, det)):
        fr = f * 2 ** (d / 12) * (1 + 0.0015 * np.sin(TAU * (0.23 + 0.11 * ch) * t + ch))
        pos = ((0.31 * ch + np.cumsum(fr) / SR) % 1.0) * T
        i = pos.astype(int)
        w = pos - i
        out[ch] = table[i] * (1 - w) + table[(i + 1) % T] * w
    env = np.ones(n)
    a = min(n, N(att))
    env[:a] = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    i0 = I(dur)
    if i0 < n:
        env[i0:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(n - i0) / max(1, n - i0))
    out *= env
    _cache[key] = out
    return out


def inst_bass(m, dur, style='pluck'):
    key = ('bass', m, round(dur, 3), style)
    if key in _cache:
        return _cache[key]
    f = mtof(m)
    rel = 0.06
    n = N(dur + rel)
    t = tv(n)
    ph = TAU * f * t
    s_prev, s, c2 = np.zeros(n), np.sin(ph), 2 * np.cos(ph)
    out = np.zeros(n)
    amps = [1.0, 0.6, 0.38, 0.22, 0.13, 0.08, 0.05] if style == 'pluck' else [1.0, 0.3, 0.08]
    for k, a in enumerate(amps, 1):
        if k * f > 3000:
            break
        dk = (1.4 + 1.6 * k) if style == 'pluck' else (0.4 + 0.3 * k)
        out += a * np.exp(-t * dk) * s
        s_prev, s = s, c2 * s - s_prev
    i, j = I(dur), min(n, I(dur + rel))
    if j > i:
        out[i:j] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(j - i) / (j - i))
    out[j:] = 0
    out = fade(out, 0.004, 0.002)
    _cache[key] = out
    return out


def inst_ep(m, dur, vel=0.7, seed=0):
    """Rhodes-like electric piano (FM) with tape wow, for the night theme."""
    f = mtof(m)
    n = N(dur + 0.9)
    t = tv(n)
    wow = 1 + 0.0022 * np.sin(TAU * 0.55 * t + seed)
    ph = TAU * np.cumsum(f * wow) / SR
    I_ = 1.6 * vel * np.exp(-t / 0.22) + 0.25   # FM index: bright attack, mellow decay
    tone = np.sin(ph + I_ * np.sin(ph)) + 0.25 * np.sin(2 * ph) * np.exp(-t / 0.5)
    tone += 0.08 * vel * np.sin(14.02 * ph) * np.exp(-t / 0.03)
    env = np.exp(-t / 1.8)
    i = I(dur)
    if i < n:
        env[i:] *= np.exp(-(t[i:] - t[i]) / 0.18)
    return fade(tone * env * (0.6 + 0.4 * vel), 0.003, 0.01)


def inst_flute(m, dur, seed=0):
    """Soft breathy triangle lead with delayed vibrato (night melody)."""
    f = mtof(m)
    n = N(dur + 0.25)
    t = tv(n)
    vib = 1 + 0.006 * np.sin(TAU * 5.2 * t) * np.clip((t - 0.15) / 0.3, 0, 1)
    ph = TAU * np.cumsum(f * vib) / SR
    tone = np.sin(ph) - np.sin(3 * ph) / 9 + np.sin(5 * ph) / 25
    breath = 0.05 * nrm(ffilt(seeded('fl', seed).standard_normal(n), bp(f * 2, 2)))
    env = env_pts(n, [(0, 0), (0.07, 1), (dur, 0.85), (dur + 0.2, 0), (dur + 0.25, 0)])
    return (tone + breath) * env


# ---- drums (pre-rendered variants) ----

def _kick(r, lofi=False):
    n = N(0.45)
    t = tv(n)
    body = np.sin(TAU * np.cumsum(46 + 80 * np.exp(-t / 0.028)) / SR) * env_ad(n, 0.0015, 0.2 if lofi else 0.16)
    click = nrm(ffilt(white(n, r), bp(3000, 0.7))) * env_ad(n, 0.0003, 0.003) * 0.06
    out = body + click
    return ffilt(out, lp(2200), pad=512) if lofi else out


def _clap(r, lofi=False):
    n = N(0.35)
    nz = nrm(ffilt(white(n, r), chain(bp(1150, 0.9), hp(500))))
    env = np.zeros(n)
    for dt in (0.0, 0.009, 0.019):
        at(env, env_ad(N(0.03), 0.0005, 0.006), dt)
    at(env, 0.7 * env_ad(N(0.3), 0.0005, 0.07), 0.021)
    body = np.sin(TAU * 185 * tv(n)) * env_ad(n, 0.001, 0.05) * 0.3
    out = nz * env * 0.3 + body
    return ffilt(out, lp(3200), pad=512) * 1.3 if lofi else out


def _hat(r, open_=False, lofi=False):
    n = N(0.35 if open_ else 0.08)
    out = nrm(ffilt(white(n, r), chain(hp(7000), lp(15000, 1)))) * env_ad(n, 0.0005, 0.16 if open_ else 0.028)
    return ffilt(out, chain(lp(6000), hp(3000)), pad=256) if lofi else out


def _shaker(r):
    n = N(0.09)
    return nrm(ffilt(white(n, r), bp(6500, 1.2))) * env_pts(n, [(0, 0), (0.012, 1), (0.06, 0.1), (0.09, 0)])


def _snap(r):
    n = N(0.08)
    return nrm(ffilt(white(n, r), bp(2300, 2.0))) * env_ad(n, 0.0004, 0.016) + 0.6 * modal(n, [(2900, .004, 1)])


def _rim(r):
    n = N(0.08)
    return modal(n, [(1750, .012, 1), (480, .02, .5)]) + 0.3 * nrm(ffilt(white(n, r), hp(2000))) * env_ad(n, 0.0002, 0.002)


def _crash(r):
    n = N(2.6)
    t = tv(n)
    nz = nrm(ffilt(white(n, r), chain(hp(4000), msum((0.6, 1.0), (1.0, bp(7000, 1.0))))))
    metal = sum(np.sin(TAU * r.uniform(3000, 11000) * t + r.uniform(0, TAU)) for _ in range(10)) / 4
    return (nz + 0.3 * metal) * env_ad(n, 0.001, 0.9)


class Drums:
    def __init__(self):
        r = seeded('drums')
        self.s = {
            'kick': [_kick(r) for _ in range(2)], 'clap': [_clap(r) for _ in range(3)],
            'hat': [_hat(r) for _ in range(4)], 'ohat': [_hat(r, True) for _ in range(2)],
            'shaker': [_shaker(r) for _ in range(4)], 'snap': [_snap(r) for _ in range(2)],
            'rim': [_rim(r)], 'crash': [_crash(r)],
            'lkick': [_kick(r, True) for _ in range(2)], 'lsnare': [_clap(r, True) for _ in range(2)],
            'lhat': [_hat(r, False, True) for _ in range(4)],
        }

    def get(self, name, k):
        v = self.s[name]
        return v[k % len(v)]


# =====================================================================================
# Music: composition (all notes are written here -- MIDI numbers, beats)
# =====================================================================================

# chord: (pad voicing, bass note, fifth for the bass)
CH = {
    'D': ([57, 62, 66, 69], 38, 45), 'A/C#': ([57, 61, 64, 69], 37, 40), 'Bm': ([59, 62, 66, 71], 35, 42),
    'G': ([59, 62, 67, 71], 31, 38), 'A': ([57, 61, 64, 69], 33, 40), 'F#m': ([57, 61, 66, 69], 42, 49),
    'Dadd9': ([57, 62, 64, 66], 38, 45), 'G/D': ([59, 62, 67, 71], 38, 45), 'Gmaj7': ([59, 62, 66, 67], 43, 50),
    'F#m7': ([57, 61, 64, 66], 42, 49), 'Em7': ([59, 62, 64, 67], 40, 47), 'A7sus4': ([57, 62, 64, 67], 33, 40),
    'D/F#': ([57, 62, 66, 69], 42, 45),
    # night (B minor)
    'Bm9': ([57, 62, 66, 73], 35, 42), 'Gmaj9': ([54, 59, 62, 69], 31, 38), 'Em9': ([55, 62, 66, 71], 40, 47),
    'A13': ([55, 61, 66, 71], 33, 40),
}

PROGS = {
    'I': ['Dadd9', 'G/D'],                                               # intro (waking up)
    'A': ['D', 'A/C#', 'Bm', 'G', 'D', 'A/C#', 'Bm', ('G', 'A')],        # verse  I V6 vi IV
    'B': ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'],                    # chorus IV V iii vi ...
    'C': ['Bm', 'G', 'D', 'A'],                                          # training
    'H': ['Gmaj7', 'F#m7', 'Em7', 'A7sus4'],                             # homework (calm)
    'X': ['A'],                                                          # time-lapse build (dominant pedal)
    'N': ['Bm9', 'Gmaj9', ('Em9', 'A13')],                               # night lo-fi
    'L': ['Gmaj7', 'D/F#', 'Dadd9', 'Dadd9'],                            # lullaby (3/4)
}

# melodies: per bar, (beat, midi, length in beats[, velocity])
MEL = {
    'A': [
        [(0, 81, .5), (.5, 78, .5), (1, 81, .5), (1.5, 83, .5), (2, 81, .75), (2.75, 78, .25), (3, 76, .5), (3.5, 74, .5)],
        [(0, 76, 1), (1, 73, .5), (1.5, 76, .5), (2, 81, 1.5)],
        [(0, 83, .5), (.5, 81, .5), (1, 78, .5), (1.5, 74, .5), (2, 78, .75), (2.75, 76, .25), (3, 74, 1)],
        [(0, 74, .5), (.5, 76, .5), (1, 79, .5), (1.5, 78, .5), (2, 76, 1.5), (3.5, 69, .5)],
        [(0, 81, .5), (.5, 78, .5), (1, 81, .5), (1.5, 83, .5), (2, 86, .75), (2.75, 85, .25), (3, 83, .5), (3.5, 81, .5)],
        [(0, 85, 1), (1, 81, .5), (1.5, 76, .5), (2, 81, 1.5)],
        [(0, 83, .5), (.5, 86, .5), (1, 83, .5), (1.5, 78, .5), (2, 81, .75), (2.75, 78, .25), (3, 76, 1)],
        [(0, 74, .5), (.5, 76, .5), (1, 79, 1), (2, 81, .5), (2.5, 83, .5), (3, 85, .5), (3.5, 88, .5)],
    ],
    'B': [
        [(0, 86, 1.5), (1.5, 83, .5), (2, 79, 1), (3, 81, .5), (3.5, 83, .5)],
        [(0, 85, 1.5), (1.5, 81, .5), (2, 76, 1.5), (3.5, 81, .5)],
        [(0, 81, .5), (.5, 78, .5), (1, 81, .5), (1.5, 85, 1), (2.5, 83, .5), (3, 81, 1)],
        [(0, 78, 1.5), (1.5, 74, .5), (2, 78, .5), (2.5, 81, .5), (3, 83, 1)],
        [(0, 86, 1.5), (1.5, 83, .5), (2, 79, .5), (2.5, 83, .5), (3, 86, 1)],
        [(0, 88, 1.5), (1.5, 85, .5), (2, 81, 1), (3, 83, .5), (3.5, 85, .5)],
        [(0, 86, 2), (2, 81, .5), (2.5, 78, .5), (3, 81, 1)],
        [(0, 86, 3)],
    ],
    'C': [
        [(0, 78, .5), (.5, 78, .25), (.75, 83, .75), (1.5, 81, .5), (2, 78, .5), (2.5, 74, .5), (3, 78, .5), (3.5, 81, .5)],
        [(0, 83, .75), (.75, 81, .25), (1, 79, .5), (1.5, 74, .5), (2, 79, .5), (2.5, 81, .5), (3, 83, 1)],
        [(0, 81, .5), (.5, 81, .25), (.75, 86, .75), (1.5, 85, .5), (2, 81, .5), (2.5, 78, .5), (3, 81, .5), (3.5, 83, .5)],
        [(0, 85, .75), (.75, 83, .25), (1, 81, .5), (1.5, 76, .5), (2, 81, 1), (3, 85, .5), (3.5, 88, .5)],
    ],
    'H': [
        [(0, 78, 1.5), (1.5, 76, .5), (2, 74, 2)],
        [(0, 73, 1.5), (1.5, 76, .5), (2, 81, 2)],
        [(0, 79, 1.5), (1.5, 78, .5), (2, 76, 2)],
        [(0, 74, 2), (2, 76, 2)],
    ],
    'N': [
        [(2.5, 78, .5), (3, 81, 1)],
        [(.5, 83, 1.5), (2, 81, .5), (2.5, 78, 1.5)],
        [(.5, 76, 1), (1.5, 78, .5), (2, 76, .5), (2.5, 73, 1.5)],
    ],
    'L': [
        [(0, 83, 1.5), (1.5, 81, .5), (2, 79, 1)],
        [(0, 78, 1.5), (1.5, 76, .5), (2, 74, 1)],
        [(0, 76, 1), (1, 78, 2)],
        [(0, 81, 3)],
    ],
}

SECTION_OF = {'01': 'intro', '02': 'verse_lite', '03': 'verse', '04': 'verse', '05': 'verse', '06': 'verse',
              '07': 'build', '08': 'chorus', '09': 'chorus', '10': 'lunch', '11': 'gearup', '12': 'training',
              '13': 'home', '14': 'home', '15': 'calm'}
PROG_OF = {'intro': 'I', 'verse_lite': 'A', 'verse': 'A', 'lunch': 'A', 'gearup': 'A', 'home': 'A',
           'chorus': 'B', 'training': 'C', 'calm': 'H', 'build': 'X'}

# arrangement per section
ARR = {
    'intro':      dict(pad=0.55, arp='slow', arpv=0.30, bass=None,      drums=None,       mel=None),
    'verse_lite': dict(pad=0.50, arp='8th',  arpv=0.34, bass='lite',    drums='lite',     mel=None),
    'verse':      dict(pad=0.45, arp='8th',  arpv=0.28, bass='verse',   drums='verse',    mel='lead'),
    'chorus':     dict(pad=0.55, arp=None,   arpv=0.0,  bass='chorus',  drums='chorus',   mel='lead+bell', strum=True),
    'lunch':      dict(pad=0.50, arp=None,   arpv=0.0,  bass='half',    drums='lunch',    mel='mallet'),
    'gearup':     dict(pad=0.45, arp='8th',  arpv=0.28, bass='verse',   drums='verse',    mel='lead'),
    'training':   dict(pad=0.50, arp='16th', arpv=0.20, bass='octaves', drums='training', mel='lead+bell', strum=True),
    'home':       dict(pad=0.50, arp='8th',  arpv=0.26, bass='lite',    drums='home',     mel='mallet'),
    'calm':       dict(pad=0.70, arp='slow', arpv=0.26, bass='whole',   drums='calm',     mel='soft'),
}
SECTION_DB = {'intro': 0.0, 'verse_lite': -0.5, 'verse': -1.5, 'build': -0.5, 'chorus': -1.0, 'lunch': -0.5,
              'gearup': -1.0, 'training': 0.0, 'home': -0.5, 'calm': 0.0, 'night': 3.0, 'lullaby': 2.0}

# drum patterns: 16 steps per 4/4 bar -> [(step, velocity)]
_8 = range(0, 16, 2)
DRUMS = {
    'lite':     {'kick': [(0, .8), (8, .7)], 'shaker': [(s, .5 if s % 4 == 2 else .28) for s in range(16)]},
    'verse':    {'kick': [(0, 1), (8, .9), (10, .55)], 'clap': [(4, .75), (12, .8)],
                 'hat': [(s, .55 if s % 4 == 2 else .3) for s in _8], 'shaker': [(s, .4 if s % 2 else .22) for s in range(16)]},
    'chorus':   {'kick': [(0, 1), (6, .6), (8, .9), (14, .5)], 'clap': [(4, .8), (12, .85)],
                 'ohat': [(s, .45) for s in (2, 6, 10, 14)], 'hat': [(s, .3) for s in (0, 4, 8, 12)],
                 'shaker': [(s, .4 if s % 2 else .22) for s in range(16)]},
    'lunch':    {'kick': [(0, .45)], 'snap': [(4, .6), (12, .65)], 'shaker': [(s, .35 if s % 4 == 2 else .22) for s in _8]},
    'training': {'kick': [(s, 1) for s in (0, 4, 8, 12)], 'clap': [(4, .85), (12, .9)],
                 'hat': [(s, .4 if s % 2 else .25) for s in range(16)], 'ohat': [(s, .4) for s in (2, 6, 10, 14)]},
    'home':     {'kick': [(0, .75), (10, .5)], 'rim': [(4, .45), (12, .5)], 'shaker': [(s, .35 if s % 4 == 2 else .2) for s in _8]},
    'calm':     {'shaker': [(s, .22 if s % 4 == 2 else .12) for s in _8]},
    'night':    {'lkick': [(0, .9), (7, .45), (10, .75)], 'lsnare': [(4, .8), (12, .8)],
                 'lhat': [(s, .5 if s % 4 == 0 else .32) for s in _8] + [(15, .18)]},
}
DRUM_GAIN = {'kick': 0.75, 'clap': 0.40, 'hat': 0.17, 'ohat': 0.13, 'shaker': 0.13, 'snap': 0.28, 'rim': 0.2,
             'crash': 0.16, 'lkick': 0.6, 'lsnare': 0.30, 'lhat': 0.12}
DRUM_PAN = {'hat': 0.25, 'ohat': 0.3, 'shaker': -0.3, 'snap': 0.15, 'rim': 0.1, 'lhat': 0.25, 'crash': -0.15}

# bass patterns: (step, degree r/o/5, length in steps)
BASS = {
    'lite':    [(0, 'r', 6), (8, 'r', 6)],
    'verse':   [(0, 'r', 3), (3, 'r', 1), (6, 'o', 2), (8, 'r', 3), (11, '5', 1), (14, 'o', 2)],
    'chorus':  [(0, 'r', 2), (3, 'r', 1), (4, 'o', 2), (6, 'r', 2), (8, 'r', 2), (10, '5', 2), (12, 'o', 2), (14, '5', 2)],
    'half':    [(0, 'r', 7), (8, '5', 7)],
    'octaves': [(s, 'r' if (s // 2) % 2 == 0 else 'o', 1.6) for s in range(0, 16, 2)],
    'whole':   [(0, 'r', 15)],
    'night':   [(0, 'r', 6), (10, 'r', 4)],
}


class Bus:
    def __init__(self, L):
        self.dry = np.zeros((2, L))
        self.rev = np.zeros((2, L))
        self.dly = np.zeros((2, L))

    def add(self, sig, t0, gain=1.0, pan=0.0, rev=0.0, dly=0.0):
        st = sig if sig.ndim == 2 else panst(sig, pan)
        at(self.dry, st, t0, gain)
        if rev:
            at(self.rev, st, t0, gain * rev)
        if dly:
            at(self.dly, st, t0, gain * dly)


def choose_beats(span, target, lo, hi, mults):
    for mlt in mults:
        cands = [k * mlt for k in range(1, 1000) if lo <= 60.0 * k * mlt / span <= hi]
        if cands:
            return min(cands, key=lambda b: abs(math.log(60.0 * b / span / target)))
    return max(1, int(round(span * target / 60.0)))


def chord_slots(spec, beats):
    if isinstance(spec, (tuple, list)):
        k = len(spec)
        return [(i * beats / k, spec[i]) for i in range(k)]
    return [(0.0, spec)]


def compose(scenes, total, L):
    """Render the score. Returns (music (2, L), plan) -- plan lists sections and tempi for the report."""
    scenes = [s for s in scenes if s['start'] < total - 1.0]
    by = {str(s['id'])[:2]: s for s in scenes}

    def st(p):
        return by[p]['start'] if p in by else None

    def en(p):
        return by[p]['start'] + by[p]['dur'] if p in by else None

    rng = seeded('music')
    drums = Drums()
    day0 = 3.0 if total > 12 else 0.0
    night0 = st('16') if st('16') is not None else total * 0.82
    sleep0 = st('17') if st('17') is not None else min(total - 3.0, night0 + 9.0)
    fade_end = total - 1.5

    def scene_at(T):
        for s in scenes:
            if s['start'] <= T < s['start'] + s['dur']:
                return s['id'][:2]
        return None

    # ---------- day tempo map: segments between anchor cuts, integer beats each ----------
    anchors = [(day0, 'n')]
    for a, kind in ((st('07'), 'build'), (en('07'), 'n'), (st('12'), 'n'), (st('15'), 'calm')):
        if a is not None and day0 + 1.5 < a < night0 - 1.5 and all(abs(a - b) > 1.2 for b, _ in anchors):
            anchors.append((a, kind))
    anchors.sort()
    anchors.append((night0, None))
    bars = []
    for (a, kind), (b, _) in zip(anchors, anchors[1:]):
        span = b - a
        if kind == 'build':
            nb = choose_beats(span, 126, 104, 152, (2, 1))
            sizes = [nb]
        else:
            nb = choose_beats(span, 98, 86, 118, (4, 2, 1)) if kind == 'calm' else choose_beats(span, 108, 100, 118, (4, 2, 1))
            sizes = [4] * (nb // 4) + ([nb % 4] if nb % 4 else [])
        spb = span / nb
        bt = 0
        for sz in sizes:
            t0 = a + bt * spb
            sec = 'build' if kind == 'build' else SECTION_OF.get(scene_at(t0 + sz * spb / 2), 'verse')
            if sec == 'build':
                sec = 'verse'
            bars.append(dict(t0=t0, t1=t0 + sz * spb, beats=sz, spb=spb, sec=('build' if kind == 'build' else sec)))
            bt += sz
    # progression index (continues while the progression stays the same) + turnarounds
    prev, idx = None, 0
    for br in bars:
        pk = PROG_OF[br['sec']]
        idx = idx + 1 if pk == prev else 0
        prev = pk
        prog = PROGS[pk]
        br.update(prog=pk, mel=idx % len(prog), chords=chord_slots(prog[idx % len(prog)], br['beats']))
    for i, br in enumerate(bars):
        nxt = bars[i + 1]['sec'] if i + 1 < len(bars) else 'night'
        if br['sec'] == 'build':
            continue
        if nxt == 'build' and br['prog'] == 'A':
            br.update(chords=chord_slots('G', br['beats']), mel=3)
        elif nxt == 'training' and br['prog'] == 'A':
            br.update(chords=chord_slots(('G', 'A'), br['beats']), mel=7)
        elif nxt == 'night':
            br.update(chords=chord_slots('A7sus4', br['beats']), mel=3 if br['prog'] == 'H' else None)

    day, night, lull = Bus(L), Bus(L), Bus(L)

    def hum(t):   # humanised timing
        return t + rng.uniform(-0.004, 0.004)

    def vj(v):
        return v * rng.uniform(0.9, 1.05)

    for bi, br in enumerate(bars):
        sec, spb, t0, beats = br['sec'], br['spb'], br['t0'], br['beats']
        steps = int(round(beats * 4))

        def T(beat):
            return t0 + beat * spb

        if sec == 'build':
            # time-lapse build: dominant pedal, rising 16th arpeggio, snare roll, riser
            dur = br['t1'] - t0
            voic = CH['A'][0]
            padsum = sum(inst_pad(mm, dur, 0.4, 0.15, 0.25) for mm in voic)
            padsum = np.stack([tvfilt(padsum[ch], lambda tc, f: lp(500 * 12 ** np.clip(tc / dur, 0, 1), 2)(f)) for ch in range(2)])
            day.add(padsum, t0, 0.11, rev=0.3)
            ladder = [57, 61, 64, 69, 73, 76, 81, 85, 88, 93]
            for s in range(steps):
                mm = ladder[min(len(ladder) - 1, s * len(ladder) // steps)] + (12 if s % 2 and s > steps // 2 else 0)
                day.add(inst_pluck(mm, 0.5 * spb), hum(T(s / 4)), vj(0.18 + 0.2 * s / steps), pan=0.3 * math.sin(s), rev=0.25)
            for s in range(0, steps, 4):
                day.add(drums.get('kick', s), T(s / 4), DRUM_GAIN['kick'] * 0.9)
                day.add(inst_bass(CH['A'][1], 0.9 * spb), T(s / 4), 0.45 * (0.7 + 0.3 * s / steps))
                day.add(inst_bass(CH['A'][1] + 12, 0.4 * spb), T(s / 4 + 0.5), 0.3 * (0.7 + 0.3 * s / steps))
            roll = []
            for bt in range(beats):
                sub = 2 if bt < beats / 3 else (4 if bt < 2 * beats / 3 else 6)
                roll += [bt + j / sub for j in range(sub)]
            for j, bt in enumerate(roll):
                day.add(drums.get('clap', j), hum(T(bt)), DRUM_GAIN['clap'] * (0.25 + 0.75 * bt / beats), pan=0.05, rev=0.1)
            n = N(dur)
            rz = nrm(tvfilt(seeded('riser').standard_normal(n), lambda tc, f: bp(300 * 25 ** np.clip(tc / dur, 0, 1), 1.6)(f)))
            rz *= np.linspace(0, 1, n) ** 2
            day.add(fade(np.stack([rz, np.roll(rz, 240)]), 0.05, 0.01), t0, 0.05, rev=0.3)
            continue

        A = ARR[sec]
        # ---- chords: pad, arpeggio, strums, bass ----
        for k, (cb, cname) in enumerate(br['chords']):
            ce = br['chords'][k + 1][0] if k + 1 < len(br['chords']) else beats
            voic, root, fifth = CH[cname]
            cdur = (ce - cb) * spb
            pg = 0.11 if sec in ('intro', 'calm', 'lunch') else 0.085
            for mm in voic:
                day.add(inst_pad(mm, cdur + 0.05, A['pad'] * 0.6, 0.3 if sec != 'intro' else 0.9, 0.7), T(cb), pg, rev=0.45)
            if A['arp'] == '8th':
                pat = [0, 1, 2, 3, 1, 2, 3, 2]
                for j in range(int(round((ce - cb) * 2))):
                    day.add(inst_pluck(voic[pat[j % 8]], 0.9 * spb, bright=0.8), hum(T(cb + j * 0.5)),
                            vj(A['arpv'] * (1.0 if j % 2 == 0 else 0.8)), pan=-0.35, rev=0.25, dly=0.12)
            elif A['arp'] == 'slow':
                for j in range(int(round(ce - cb))):
                    day.add(inst_pluck(voic[j % 4] + 12, 1.6 * spb, bright=0.7), hum(T(cb + j)), vj(A['arpv']),
                            pan=-0.3 + 0.2 * (j % 4), rev=0.4, dly=0.2)
            elif A['arp'] == '16th':
                pat = [0, 1, 2, 3, 2, 1, 2, 3]
                for j in range(int(round((ce - cb) * 4))):
                    day.add(inst_pluck(voic[pat[j % 8]] + 12, 0.4 * spb, bright=1.0), hum(T(cb + j * 0.25)),
                            vj(A['arpv'] * (1.0 if j % 4 == 0 else 0.7)), pan=0.35, rev=0.2)
            if A.get('strum'):
                for sb, ln, v in [(0, 1.2, 0.5)] + [(b + 0.5, 0.3, 0.38) for b in range(int(ce - cb))]:
                    if cb + sb >= ce:
                        continue
                    for q, mm in enumerate(voic):
                        day.add(inst_pluck(mm, ln * spb, bright=1.2), T(cb + sb) + 0.009 * q, vj(v * 0.5), pan=0.4, rev=0.2)
            if A['bass']:
                for stp, deg, ln in BASS[A['bass']]:
                    if cb * 4 <= stp < ce * 4:
                        mm = {'r': root, 'o': root + 12, '5': fifth}[deg]
                        day.add(inst_bass(mm, ln / 4 * spb * 0.95), hum(T(stp / 4)), vj(0.42), pan=0.0)
        # ---- melody ----
        if A['mel'] and br['mel'] is not None and br['prog'] in MEL:
            for note in MEL[br['prog']][br['mel'] % len(MEL[br['prog']])]:
                b0, mm, ln = note[:3]
                if b0 >= beats:
                    continue
                d = min(ln, beats - b0 + 0.5) * spb
                tt = hum(T(b0))
                if A['mel'].startswith('lead'):
                    day.add(inst_pluck(mm, d, bright=1.0), tt, vj(0.40), pan=0.1, rev=0.25, dly=0.2)
                    day.add(inst_pluck(mm, d, 'mallet'), tt, vj(0.16), pan=0.1, rev=0.25)
                    if 'bell' in A['mel']:
                        day.add(inst_pluck(mm + 12, d, 'bell'), tt, vj(0.07), pan=-0.2, rev=0.35, dly=0.2)
                elif A['mel'] == 'mallet':
                    day.add(inst_pluck(mm, d, 'mallet'), tt, vj(0.36), pan=0.1, rev=0.3, dly=0.15)
                else:   # 'soft'
                    day.add(inst_pluck(mm, d, 'mallet'), tt, vj(0.24), pan=0.1, rev=0.45, dly=0.25)
                    day.add(inst_pluck(mm, d, bright=0.5), tt, vj(0.18), pan=0.1, rev=0.45)
        # ---- drums ----
        pat = DRUMS.get(A['drums'] or '', {})
        if sec == 'intro' and bi > 0:
            pat = {'shaker': [(s, 0.18 if s % 4 == 2 else 0.1) for s in range(0, 16, 2)]}
        for name, hits in pat.items():
            for stp, v in hits:
                if stp < steps:
                    day.add(drums.get(name, int(rng.integers(8))), hum(T(stp / 4)), vj(v) * DRUM_GAIN[name],
                            pan=DRUM_PAN.get(name, 0.0), rev=0.08)
        if bi > 0 and bars[bi - 1]['sec'] == 'build':
            day.add(drums.get('crash', 0), T(0), DRUM_GAIN['crash'], pan=-0.15, rev=0.2)
        nxt = bars[bi + 1]['sec'] if bi + 1 < len(bars) else None
        if sec == 'gearup' and nxt == 'training':   # snare fill into the training groove
            for stp in range(8, steps):
                day.add(drums.get('clap', stp), T(stp / 4), DRUM_GAIN['clap'] * (0.3 + 0.6 * (stp - 8) / 8), rev=0.1)

    # ---------- night (16-friends): lo-fi, 80 BPM ----------
    nights = []
    if sleep0 - night0 > 2.0:
        span = sleep0 - night0
        nb = choose_beats(span, 80, 70, 92, (4, 2, 1))
        spb = span / nb
        sizes = [4] * (nb // 4) + ([nb % 4] if nb % 4 else [])
        bt = 0
        for i, sz in enumerate(sizes):
            nights.append(dict(t0=night0 + bt * spb, beats=sz, spb=spb, i=i))
            bt += sz
    for br in nights:
        t0, spb, beats = br['t0'], br['spb'], br['beats']

        def T(beat):
            return t0 + beat * spb

        def SW(stp):   # swung 8ths
            return T(stp / 4 + (0.09 if stp % 4 == 2 else 0.0))

        slots = chord_slots(PROGS['N'][br['i'] % 3], beats)
        for k, (cb, cname) in enumerate(slots):
            ce = slots[k + 1][0] if k + 1 < len(slots) else beats
            voic, root, fifth = CH[cname]
            for q, mm in enumerate(voic):
                night.add(inst_ep(mm, (ce - cb) * spb, 0.6, seed=q), T(cb) + 0.012 * q, vj(0.16), pan=-0.25 + 0.17 * q, rev=0.35)
                if ce - cb >= 4:
                    night.add(inst_ep(mm, 0.6 * spb, 0.4, seed=q), SW(10) + 0.01 * q, vj(0.08), pan=-0.25 + 0.17 * q, rev=0.35)
            for stp, deg, ln in BASS['night']:
                if cb * 4 <= stp < ce * 4:
                    night.add(inst_bass(root + 12, ln / 4 * spb, 'sub'), T(stp / 4), vj(0.3))
            for mm in voic[:3]:
                night.add(inst_pad(mm, (ce - cb) * spb, 0.25, 0.6, 0.9), T(cb), 0.06, rev=0.5)
        for note in MEL['N'][br['i'] % 3]:
            b0, mm, ln = note[:3]
            if b0 < beats:
                night.add(inst_flute(mm, ln * spb, seed=int(b0 * 4)), hum(T(b0)), vj(0.16), pan=0.15, rev=0.4, dly=0.3)
        for name, hits in DRUMS['night'].items():
            for stp, v in hits:
                if stp < beats * 4:
                    night.add(drums.get(name, int(rng.integers(8))), hum(SW(stp)), vj(v) * DRUM_GAIN[name],
                              pan=DRUM_PAN.get(name, 0.0), rev=0.1)
    a, b = night0, min(sleep0 + 0.6, total)
    if nights and b - a > 1.0:   # vinyl crackle + hiss
        n = N(b - a)
        r = seeded('vinyl')
        imp = np.zeros(n)
        k = r.poisson(7 * (b - a))
        imp[(r.uniform(0, 1, k) * (n - 1)).astype(int)] = r.uniform(-1, 1, k) * r.pareto(3, k)
        crack = ffilt(conv(imp, np.exp(-tv(N(0.0006)) / 0.0002)), hp(1500))[:n]
        hiss = nrm(ffilt(r.standard_normal(n), chain(hp(1500), lp(6000)))) * 0.05
        vinyl = fade(crack / max(peak(crack), 1e-9) * 0.5 + hiss, 0.5, 0.6)
        night.add(np.stack([vinyl, np.roll(vinyl, 97)]), a, 0.05)

    # ---------- lullaby (17-sleep): music box, 3/4, 72 BPM, fades out ----------
    lulls = []
    spb = 60.0 / 72.0
    t0 = sleep0
    i = 0
    while t0 < fade_end - 0.5:
        lulls.append(dict(t0=t0, i=i))
        t0 += 3 * spb
        i += 1
    for br in lulls:
        cname = PROGS['L'][min(br['i'], len(PROGS['L']) - 1)]
        voic, root, fifth = CH[cname]
        bar_d = 3 * spb
        for mm in voic:
            lull.add(inst_pad(mm, bar_d + 0.1, 0.2, 0.8, 1.5), br['t0'], 0.08, rev=0.6)
        lull.add(inst_bass(root + 12, bar_d, 'sub'), br['t0'], 0.25)
        if br['i'] < len(MEL['L']):
            for b0, mm, ln in MEL['L'][br['i']]:
                tt = br['t0'] + b0 * spb
                lull.add(inst_pluck(mm, max(ln * spb, 1.2) + 1.0, 'musicbox'), tt, vj(0.3), pan=0.15, rev=0.5, dly=0.25)
                lull.add(inst_pluck(mm + 12, max(ln * spb, 1.0) + 0.5, 'musicbox'), tt, vj(0.07), pan=-0.2, rev=0.5)

    # ---------- buses -> crossfades -> lo-fi filter -> delay & reverb ----------
    tt = tv(L)

    def ramp(a, b):   # 0 before a, 1 after b (raised cosine)
        x = np.clip((tt - a) / max(1e-3, b - a), 0, 1)
        return 0.5 - 0.5 * np.cos(np.pi * x)

    g_day = 1 - ramp(night0 - 0.3, night0 + 0.35)
    g_night = ramp(night0 - 0.15, night0 + 0.5) * (1 - ramp(sleep0 - 0.2, sleep0 + 0.9))
    g_lull = ramp(sleep0 - 0.1, sleep0 + 0.3)
    lofi = chain(lp(3600, 2), hp(40))
    dry = day.dry * g_day + ffilt(night.dry, lofi) * g_night + ffilt(lull.dry, lp(7000)) * g_lull
    rev = day.rev * g_day + ffilt(night.rev, lofi) * g_night + lull.rev * g_lull
    dly = day.dly * g_day + night.dly * g_night + lull.dly * g_lull
    # ping-pong delay (dotted 8th of the main day tempo), filtered
    d = I(0.75 * 60.0 / 108.0)
    dly = ffilt(dly, chain(hp(300), lp(5000)))
    echo = np.zeros_like(dly)
    for k in range(1, 5):
        sh = np.zeros_like(dly)
        sh[:, k * d:] = dly[:, :-k * d] if k * d < L else 0
        if k % 2:
            sh = sh[::-1]
        echo += 0.45 ** k * sh
    rev = rev + 0.5 * echo
    ir = make_ir(2.1, 0.02, 0.8, seed=11)
    wet = np.stack([conv(rev[0], ir[0])[:L], conv(rev[1], ir[1])[:L]])
    music = dry + echo + 0.55 * wet

    # section automation, fade in at day0, fade out by total - 1.5
    ctl = np.zeros(L)
    for br in bars:
        ctl[I(br['t0']):I(br['t1'])] = SECTION_DB.get(br['sec'], 0.0)
    ctl[I(night0):] = SECTION_DB['night']
    ctl[I(sleep0):] = SECTION_DB['lullaby']
    k = N(0.3)
    ctl = np.convolve(np.pad(ctl, k, mode='edge'), np.ones(k) / k, 'same')[k:-k]
    fade_start = max(sleep0 + 2.0, fade_end - 4.0)
    master = ramp(day0, day0 + 0.8) * (1 - ramp(fade_start, fade_end)) * db(ctl)
    music *= master
    music[:, : I(day0)] = 0.0
    music[:, I(fade_end):] = 0.0
    plan = dict(day0=day0, night0=night0, sleep0=sleep0, fade_end=fade_end, bars=bars, nights=nights, lulls=lulls)
    return music, plan


# =====================================================================================
# Mix & master
# =====================================================================================


def load_cues(path):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    total = float(data.get('total') or 0)
    scenes = data.get('scenes') or []
    if not scenes:   # fall back to timeline.json next to the tools folder
        try:
            with open(os.path.join(ROOT, 'timeline.json'), encoding='utf-8') as f:
                tl = json.load(f)
            s0 = 0.0
            for s in tl['scenes']:
                scenes.append(dict(id=s['id'], start=s0, dur=s['dur']))
                s0 += s['dur']
            total = total or s0
        except Exception:
            pass
    if not total:
        total = max([c.get('t', 0) + c.get('dur', 1) for c in data.get('cues', [])] + [10.0])
    return total, scenes, data.get('cues') or []


def render_sfx(cues, scenes, L):
    out = np.zeros((2, L))
    duck = []
    stats = []
    for i, c in enumerate(cues):
        typ = c.get('type')
        if typ not in SFX:
            print(f'warning: unknown sfx type {typ!r} at t={c.get("t")} ({c.get("scene", "?")}) -- skipped')
            continue
        try:
            t = float(c.get('t', 0))
        except (TypeError, ValueError):
            print(f'warning: bad cue time {c!r} -- skipped')
            continue
        if t >= L / SR:
            continue
        gen, mode, lvl, pan, space, dk = SFX[typ]
        r = seeded(typ, round(t, 3), str(c.get('scene', '')))   # stable when other cues change
        try:
            sig = np.asarray(gen(c, r), dtype=float)
            vol = float(np.clip(float(c.get('vol', 1.0)), 0.0, 2.0))
            p = float(np.clip(float(c.get('pan', pan)), -1.0, 1.0))
        except Exception as e:   # bad field values -> warn, keep going
            print(f'warning: cue {c!r} failed: {e} -- skipped')
            continue
        ref = rms(sig) if mode == 'rms' else peak(sig)
        if ref <= 0 or not np.isfinite(ref):
            continue
        sig = sig * (db(lvl) / ref) * vol
        sig = panst(sig, p) * math.sqrt(2) if sig.ndim == 1 else balance(sig, p)
        sig = fade(sig, 0.003, 0.008)
        sp = SCENE_SPACE.get(str(c.get('scene', ''))[:2], 'room') if space == 'scene' else space
        sig = apply_space(sig, sp)
        at(out, sig, t - PREROLL.get(typ, 0.0))
        dur = sig.shape[1] / SR
        if dk:
            duck.append((t, t + min(dur, float(c.get('dur', dur)) + 0.25), dk * min(1.0, vol + 0.2)))
        stats.append(dict(i=i, type=typ, t=t, scene=c.get('scene', ''), dur=dur, peak=peak(sig), rms=rms(sig)))
    # typewriter clicks for each scene's time stamp: char k appears when t > 0.25 + 0.1 k
    for s in scenes:
        r = seeded('typer', str(s.get('id')))
        for k in range(5):
            tt = s['start'] + math.ceil((0.25 + 0.1 * k) * 30 + 1e-6) / 30.0   # first frame showing the char
            if tt < L / SR:
                at(out, panst(typer_click(r), TYPER_PAN) * math.sqrt(2) * db(TYPER_DB), tt)
    return out, duck, stats


def duck_env(duck, L):
    """Music gain (linear) dipping under loud cues: 60 ms attack, 350 ms release."""
    cr = 1000
    m = L * cr // SR + 2
    tgt = np.zeros(m)
    for a, b, d in duck:
        i0, i1 = max(0, int((a - 0.06) * cr)), min(m, int(b * cr))
        tgt[i0:i1] = np.maximum(tgt[i0:i1], d)
    g = np.zeros(m)
    cur = 0.0
    ka, kr = 1 - math.exp(-1 / (0.06 * cr)), 1 - math.exp(-1 / (0.35 * cr))
    for i in range(m):
        cur += (tgt[i] - cur) * (ka if tgt[i] > cur else kr)
        g[i] = cur
    return db(-np.interp(np.arange(L) / SR, np.arange(m) / cr, g))


def kweight(x):
    shelf = lambda f: np.sqrt((1 + (f / 1500.0) ** 2 * db(4.0) ** 2) / (1 + (f / 1500.0) ** 2))
    return ffilt(x, chain(shelf, hp(38.0, 2)))


def loudness(x):
    """Integrated loudness (BS.1770-style: K-weighting approx., 400 ms blocks, gating)."""
    z = kweight(x)
    blk, hop = N(0.4), N(0.1)
    p = np.sum(np.square(z), axis=0)
    cs = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, z.shape[1] - blk + 1, hop)
    if len(starts) == 0:
        return -70.0
    ms = (cs[starts + blk] - cs[starts]) / blk
    lk = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    g = ms[lk > -70]
    if len(g) == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g = ms[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(g)))


def true_peak(x, os_=4):
    """Peak of the 4x oversampled signal (FFT interpolation in overlapping chunks)."""
    best = 0.0
    ch, ov = 1 << 16, 256
    for c in range(x.shape[0]):
        for s in range(0, x.shape[1], ch):
            a, b = max(0, s - ov), min(x.shape[1], s + ch + ov)
            seg = x[c, a:b]
            X = np.fft.rfft(seg)
            y = np.fft.irfft(X, len(seg) * os_) * os_
            lo = (s - a) * os_
            best = max(best, float(np.max(np.abs(y[lo: lo + min(ch, x.shape[1] - s) * os_]))))
    return best


def _slide_min_fwd(x, w):
    """y[i] = min(x[i : i + w])  (van Herk / Gil-Werman, O(n))."""
    n = len(x)
    pad = (-n) % w + w
    xp = np.concatenate([x, np.full(pad, x[-1])]).reshape(-1, w)
    pre = np.minimum.accumulate(xp, axis=1).reshape(-1)
    suf = np.minimum.accumulate(xp[:, ::-1], axis=1)[:, ::-1].reshape(-1)
    return np.minimum(suf[:n], pre[w - 1: w - 1 + n])


def _movavg_back(x, w):
    cs = np.concatenate([np.full(w, x[0]), x])
    c = np.cumsum(cs)
    return (c[w:] - c[:-w]) / w


def limiter(x, ceiling):
    """Look-ahead peak limiter: gain never exceeds the per-sample requirement."""
    pk = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    w1, w2 = N(0.004), N(0.06)
    g = _movavg_back(_slide_min_fwd(g, w1), w1)
    g = _movavg_back(_slide_min_fwd(g, w2), w2)
    return x * g, float(1.0 - g.min())


def write_wav(path, x):
    r = np.random.default_rng(1)
    d = (r.random(x.shape) - r.random(x.shape)) / 32768.0   # TPDF dither
    y = np.clip(np.round((x + d) * 32767.0), -32768, 32767).astype('<i2')
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(y.T.reshape(-1).tobytes())


def sec_db(x, a, b):
    seg = x[:, max(0, I(a)): max(0, I(b))]
    return 10 * math.log10(max(float(np.mean(np.square(seg))), 1e-12)) if seg.size else -120.0


def _rel(p):
    r = os.path.relpath(p)
    return p if r.startswith('..') else r


def main(argv):
    flags = {a for a in argv if a.startswith('--')}
    pos = [a for a in argv if not a.startswith('--')]
    cues_path = pos[0] if len(pos) > 0 else os.path.join(ROOT, 'out', 'cues.json')
    out_path = pos[1] if len(pos) > 1 else os.path.join(ROOT, 'out', 'audio.wav')
    report = '--report' in flags
    t_start = time.time()

    total, scenes, cues = load_cues(cues_path)
    L = int(round(total * SR))
    print(f'{_rel(cues_path)}: total {total:.2f}s, {len(scenes)} scenes, {len(cues)} cues')

    sfx, duck, stats = render_sfx(cues, scenes, L)
    music, plan = compose(scenes, total, L)
    act = (plan['day0'] + 1.0, plan['fade_end'] - 3.0)
    mrms = sec_db(music, *act)   # per-channel RMS (dB)
    music *= db(MUSIC_RMS_DB - mrms)
    music *= duck_env(duck, L)

    mix = music + sfx
    hpf = hp(22.0, 2)
    mix = ffilt(mix, hpf)
    mix -= mix.mean(axis=1, keepdims=True)
    gain = 1.0
    ceiling = db(CEILING_DB - 0.3)
    for _ in range(3):   # loudness normalisation + limiter, iterated
        lu = loudness(mix * gain)
        gain *= db(np.clip(TARGET_LUFS - lu, -12, 12))
        out, gr = limiter(mix * gain, ceiling)
        if abs(loudness(out) - TARGET_LUFS) < 0.2:
            break
    tp = true_peak(out)
    if tp > db(CEILING_DB):
        out, _ = limiter(out * (db(CEILING_DB) / tp), ceiling)
        tp = true_peak(out)
    n = out.shape[1]
    fade(out, 0.005, 0.0)
    e = N(0.9)   # match the picture's final fade to black
    out[:, n - e:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(e) / e)
    out[:, -N(0.01):] = 0.0
    write_wav(out_path, out)

    lu = loudness(out)
    print(f'wrote {_rel(out_path)}: {n / SR:.3f}s  {SR} Hz 16-bit stereo  '
          f'peak {lin2db(peak(out)):.2f} dBFS, true peak {lin2db(tp):.2f} dBTP, loudness {lu:.1f} LUFS, '
          f'max limiter GR {lin2db(1 - gr):.1f} dB  ({time.time() - t_start:.1f}s)')
    mus_post = music * gain
    sfx_post = sfx * gain
    print(f'music: {sec_db(mus_post, *act):.1f} dB RMS/channel in {act[0]:.1f}-{act[1]:.1f}s; '
          f'0-{plan["day0"]:.1f}s {sec_db(mus_post, 0, plan["day0"]):.0f} dB; '
          f'last 1.5s {sec_db(mus_post, total - 1.5, total):.0f} dB')
    tempi = {}
    for br in plan['bars']:
        tempi.setdefault(br['sec'], set()).add(round(60.0 / br['spb'], 1))
    print('day sections: ' + ', '.join(f'{k} {sorted(v)} bpm' for k, v in tempi.items()))

    if report:
        print('\nper-cue levels (post-master, own signal incl. space):')
        for s in stats:
            pk = lin2db(s['peak'] * gain)
            flag = '' if pk > -50 else '   <-- SILENT?'
            print(f"  {s['t']:6.2f}s {s['scene']:<14} {s['type']:<12} {s['dur']:5.2f}s  peak {pk:6.1f}  rms {lin2db(s['rms'] * gain):6.1f}{flag}")
        print('\nper-second RMS dBFS (mix | music | sfx):')
        rows = []
        for s0 in range(int(math.ceil(total))):
            rows.append(f'{s0:3d}s {sec_db(out, s0, s0 + 1):6.1f} {sec_db(mus_post, s0, s0 + 1):6.1f} {sec_db(sfx_post, s0, s0 + 1):6.1f}')
        for i in range(0, len(rows), 3):
            print('   '.join(rows[i:i + 3]))
    if '--stems' in flags:
        base = os.path.splitext(out_path)[0]
        write_wav(base + '-music.wav', np.clip(mus_post, -1, 1))
        write_wav(base + '-sfx.wav', np.clip(sfx_post, -1, 1))
        print('wrote stems', base + '-music.wav', base + '-sfx.wav')


if __name__ == '__main__':
    main(sys.argv[1:])
