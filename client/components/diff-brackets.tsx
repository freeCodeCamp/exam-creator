import { LabelProps } from "recharts";

type BracketLayerProps = {
  prevValue: number;
  currValue: number;
} & LabelProps;

/**
 * Custom Layer to draw the "Inverted Tree" / Difference Brackets
 * Recharts will automatically pass xAxis, yAxis, and data props to this.
 */
export function BracketLayer(props: BracketLayerProps) {
  const { viewBox, prevValue, currValue } = props;
  if (!viewBox) return null;

  // @ts-expect-error Types can be difficult
  const { x, y, width } = viewBox;

  // Recharts 'x' is the starting pixel of the area (center of first bar)
  // 'width' is the distance to the end of the area (center of second bar)
  const x1 = x + width / 4;
  const x2 = x + (3 * width) / 4;

  // 'y' is the top pixel based on the y1/y2 values passed to ReferenceArea
  const bracketTop = y - 30;

  const diff = currValue - prevValue;

  return (
    <g>
      <path
        d={`M ${x1},${y - 5} 
            L ${x1},${bracketTop} 
            L ${x2},${bracketTop} 
            L ${x2},${y - 5}`}
        fill="none"
        stroke="#A0AEC0"
        strokeWidth={1.5}
      />
      <text
        x={(x1 + x2) / 2}
        y={bracketTop - 2}
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill={diff < 5 ? "red" : "white"}
      >
        {diff.toFixed(1)}
      </text>
    </g>
  );
}
