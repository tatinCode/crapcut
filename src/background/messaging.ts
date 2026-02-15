export type Mode = 'off' | 'low' | 'medium' | 'high' |'extreme';

export type Msg = 
    | { type: "GET_STATE" }
    | { type: "SET_MODE"; mode: Mode }
    | { type: "APPLY_TO_TAB"; tabId: number }
    | { type: "GET_STATS"; tabId?: number };

export type StatsResponse = {
    currentTab: Stats;    //bytes saved on current page
    session: Stats;        //bytes saved in this browsing session
    allTime: Stats;        //bytes saved since extension was installed
}

export type Stats = {
    blockedRequests: number;
    estimatedBytesSaved: number;
}

export type State = {
    mode: Mode;
}
