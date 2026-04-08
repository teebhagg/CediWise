import { Button, Dialog, ScrollShadow } from "heroui-native";
import { AlertTriangle } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type MandatoryUpdateModalProps = {
  visible: boolean;
  onUpdatePress: () => void;
  releaseNotes?: string | null;
};

export function MandatoryUpdateModal({
  visible,
  onUpdatePress,
  releaseNotes,
}: MandatoryUpdateModalProps) {
  return (
    <Dialog isOpen={visible} onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/75" />
        <View style={styles.container}>
          <Dialog.Content className="max-w-[360px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0">
            <ScrollShadow color="#121621" LinearGradientComponent={LinearGradient}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.content}>
                  <View style={styles.header}>
                    <View style={styles.iconWrap}>
                      <AlertTriangle size={20} color="#facc15" />
                    </View>
                    <Text style={styles.title}>Update required</Text>
                  </View>

                  <Text style={styles.description}>
                    A newer version of CediWise is required to continue. Please update from
                    the App Store.
                  </Text>

                  {releaseNotes ? (
                    <View style={styles.notesWrap}>
                      <Text style={styles.notesLabel}>What is new</Text>
                      <Text style={styles.notesText}>{releaseNotes}</Text>
                    </View>
                  ) : null}

                  <Button
                    variant="primary"
                    size="md"
                    onPress={onUpdatePress}
                    className="w-full h-12 rounded-xl bg-emerald-500"
                  >
                    <Button.Label className="text-slate-950 font-semibold">
                      Update now
                    </Button.Label>
                  </Button>
                </View>
              </ScrollView>
            </ScrollShadow>
          </Dialog.Content>
        </View>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  content: {
    padding: 24,
    paddingTop: 28,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250,204,21,0.14)",
  },
  title: {
    fontSize: 20,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    flexShrink: 1,
  },
  description: {
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    lineHeight: 22,
    textAlign: "left",
  },
  notesWrap: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(30,41,59,0.65)",
    borderWidth: 1,
    borderColor: "rgba(71,85,105,0.45)",
  },
  notesLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Medium",
    color: "#cbd5e1",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#e2e8f0",
    lineHeight: 20,
  },
});
