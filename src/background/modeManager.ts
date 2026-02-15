import type { Mode, State } from "./messaging";

const KEY = "mode_state_v1";

export async function getState(): Promise<State> {
    const result = await chrome.storage.local.get(KEY);
    const state = result[KEY] as State | undefined;
    if (state) {
        return state;
    } else {
        return { mode: "low" };
    }
};

export async function setMode(mode: Mode): Promise<State> {
    const next: State = { mode };
    await chrome.storage.local.set({ [KEY]: next });
    return next;
}
