import { Dialog } from 'heroui-native';

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
                <Dialog.Overlay />
                <Dialog.Content>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    );
};