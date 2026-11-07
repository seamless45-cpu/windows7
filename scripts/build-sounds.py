#!/usr/bin/env python3
"""
Converts the Windows 7 sound files into compressed assets for the simulator.

Input: the extracted Windows 7 "Media" folder, containing the default sounds
in its root and the alternate sound schemes (Afternoon, Calligraphy, Characters,
Cityscape, Delta, Festival, Garden, Heritage, Landscape, Quirky, Raga, Savannah,
Sonata) in sub-folders.

Output: public/sounds/default/<event>.mp3 and public/sounds/<scheme>/<event>.mp3

The event names are normalised, e.g. "Windows Logon Sound.wav" -> logon.mp3 and
"Windows Feed Discovered.wav" -> feed-discovered.mp3.

Usage: python3 scripts/build-sounds.py /path/to/"Windows 7 Media"
"""
import os
import re
import sys

DEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "sounds")

# Windows 7 ships fourteen sound schemes; "No Sounds" is not a scheme of files.
SCHEMES = [
    "default", "Afternoon", "Calligraphy", "Characters", "Cityscape", "Delta",
    "Festival", "Garden", "Heritage", "Landscape", "Quirky", "Raga", "Savannah", "Sonata",
]

# Program events -> the file Windows associates with them.
EVENTS = {
    "Windows Default": "default",
    "Windows Logon Sound": "logon",
    "Windows Logoff Sound": "logoff",
    # Windows 7's "Windows Startup" event plays Startup.wav — the four-note
    # chime heard when you log on. (The short "Windows Startup.wav" blip next to
    # it in the media folder is a UI sound, not the logon chime.)
    "Startup": "startup",
    "Windows Shutdown": "shutdown",
    "Windows Minimize": "minimize",
    "Windows Restore": "restore",
    "Windows Ding": "ding",
    "Windows Error": "error",
    "Windows Exclamation": "exclaim",
    "Windows Critical Stop": "critical",
    "Windows Balloon": "balloon",
    "Windows Notify": "notify",
    "Windows Recycle": "recycle",
    "Windows Menu Command": "menu",
    "Windows User Account Control": "uac",
    "Windows Print complete": "print",
    "Windows Hardware Insert": "hardware-insert",
    "Windows Hardware Remove": "hardware-remove",
    "Windows Hardware Fail": "hardware-fail",
    "Windows Battery Low": "battery-low",
    "Windows Battery Critical": "battery-critical",
    "Windows Feed Discovered": "feed",
    "Windows Information Bar": "infobar",
    "Windows Pop-up Blocked": "popup",
    "Windows Navigation Start": "navigation",
    "Windows Ringin": "ringin",
    "Windows Ringout": "ringout",
    "chimes": "chimes",
    "chord": "chord",
    "ding": "chimes-ding",
    "notify": "chimes-notify",
    "recycle": "chimes-recycle",
    "ringout": "chimes-ringout",
}


# Windows mixes every sound at full scale; several of the original WAVs sit at
# -25 dBFS or lower, which makes the startup sound and the notify chimes almost
# inaudible next to the logon sound. Each clip is normalised to a fixed peak and
# given a little headroom, keeping the relative feel of the scheme intact.
TARGET_PEAK = 0.89


# "Windows Startup.wav" (a 0.2 s blip) is a UI sound, not a program event; it
# must not overwrite the real four-second Startup.wav chime.
SKIP = {"Windows Startup"}


def convert(src: str, dst: str) -> bool:
    """Normalise, trim silence and transcode to MP3 (no external tools needed)."""
    import numpy as np
    import soundfile as sf  # imported here so --help works without the dependency

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        data, sr = sf.read(src, dtype="float32", always_2d=True)
        data = trim_silence(data, sr)
        peak = float(np.abs(data).max()) if data.size else 0.0
        if peak > 0:
            data = data * (TARGET_PEAK / peak)
        # a short fade-in/out removes the click at the cut points
        data = fade(data, sr)
        sf.write(dst, data, sr, format="MP3", subtype="MPEG_LAYER_III")
    except Exception as e:  # noqa: BLE001
        print("  !", os.path.basename(src), str(e)[:160])
        return False
    return True


def trim_silence(data, sr: int):
    """Drop the leading/trailing silence the WAVs carry."""
    import numpy as np
    if not data.size:
        return data
    mono = np.abs(data).max(axis=1)
    thr = max(0.0015, float(mono.max()) * 0.015)
    idx = np.where(mono > thr)[0]
    if not len(idx):
        return data
    pad = int(0.02 * sr)
    a = max(0, idx[0] - pad)
    b = min(len(data), idx[-1] + pad)
    return data[a:b]


def fade(data, sr: int):
    import numpy as np
    n = min(int(0.006 * sr), len(data) // 4)
    if n <= 1:
        return data
    ramp = np.linspace(0, 1, n, dtype="float32")[:, None]
    data[:n] *= ramp
    data[-n:] *= ramp[::-1]
    return data


def main(root: str) -> None:
    count = 0
    for scheme in SCHEMES:
        folder = root if scheme == "default" else os.path.join(root, scheme)
        if not os.path.isdir(folder):
            print("missing scheme folder:", folder)
            continue
        for f in sorted(os.listdir(folder)):
            stem, ext = os.path.splitext(f)
            if ext.lower() != ".wav":
                continue
            if stem in SKIP:
                continue
            event = EVENTS.get(stem)
            if not event:
                # keep unknown events, normalised
                event = re.sub(r"^Windows\s+", "", stem).lower().replace(" ", "-")
            out = os.path.join(DEST, scheme, event + ".mp3")
            if convert(os.path.join(folder, f), out):
                count += 1
        print(scheme, "done")
    print(count, "clips written to", DEST)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
