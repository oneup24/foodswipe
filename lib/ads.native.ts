import { Platform } from "react-native";
import mobileAds, {
  useInterstitialAd,
  useRewardedAd,
} from "react-native-google-mobile-ads";

export const AD_UNITS = {
  rewarded:
    Platform.OS === "ios"
      ? "ca-app-pub-6069605844156739/9982602348"
      : "ca-app-pub-6069605844156739/9588790027",
  interstitial:
    Platform.OS === "ios"
      ? "ca-app-pub-6069605844156739/9971933403"
      : "ca-app-pub-6069605844156739/1626539527",
};

export { useInterstitialAd, useRewardedAd };

export function initAds() {
  mobileAds()
    .initialize()
    .catch((err) => console.warn("AdMob init error:", err));
}
