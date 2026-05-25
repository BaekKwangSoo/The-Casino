import React, { useEffect, useRef, useState } from 'react';
import './DiceShaker.css';

const DOT_POS = {
  1:[[50,50]],
  2:[[28,28],[72,72]],
  3:[[28,28],[50,50],[72,72]],
  4:[[28,28],[72,28],[28,72],[72,72]],
  5:[[28,28],[72,28],[50,50],[28,72],[72,72]],
  6:[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};

function Die({ value, size = 26 }) {
  const dots = value ? (DOT_POS[value] || []) : [];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <filter id="die-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.45)"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="15"
        fill="white" stroke="#e0e0e0" strokeWidth="1.5" filter="url(#die-shadow)"/>
      {dots.map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="9" fill="#111"/>)}
    </svg>
  );
}

/* 정면 위치 — 나무 바닥 기준 */
const FRONT_POS = [
  { left: '6%',  bottom: '3%' },
  { left: '38%', bottom: '3%' },
  { left: '68%', bottom: '3%' },
];

/* 위에서 본 위치 */
const TOP_POS = [
  { left: '12%', top: '16%' },
  { left: '54%', top: '12%' },
  { left: '32%', top: '52%' },
];

const rnd = () => Math.ceil(Math.random() * 6);

export default function DiceShaker({ dice, phase }) {
  const [thudding,    setThudding]    = useState(false);
  const [animState,   setAnimState]   = useState('idle'); // idle | rolling | settling
  const [displayDice, setDisplayDice] = useState([1, 2, 3]);
  const prevPhase  = useRef(phase);
  const timerRef   = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;

    clearInterval(intervalRef.current);
    clearTimeout(timerRef.current);

    if (phase === 'rolling') {
      /* ── 베팅 마감 → 굴리기 시작 ── */
      setThudding(true);
      timerRef.current = setTimeout(() => setThudding(false), 1800);

      setAnimState('rolling');
      /* 주사위 면 빠르게 바꾸기 */
      setDisplayDice([rnd(), rnd(), rnd()]);
      intervalRef.current = setInterval(() => {
        setDisplayDice([rnd(), rnd(), rnd()]);
      }, 75);

    } else if (phase === 'result' && dice.every(Boolean)) {
      /* ── 결과 도착 → 정착 애니메이션 ── */
      setDisplayDice(dice);
      setAnimState('settling');
      timerRef.current = setTimeout(() => setAnimState('done'), 1400);

    } else if (phase === 'betting') {
      /* ── 새 라운드 ── */
      setAnimState('idle');
      setThudding(false);
      setDisplayDice([rnd(), rnd(), rnd()]);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timerRef.current);
    };
  }, [phase, dice]);

  const rolling   = animState === 'rolling';
  const settling  = animState === 'settling';

  return (
    <div className="ds-wrap">

      {/* ══ 정면 ══ */}
      <div className="ds-panel">
        <div className="ds-title">정 면</div>

        <div className={`ds-front-scene ${thudding ? 'scene-vibrate' : ''}`}>
          {/* 유리 돔 캡 */}
          <div className="glass-cap"/>

          {/* 유리 실린더 */}
          <div className="glass-body">
            <div className="glass-shine"/>
            <div className="glass-shine glass-shine-r"/>

            {FRONT_POS.map((pos, i) => (
              <div
                key={i}
                className={[
                  'sd-die',
                  rolling  ? `sd-roll sd-roll-${i+1}` : '',
                  settling ? `sd-settle sd-settle-${i+1}` : '',
                ].join(' ')}
                style={{ position:'absolute', left:pos.left, bottom:pos.bottom, zIndex:2 }}
              >
                <Die value={displayDice[i]} size={24}/>
              </div>
            ))}
          </div>

          {/* 나무 받침 */}
          <div className={`wood-base ${thudding ? 'wood-thud' : ''}`}>
            <div className="wood-top"/>
            <div className="wood-body"><div className="wood-grain"/></div>
            <div className="wood-shadow"/>
          </div>
        </div>
      </div>

      {/* ══ 위에서 보기 ══ */}
      <div className="ds-panel">
        <div className="ds-title">위에서 (결과)</div>

        <div className={`ds-top-scene ${thudding ? 'scene-vibrate' : ''}`}>
          <div className={`wood-disc ${thudding ? 'disc-thud' : ''}`}>
            <div className="disc-ring disc-ring-1"/>
            <div className="disc-ring disc-ring-2"/>
            <div className="glass-ring"/>

            {TOP_POS.map((pos, i) => (
              <div
                key={i}
                className={[
                  'sd-die',
                  rolling  ? `sd-roll sd-roll-${i+1}` : '',
                  settling ? `sd-settle sd-settle-${i+1}` : '',
                ].join(' ')}
                style={{ position:'absolute', left:pos.left, top:pos.top, zIndex:3 }}
              >
                <Die value={displayDice[i]} size={36}/>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
