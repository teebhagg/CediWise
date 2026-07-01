import { categoryListContentStyle } from "../categoryListLayout";

describe("categoryListContentStyle", () => {
  it("centers empty lists in the viewport", () => {
    const style = categoryListContentStyle({ itemCount: 0, headerOffsetTop: 120 });
    expect(style.flexGrow).toBe(1);
    expect(style.justifyContent).toBe("center");
  });

  it("uses stable padding for non-empty lists", () => {
    const short = categoryListContentStyle({ itemCount: 2, headerOffsetTop: 120 });
    const long = categoryListContentStyle({ itemCount: 12, headerOffsetTop: 120 });
    expect(short.paddingTop).toBe(long.paddingTop);
    expect(short.flexGrow).toBeUndefined();
    expect(long.flexGrow).toBeUndefined();
    expect(short.paddingBottom).toBe(100);
  });
});
