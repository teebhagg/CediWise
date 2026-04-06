import { LinearGradient } from "expo-linear-gradient";
import { BottomSheet, ScrollShadow, Separator } from "heroui-native";
import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(keyboard => Math.max(keyboard, event.endCoordinates.height));
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        <BottomSheet.Overlay className="bg-black/65" />
        <BottomSheet.Content
          detached={false}
          backgroundClassName="rounded-t-[50px] bg-[rgba(18,22,33,0.98)]"
          //   containerClassName="max-h-[80%]"
          // handleClassName="max-h-[80%]"
          contentContainerClassName={`flex-1 ${isKeyboardVisible ? 'h-full mb-[300px]' : 'max-h-[700px]'}`}
          style={[
            isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
            // keyboardHeight > 0 && { transform: [{ translateY: keyboardHeight }], bottom: keyboardHeight }
          ]}
          bottomInset={-20}
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
          <ScrollShadow color="#121621" LinearGradientComponent={LinearGradient} className="flex-1">
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </ScrollShadow>
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
