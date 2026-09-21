import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlyphSigil } from "./GlyphSigil";
import { axe } from "@/test/axe";

describe("GlyphSigil", () => {
  it("renders nothing when there is no glyph and not loading", () => {
    const { container } = render(<GlyphSigil />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an accessible loading state while channelling", () => {
    render(<GlyphSigil loading />);
    const fig = screen.getByLabelText(/channelling glyph sigil/i);
    expect(fig).toHaveAttribute("aria-busy", "true");
    expect(fig).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/channelling glyph sigil/i)).toHaveClass("sr-only");
  });

  it("labels the rendered sigil with glyph and theme", () => {
    render(<GlyphSigil glyph="✦⟁" theme="Harmony" />);
    const fig = screen.getByRole("img", {
      name: /glyph sigil ✦⟁, theme harmony/i,
    });
    expect(fig).toBeInTheDocument();
    expect(fig.tagName.toLowerCase()).toBe("figure");
  });

  it("omits the theme from the label when not provided", () => {
    render(<GlyphSigil glyph="✦" />);
    expect(
      screen.getByRole("img", { name: "Glyph sigil ✦" }),
    ).toBeInTheDocument();
  });

  it("prefers the resolved sigil over the loading placeholder once glyph exists", () => {
    render(<GlyphSigil glyph="✦" loading />);
    expect(
      screen.queryByLabelText(/channelling glyph sigil/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /glyph sigil ✦/i })).toBeInTheDocument();
  });

  it("has no axe violations in the loading state", async () => {
    const { container } = render(<GlyphSigil loading />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations when rendering a sigil", async () => {
    const { container } = render(<GlyphSigil glyph="✦⟁" theme="Harmony" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
