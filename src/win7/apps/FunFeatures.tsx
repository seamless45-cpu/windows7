"use client";
/**
 * Control Panel → Fun experimental features.
 *
 * A category Windows never had, holding the things you can only do in a
 * simulator: trigger a bug check on demand (with the frozen-audio stutter a
 * real crash makes), break a driver so the *next* boot fails, jump straight to
 * the boot / logon / off screens, and play with the screen savers.
 */
import React, { useState } from "react";
import { getState, setState, bugCheck, notify, lsGet, lsSet, openCP, setSettings } from "../store";
import { playSys, startBlueScreenStutter, stopBlueScreenStutter } from "../sound";
import { GroupBox, Btn, Check } from "../ui";
import { Icon } from "../icons";

const STOPS: [string, string, string][] = [
  ["0x0000007E", "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED", "A system thread raised an exception that the error handler did not catch."],
  ["0x00000050", "PAGE_FAULT_IN_NONPAGED_AREA", "A requested page of memory was not found in the paging file."],
  ["0x0000001E", "KMODE_EXCEPTION_NOT_HANDLED", "A kernel-mode program generated an exception the error handler did not catch."],
  ["0x000000D1", "DRIVER_IRQL_NOT_LESS_OR_EQUAL", "A driver accessed pageable memory at a process IRQL that was too high."],
  ["0x0000009F", "DRIVER_POWER_STATE_FAILURE", "A driver is in an inconsistent power state."],
  ["0x00000024", "NTFS_FILE_SYSTEM", "A problem occurred in a file system driver."],
  ["0x0000008E", "KERNEL_MODE_EXCEPTION_NOT_HANDLED", "A kernel-mode application generated an exception the handler did not catch."],
];
const DRIVERS = ["nvlddmkm.sys", "iaStor.sys", "nvraid.sys", "ndis.sys", "usbhub.sys", "tcpip.sys", "dxgkrnl.sys"];

export function FunFeatures() {
  const [stop, setStop] = useState(STOPS[0][0]);
  const [driver, setDriver] = useState(DRIVERS[0]);
  const [countdown, setCountdown] = useState(lsGet("win7.bsod.countdown", true));
  const [autoDump, setAutoDump] = useState(lsGet("win7.bsod.dump", true));
  const st = getState();

  const crash = () => {
    playSys("critical");
    bugCheck(stop, driver);
  };

  return (
    <div className="fun">
      <h1 className="cp-h1">Fun experimental features</h1>
      <p className="cp-desc">Things this simulated Windows can do that a real installation will not let you: crash the kernel on purpose, freeze the audio, break a driver, or jump straight to a system screen. None of these touch your saved files.</p>

      <GroupBox title="Simulate a bug check (blue screen)">
        <p>Choosing a stop code and a driver and pressing <b>Crash now</b> shows the real Windows 7 stop screen. The machine stays on the screen, loops the last fragment of audio it was playing as a frozen glitch — the way a real machine does when the audio driver dies mid-buffer — then restarts.</p>
        <div className="fun-grid">
          <label>Stop code:
            <select className="w7input" value={stop} onChange={(e) => setStop(e.target.value)}>
              {STOPS.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
            </select>
          </label>
          <label>Failing driver:
            <select className="w7input" value={driver} onChange={(e) => setDriver(e.target.value)}>
              {DRIVERS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>
        <p className="fun-note">{STOPS.find((s) => s[0] === stop)?.[2]}</p>
        <p>
          <Check checked={countdown} onChange={(v) => { setCountdown(v); lsSet("win7.bsod.countdown", v); }} label="Show the crash-dump progress counter" />
          <Check checked={autoDump} onChange={(v) => { setAutoDump(v); lsSet("win7.bsod.dump", v); }} label="Write a memory dump (simulated)" />
        </p>
        <p><Btn def onClick={crash}>Crash now</Btn> <Btn onClick={() => { notify({ title: "Fun experimental features", text: "Nothing happened. The kernel is fine.", icon: "info" }); }}>Check the kernel instead</Btn></p>
      </GroupBox>

      <GroupBox title="Break the next boot">
        <p>Set the driver the kernel should fail to load. The next time the machine starts, the boot halts with a bug check instead of reaching the logon screen.</p>
        <p><Btn onClick={() => { setState({ brokenDriver: driver }); notify({ title: "Boot", text: `${driver} will fail on the next start. Restart to see it.`, icon: "warn" }); }}>Make {driver} fail on the next boot</Btn> <Btn disabled={!st.brokenDriver} onClick={() => { setState({ brokenDriver: null }); notify({ title: "Boot", text: "The boot configuration is healthy again.", icon: "info" }); }}>Repair it</Btn></p>
        <p className="fun-note">{st.brokenDriver ? `Currently broken: ${st.brokenDriver}` : "No driver is broken."}</p>
      </GroupBox>

      <GroupBox title="Jump to a system screen">
        <div className="fun-tiles">
          {([["Boot screen", "boot"], ["Logon screen", "login"], ["Lock the PC", "locked"], ["Welcome", "welcome"], ["Shutting down", "shuttingdown"], ["Restarting", "restarting"], ["Logging off", "logoff"], ["It is safe to turn off", "off"]] as [string, string][]).map(([label, power]) => (
            <div key={power} className="fun-tile" role="button" tabIndex={0} onClick={() => { setState({ power: power as never, startOpen: false, flyout: null, menu: null, screensaverOn: false }); }}>
              <Icon name={power === "boot" ? "start-orb" : power === "login" || power === "locked" ? "user" : "power"} size={30} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </GroupBox>

      <GroupBox title="Screen savers">
        <p>Mystify, 3D Text and Gradient are all live in <a onClick={() => openCP("screensaver")}>Screen Saver Settings</a>. Preview one here:</p>
        <div className="fun-tiles">
          {([["mystify", "Mystify"], ["text3d", "3D Text"], ["lightning", "Lightning"], ["ribbons", "Ribbons"], ["bubbles", "Bubbles"], ["gradient", "Gradient"]] as [string, string][]).map(([kind, label]) => (
            <div key={kind} className="fun-tile" onClick={() => { setSettings({ screensaver: kind as never }); setState({ screensaverOn: true }); }}>
              <Icon name="display" size={30} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </GroupBox>

      <GroupBox title="Sound">
        <p>The bug check loops the last audio fragment it can hear. You can hear that stutter on its own:</p>
        <p><Btn onClick={() => { startBlueScreenStutter(); window.setTimeout(stopBlueScreenStutter, 3000); }}>Play the frozen-audio stutter for 3 seconds</Btn></p>
      </GroupBox>
    </div>
  );
}
