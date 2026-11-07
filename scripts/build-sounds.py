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
    "Windows Startup": "startup",
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


def convert(src: str, dst: str) -> bool:
    """Transcode to MP3 with libsndfile (no external tools needed)."""
    import soundfile as sf  # imported here so --help works without the dependency

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        data, sr = sf.read(src, dtype="float32", always_2d=True)
        sf.write(dst, data, sr, format="MP3", subtype="MPEG_LAYER_III")
    except Exception as e:  # noqa: BLE001
        print("  !", os.path.basename(src), str(e)[:160])
        return False
    return True


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
