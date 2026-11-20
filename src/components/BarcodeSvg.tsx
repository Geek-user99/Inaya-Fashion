import React from 'react';

// Deterministic Code39-inspired clean vector barcode for shipping stickers (zero external deps)
const CODE39_MAP: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

export const BarcodeSvg: React.FC<{ value: string; height?: number }> = ({
  value,
  height = 48,
}) => {
  const normalized = `*${value.toUpperCase().replace(/[^0-9A-Z\-. ]/g, '-')}*`;
  const bars: Array<{ x: number; w: number; black: boolean }> = [];
  let cursor = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const pattern = CODE39_MAP[normalized[i]] || CODE39_MAP['-'];
    for (let j = 0; j < pattern.length; j += 1) {
      const w = pattern[j] === 'w' ? 3 : 1.2;
      const black = j % 2 === 0;
      bars.push({ x: cursor, w, black });
      cursor += w;
    }
    cursor += 1.5; // inter-character narrow space
  }

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        viewBox={`0 0 ${cursor} ${height}`}
        className="w-full max-w-[240px]"
        style={{ height }}
        role="img"
        aria-label={`Barcode for ${value}`}
      >
        <rect x="0" y="0" width={cursor} height={height} fill="#ffffff" />
        {bars
          .filter((b) => b.black)
          .map((b, idx) => (
            <rect key={idx} x={b.x} y={0} width={b.w} height={height} fill="#000000" />
          ))}
      </svg>
      <span className="font-mono-tabular text-[11px] tracking-[0.22em] text-black mt-1 font-medium">
        {value}
      </span>
    </div>
  );
};
