type LogoVariant = "light" | "dark";

/**
 * SalesCard wordmark, LinkedIn-style: "Sales" + a rounded box around "Card".
 * Size is controlled by the parent/`className` font-size (the box scales in em).
 * variant="dark" inverts it for dark backgrounds (white text, white box).
 */
export function Logo({
  variant = "light",
  className,
}: {
  variant?: LogoVariant;
  className?: string;
}) {
  const wordColor = variant === "dark" ? "#FFFFFF" : "#0A66C2";
  const boxBg = variant === "dark" ? "#FFFFFF" : "#0A66C2";
  const boxText = variant === "dark" ? "#0A66C2" : "#FFFFFF";
  return (
    <span
      className={`inline-flex items-center font-extrabold tracking-tight leading-none ${className ?? ""}`}
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      <span style={{ color: wordColor }}>Sales</span>
      <span
        style={{
          background: boxBg,
          color: boxText,
          fontSize: "0.86em",
          borderRadius: "0.2em",
          padding: "0.11em 0.24em 0.13em",
          marginLeft: "0.07em",
        }}
      >
        Card
      </span>
    </span>
  );
}
