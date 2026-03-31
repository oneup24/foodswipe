// Web no-op stubs — AdMob only runs on iOS/Android native builds

export const AD_UNITS = {
  rewarded: "",
  interstitial: "",
};

export function useInterstitialAd(_adUnitId: string) {
  return {
    isLoaded: false,
    isClosed: false,
    load: () => {},
    show: () => {},
    error: undefined as undefined,
  };
}

export function useRewardedAd(_adUnitId: string) {
  return {
    isLoaded: false,
    isClosed: false,
    isEarnedReward: false,
    reward: undefined as undefined,
    load: () => {},
    show: () => {},
    error: undefined as undefined,
  };
}

export function initAds() {}
