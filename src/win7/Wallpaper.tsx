"use client";
/**
 * The desktop background layer.
 *
 * Photos and videos are shown in one of Windows 7's picture positions — Fill,
 * Fit, Center or Tile. Stretching is intentionally not offered: it distorts a
 * photo or video and destroys its clarity. If the media is smaller than the
 * screen it is centred on black, exactly like the real desktop.
 */
import React, { useEffect, useRef, useState } from "react";
import { fitCss, mediaMeta, mediaUrl, isMediaWallpaper } from "./media";
import { wpStyle } from "./fileops";

export function Wallpaper({ wallpaper, pos, sound }: { wallpaper: string; pos: string; sound: boolean }) {
  const media = isMediaWallpaper(wallpaper);
  const id = media ? wallpaper.slice(6) : "";
  const meta = media ? mediaMeta(id) : undefined;
  const [url, setUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!media) {
      setUrl(null);
      return;
    }
    let live = true;
    mediaUrl(id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [media, id, wallpaper]);

  // keep the video's audio in step with the setting (and restart playback if
  // the browser paused it while the tab was hidden)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !sound;
    v.volume = sound ? 1 : 0;
    v.play().catch(() => {});
  }, [sound, url]);

  if (!media) return <div className="wp-layer" style={wpStyle(wallpaper, pos)} />;

  if (!meta || !url) {
    return <div className="wp-layer wp-media-loading" style={{ background: "#000" }} />;
  }

  const fit = fitCss(pos);
  const tile = pos === "tile";

  if (meta.kind === "image") {
    const cover = fit === "cover";
    const contain = fit === "contain";
    return (
      <div className="wp-layer wp-media" style={{ background: "#000" }}>
        <img
          src={url}
          alt=""
          draggable={false}
          style={
            tile
              ? { position: "absolute", inset: 0, width: meta.w, height: meta.h, backgroundImage: `url("${url}")`, backgroundRepeat: "repeat", opacity: 0 }
              : {
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  width: cover ? "100%" : contain ? "100%" : meta.w,
                  height: cover ? "100%" : contain ? "100%" : meta.h,
                  objectFit: cover ? "cover" : contain ? "contain" : "none",
                  maxWidth: cover || contain ? "100%" : "none",
                  maxHeight: cover || contain ? "100%" : "none",
                }
          }
        />
        {tile && <div className="wp-tile" style={{ backgroundImage: `url("${url}")`, backgroundSize: `${meta.w}px ${meta.h}px` }} />}
      </div>
    );
  }

  // video backgrounds always fill the screen without distortion: `cover` keeps
  // the aspect ratio and crops, `contain` letterboxes on black.
  return (
    <div className="wp-layer wp-media" style={{ background: "#000" }}>
      <video
        ref={videoRef}
        src={url}
        className="wp-video"
        style={{ objectFit: fit === "auto" ? "cover" : fit }}
        autoPlay
        loop
        playsInline
        muted={!sound}
        draggable={false}
      />
    </div>
  );
}
