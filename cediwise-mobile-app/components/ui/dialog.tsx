import { Dialog } from 'heroui-native';
import { GlassView } from '../GlassView';
import { Platform, StyleSheet, View } from 'react-native';

type DialogProps = {
    visible: boolean;
    onChange: (open: boolean) => void;
    children: React.ReactNode;
};

type CustomDialogTriggerProps = {
    children: React.ReactNode;
};

// Custom Dialog Trigger Component
export function CustomDialogTrigger({ children }: CustomDialogTriggerProps) {
    return (
        <Dialog.Trigger asChild>
            {children}
        </Dialog.Trigger>
    );
};

export function CustomDialog({ visible, onChange, children }: DialogProps) {
    return (
        <Dialog isOpen={visible} onOpenChange={onChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="bg-transparent" />
                {Platform.OS === "ios" ? (
                    <GlassView
                        intensity={40}
                        tint="dark"
                        className="absolute inset-0"
                        onTouchEnd={() => onChange(false)}
                    />
                ) : (
                    <View
                        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.8)" }]}
                        onTouchEnd={() => onChange(false)}
                    />
                )}
                <Dialog.Content>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    );
};