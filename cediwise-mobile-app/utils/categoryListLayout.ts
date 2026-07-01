/** FlashList content padding — stable across filter changes to avoid layout jumps. */
export function categoryListContentStyle(params: {
  itemCount: number;
  headerOffsetTop: number;
}): {
  paddingTop: number;
  paddingBottom: number;
  flexGrow?: number;
  justifyContent?: "flex-start" | "center";
} {
  const { itemCount, headerOffsetTop } = params;
  const baseTop = headerOffsetTop + 8;
  const baseBottom = 100;

  if (itemCount === 0) {
    return {
      paddingTop: baseTop,
      paddingBottom: baseBottom,
      flexGrow: 1,
      justifyContent: "center",
    };
  }

  return {
    paddingTop: baseTop,
    paddingBottom: baseBottom,
  };
}
