import { AppDialog } from '@/components/AppDialog';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  description: string;
  /** Optional icon shown next to title in header */
  icon?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  description,
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={icon}
      title={title}
      description={description}
      primaryLabel={confirmLabel}
      onPrimary={onConfirm}
      secondaryLabel={cancelLabel}
      onSecondary={onClose}
      loading={loading}
    />
  );
}
