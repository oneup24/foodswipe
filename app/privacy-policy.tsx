import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const LAST_UPDATED = "March 2026";
const CONTACT_EMAIL = "support@foodswipe.app";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: colors.muted }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Overview" colors={colors}>
          FoodSwipe ("we", "our", or "the app") helps you discover nearby restaurants through a
          swipe-based interface. This policy explains what data we collect, how we use it, and your rights.
        </Section>

        <Section title="Data We Collect" colors={colors}>
          <Bold>Location</Bold>
          {"\n"}We request your device location to find restaurants near you. Location is only used
          within the app and is never stored on our servers.{"\n\n"}
          <Bold>Liked Restaurants</Bold>
          {"\n"}Your liked restaurants are saved locally on your device using AsyncStorage. This data
          never leaves your device.{"\n\n"}
          <Bold>Usage Data</Bold>
          {"\n"}We use Google AdMob to show ads. AdMob may collect device identifiers and usage data
          to serve relevant ads. See Google's privacy policy for details.
        </Section>

        <Section title="Third-Party Services" colors={colors}>
          FoodSwipe uses the following third-party services:{"\n\n"}
          <Bold>Google Places API</Bold> — provides restaurant data, photos, hours, and reviews.
          Subject to Google's Privacy Policy.{"\n\n"}
          <Bold>Google AdMob</Bold> — provides advertising. May use device identifiers for ad
          personalisation. You can opt out via your device's ad settings.{"\n\n"}
          <Bold>Serper.dev</Bold> — used to find food photos. Only the restaurant name and cuisine
          type are sent; no personal data is shared.
        </Section>

        <Section title="Data Storage" colors={colors}>
          We do not operate user accounts. No personal information (name, email, password) is
          collected or stored on our servers.{"\n\n"}
          Your liked restaurants and preferences are stored locally on your device only. Uninstalling
          the app removes all locally stored data.
        </Section>

        <Section title="Advertising" colors={colors}>
          FoodSwipe displays ads powered by Google AdMob. Ad networks may use cookies and device
          identifiers to show personalised ads based on your interests.{"\n\n"}
          To opt out of personalised ads:{"\n"}
          • iOS: Settings → Privacy → Apple Advertising → turn off Personalised Ads{"\n"}
          • Android: Settings → Google → Ads → Opt out of Ads Personalisation
        </Section>

        <Section title="Children's Privacy" colors={colors}>
          FoodSwipe is not directed at children under 13. We do not knowingly collect personal
          information from children under 13.
        </Section>

        <Section title="Your Rights" colors={colors}>
          Since we do not collect or store personal data on our servers, there is no data to access,
          correct, or delete from our end. All locally stored data can be removed by uninstalling
          the app.
        </Section>

        <Section title="Changes to This Policy" colors={colors}>
          We may update this privacy policy from time to time. Changes will be reflected by updating
          the "Last updated" date above.
        </Section>

        <Section title="Contact Us" colors={colors}>
          If you have questions about this privacy policy, contact us at:{"\n"}
          <Bold>{CONTACT_EMAIL}</Bold>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{children}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 4 },
  updated: { fontSize: 13, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 24 },
  bold: { fontWeight: "700" },
});
