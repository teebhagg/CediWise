import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

type VideoSlideProps = {
  source: number;
  isActive: boolean;
};

function isReadyToPlayStatus(payload: unknown): boolean {
  if (typeof payload === "string") {
    return payload === "readyToPlay";
  }

  if (payload && typeof payload === "object" && "status" in payload) {
    return (payload as { status?: string }).status === "readyToPlay";
  }

  return false;
}

export function VideoSlide({ source, isActive }: VideoSlideProps) {
  const [isReady, setIsReady] = useState(false);
  const hasHandledReadyRef = useRef(false);

  // Use a ref so the status listener always reads the latest isActive
  // without needing to be re-registered on every slide change
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = true;
  });

  // Register status listeners exactly ONCE per player instance.
  // isActive is read via ref to avoid tearing down/re-creating subscriptions
  // on every carousel navigation, which creates a window where events can be missed.
  useEffect(() => {
    hasHandledReadyRef.current = false;
    setIsReady(false);

    const handleReady = () => {
      // statusChange can emit ready events multiple times; process once.
      if (hasHandledReadyRef.current) return;
      hasHandledReadyRef.current = true;
      setIsReady(true);
      if (isActiveRef.current) {
        player.currentTime = 0;
        player.play();
      } else {
        // Pre-buffer at position 0 so it starts instantly when focused
        player.currentTime = 0;
        player.pause();
      }
    };

    // Catch case where video was already ready before this effect ran
    if (isReadyToPlayStatus(player.status)) {
      handleReady();
    }

    const statusSub = player.addListener("statusChange", (statusPayload) => {
      if (isReadyToPlayStatus(statusPayload)) {
        handleReady();
      }
    });

    return () => {
      statusSub.remove();
    };
  }, [player]); // Only re-subscribe when the player itself changes

  // Play/pause on focus changes. Only seek when becoming active to avoid flicker loops.
  useEffect(() => {
    if (!isReady) return;

    if (isActive) {
      player.currentTime = 0;
      player.play();
      return;
    }

    player.pause();
  }, [isActive, isReady, player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
      />
      {!isReady && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  video: {
    flex: 1,
    borderRadius: 16,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});
