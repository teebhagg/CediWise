import { Toast, ToastComponentProps, useToast } from "heroui-native";
import { CheckCircle2, Info, XCircle } from "lucide-react-native";
import { View } from "react-native";

/**
 * Consistent toast helpers matching the budget sync toast format.
 * Use for success, error, and info messages. All toasts appear at top.
 */
export function useAppToast() {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast.show({
      component: (props: ToastComponentProps) => (
        <Toast
          variant="success"
          placement="top"
          {...props}
          className="flex flex-row p-1 rounded-md gap-4 items-center"
        >
          <CheckCircle2 size={20} color="white" className="my-auto" />
          <View className="flex-1">
            <Toast.Title className="text-sm font-medium">{title}</Toast.Title>
            {description ? (
              <Toast.Description className="text-muted-foreground text-xs">
                {description}
              </Toast.Description>
            ) : null}
          </View>
        </Toast>
      ),
    });
  };

  const showError = (title: string, description?: string) => {
    toast.show({
      component: (props: ToastComponentProps) => (
        <Toast
          variant="danger"
          placement="top"
          {...props}
          className="flex flex-row p-1 rounded-md gap-4 items-center"
        >
          <XCircle size={20} color="white" className="my-auto" />
          <View className="flex-1">
            <Toast.Title className="text-sm font-medium">{title}</Toast.Title>
            {description ? (
              <Toast.Description className="text-muted-foreground text-xs">
                {description}
              </Toast.Description>
            ) : null}
          </View>
          <Toast.Close />
        </Toast>
      ),
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast.show({
      component: (props: ToastComponentProps) => (
        <Toast
          variant="warning"
          placement="top"
          {...props}
          className="flex flex-row p-1 rounded-md gap-4 items-center"
        >
          <Info size={20} color="white" className="my-auto" />
          <View className="flex-1">
            <Toast.Title className="text-sm font-medium">{title}</Toast.Title>
            {description ? (
              <Toast.Description className="text-muted-foreground text-xs">
                {description}
              </Toast.Description>
            ) : null}
          </View>
          <Toast.Close />
        </Toast>
      ),
    });
  };

  return { showSuccess, showError, showInfo };
}
