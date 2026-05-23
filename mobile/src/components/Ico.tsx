import React from 'react';
import Svg, { Path, Circle, Rect, Line, G, Text as SvgText, Polyline } from 'react-native-svg';

interface IcoProps {
  name: string;
  size?: number;
  c?: string;
  sw?: number;
}

export default function Ico({ name, size = 20, c = 'currentColor', sw = 1.7 }: IcoProps) {
  const props = {
    fill: 'none',
    stroke: c,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const wrap = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {children}
    </Svg>
  );

  switch (name) {
    case 'sparkle': return wrap(<>
      <Path d="M10 2v4M10 14v4M2 10h4M14 10h4M5 5l2.5 2.5M12.5 12.5L15 15M5 15l2.5-2.5M12.5 7.5L15 5" {...props} />
    </>);
    case 'pin': return wrap(<>
      <Path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z" {...props} />
      <Circle cx="10" cy="8" r="2" {...props} />
    </>);
    case 'compass': return wrap(<>
      <Circle cx="10" cy="10" r="7.5" {...props} />
      <Path d="M13.5 6.5l-2 4.5-4.5 2 2-4.5z" {...props} />
    </>);
    case 'clock': return wrap(<>
      <Circle cx="10" cy="10" r="7.5" {...props} />
      <Path d="M10 5.5v4.5l3 2" {...props} />
    </>);
    case 'walk': return wrap(<>
      <Circle cx="11" cy="3.5" r="1.4" {...props} />
      <Path d="M9 18l1.5-5L9 11l-2 1.5M11 13l2 1 1 4M7.5 9l3-2 2.5 1.5" {...props} />
    </>);
    case 'train': return wrap(<>
      <Rect x="5" y="3" width="10" height="11" rx="3" {...props} />
      <Path d="M5 9h10M7.5 17l-1.5 1M12.5 17l1.5 1" {...props} />
      <Circle cx="7.5" cy="12" r="0.5" fill={c} />
      <Circle cx="12.5" cy="12" r="0.5" fill={c} />
    </>);
    case 'taxi': return wrap(<>
      <Path d="M3 12l1.5-4a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L17 12M3 12h14v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" {...props} />
      <Circle cx="6" cy="13.5" r="0.7" fill={c} />
      <Circle cx="14" cy="13.5" r="0.7" fill={c} />
    </>);
    case 'bike': return wrap(<>
      <Circle cx="5" cy="13.5" r="3" {...props} />
      <Circle cx="15" cy="13.5" r="3" {...props} />
      <Path d="M5 13.5l4-6h4l2 6M9 7.5L10.5 4h2" {...props} />
    </>);
    case 'chat': return wrap(<>
      <Path d="M3 9a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6H7l-4 3v-3a6 6 0 0 1 0-6z" {...props} />
    </>);
    case 'mic': return wrap(<>
      <Rect x="7.5" y="2.5" width="5" height="9" rx="2.5" {...props} />
      <Path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3" {...props} />
    </>);
    case 'heart': return wrap(<>
      <Path d="M10 17S3 12.5 3 7.5A4 4 0 0 1 10 5a4 4 0 0 1 7 2.5C17 12.5 10 17 10 17z" {...props} />
    </>);
    case 'share': return wrap(<>
      <Circle cx="5" cy="10" r="2" {...props} />
      <Circle cx="15" cy="5" r="2" {...props} />
      <Circle cx="15" cy="15" r="2" {...props} />
      <Path d="M7 9l6-3M7 11l6 3" {...props} />
    </>);
    case 'plus': return wrap(<><Path d="M10 4v12M4 10h12" {...props} /></>);
    case 'minus': return wrap(<><Path d="M4 10h12" {...props} /></>);
    case 'arrow': return wrap(<><Path d="M4 10h12M11 5l5 5-5 5" {...props} /></>);
    case 'arrowLeft': return wrap(<><Path d="M16 10H4M9 5l-5 5 5 5" {...props} /></>);
    case 'arrowUp': return wrap(<><Path d="M10 16V4M5 9l5-5 5 5" {...props} /></>);
    case 'check': return wrap(<><Path d="M4 10.5l3.5 3.5 8.5-9" {...props} /></>);
    case 'close': return wrap(<><Path d="M5 5l10 10M15 5L5 15" {...props} /></>);
    case 'sun': return wrap(<>
      <Circle cx="10" cy="10" r="3.5" {...props} />
      <Path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.5 1.5M14 14l1.5 1.5M4.5 15.5L6 14M14 6l1.5-1.5" {...props} />
    </>);
    case 'cloud': return wrap(<>
      <Path d="M6 14a3.5 3.5 0 0 1-.5-7 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 14 14z" {...props} />
    </>);
    case 'rain': return wrap(<>
      <Path d="M6 11a3.5 3.5 0 0 1-.5-7 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 14 11M7 14l-1 2M10 14l-1 2M13 14l-1 2" {...props} />
    </>);
    case 'route': return wrap(<>
      <Circle cx="5" cy="5" r="2" {...props} />
      <Circle cx="15" cy="15" r="2" {...props} />
      <Path d="M5 7v3a3 3 0 0 0 3 3h1a3 3 0 0 1 3 3" {...props} />
    </>);
    case 'layers': return wrap(<>
      <Path d="M10 3l7 4-7 4-7-4 7-4zM3 11l7 4 7-4M3 14.5l7 4 7-4" {...props} />
    </>);
    case 'map': return wrap(<>
      <Path d="M2 5.5l5-2 6 2 5-2v11l-5 2-6-2-5 2v-11z" {...props} />
      <Path d="M7 3.5v13M13 5.5v13" {...props} />
      <Circle cx="10" cy="9.5" r="1.4" fill={c} stroke="none" />
    </>);
    case 'globe': return wrap(<>
      <Circle cx="10" cy="10" r="7.5" {...props} />
      <Path d="M2.5 10h15M10 2.5c2.5 2 2.5 13 0 15M10 2.5c-2.5 2-2.5 13 0 15" {...props} />
    </>);
    case 'settings': return wrap(<>
      <Circle cx="10" cy="10" r="2.5" {...props} />
      <Path d="M10 1.5v2M10 16.5v2M3.5 6L5 7M15 13l1.5 1M1.5 10h2M16.5 10h2M3.5 14L5 13M15 7l1.5-1" {...props} />
    </>);
    case 'user': return wrap(<>
      <Circle cx="10" cy="7" r="3" {...props} />
      <Path d="M3 17a7 7 0 0 1 14 0" {...props} />
    </>);
    case 'star': return wrap(<>
      <Path d="M10 2.5l2.4 5 5.4.8-3.9 3.8 1 5.4L10 14.9l-4.9 2.6 1-5.4-3.9-3.8 5.4-.8z" {...props} />
    </>);
    case 'flame': return wrap(<>
      <Path d="M10 18c3.5 0 6-2.5 6-6 0-3-2-4.5-3-7-1 2-2 2.5-3 4-1-1-1.5-2-1.5-3.5-2 1.5-4.5 4-4.5 6.5 0 3.5 2.5 6 6 6z" {...props} />
    </>);
    case 'mail': return wrap(<>
      <Rect x="2.5" y="4" width="15" height="12" rx="2" {...props} />
      <Path d="M3 6l7 5 7-5" {...props} />
    </>);
    case 'apple': return wrap(<>
      <Path d="M14 11c0 2.5 2 3.5 2 3.5-1.5 3-3 4-4 4-1 0-1.5-.5-2.5-.5s-2 .5-3 .5c-2 0-4-2.5-4-6 0-3.5 2.5-5.5 4.5-5.5 1 0 2 .5 2.5.5s2-1 4-1c1.5 0 3 1 3.5 2-2 1-3 2.5-3 2.5zM12 4.5c0-1.5 1-3 2.5-3 0 1.5-1.5 3-2.5 3z" fill={c} stroke="none" />
    </>);
    default: return wrap(<Circle cx="10" cy="10" r="6" {...props} />);
  }
}
