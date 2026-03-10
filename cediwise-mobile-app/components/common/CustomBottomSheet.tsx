import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet, Separator } from "heroui-native";
import { ScrollView } from 'react-native-gesture-handler'
import { Dimensions, StyleSheet, Text, View } from "react-native";

type CustomBottomSheetProps = {
  title: string;
  description?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerComponent?: React.ReactNode;
  children: React.ReactNode;
};

export function CustomBottomSheet({
  title,
  description,
  isOpen: controlledIsOpen,
  onOpenChange,
  triggerComponent,
  children,
}: CustomBottomSheetProps) {
  const isControlled = controlledIsOpen !== undefined;

  // Max height of the bottom sheet should be 80% of the screen height
  const screenHeight = Dimensions.get("window").height;
  const maxHeight = screenHeight * 0.8;

  return (
    <BottomSheet
      {...(isControlled
        ? { isOpen: controlledIsOpen, onOpenChange }
        : { isDefaultOpen: false, onOpenChange })}
    >
      {triggerComponent != null ? (
        <BottomSheet.Trigger asChild>{triggerComponent}</BottomSheet.Trigger>
      ) : null}
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          detached={false}
          backgroundClassName={`rounded-t-[50px] bg-slate-900`}
          //   containerClassName="max-h-[80%]"
          // handleClassName="max-h-[80%]"
          contentContainerClassName={`max-h-[700px] flex-1`}
          //   style={{ maxHeight: maxHeight }}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <BottomSheet.Title>
                <Text style={styles.titleText}>{title}</Text>
              </BottomSheet.Title>
              {description ? (
                <BottomSheet.Description>
                  <Text style={styles.descriptionText}>{description}</Text>
                </BottomSheet.Description>
              ) : null}
            </View>
            <BottomSheet.Close iconProps={{ size: 18, color: "#94a3b8" }} />
          </View>
          <Separator />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  titleRow: {
    flex: 1,
  },
  titleText: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 25,
    flex: 1,
  },
});
