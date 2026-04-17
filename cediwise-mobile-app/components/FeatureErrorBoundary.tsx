import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { reportError, type ReportErrorContext } from "@/utils/telemetry";

type Props = {
  children: React.ReactNode;
  /** Sentry / `reportError` feature tag (e.g. `literacy`, `budget`, `vault`, `sme`). */
  feature: ReportErrorContext["feature"];
  /** Short heading shown in the fallback UI. */
  title?: string;
  /** One line of context under the title. */
  description?: string;
};

type State = { hasError: boolean; error: Error | null };

/**
 * Isolates subtree failures: shows in-app recovery UI and reports to Sentry with a `feature` tag.
 * Aligns visually with `RootErrorBoundary` (dark shell, emerald retry).
 */
export class FeatureErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, {
      feature: this.props.feature,
      operation: "feature_error_boundary",
      extra: {
        componentStack: errorInfo.componentStack ?? "",
      },
    });
    if (__DEV__) {
      console.error(
        `[FeatureErrorBoundary:${this.props.feature}]`,
        error,
        errorInfo.componentStack,
      );
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const title = this.props.title ?? "Something went wrong";
      const description =
        this.props.description ??
        "This section hit an unexpected error. You can try again or go back.";

      return (
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message} selectable>
            {this.state.error.message}
          </Text>
          <Text style={styles.hint}>{description}</Text>
          {__DEV__ && this.state.error.stack ? (
            <Text style={styles.stack} selectable>
              {this.state.error.stack}
            </Text>
          ) : null}
          <Pressable
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
  hint: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
    maxWidth: 320,
  },
  stack: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 16,
    textAlign: "left",
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#10b981",
    borderRadius: 9999,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: "#020617",
    fontSize: 16,
    fontWeight: "600",
  },
});
