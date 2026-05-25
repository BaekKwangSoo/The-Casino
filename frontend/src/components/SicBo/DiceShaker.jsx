import React, { useEffect, useRef, useState } from 'react';
import { DiceCanvasFront, DiceCanvasTop } from './DiceCanvas3D';
import './DiceShaker.css';

const rnd = () => Math.ceil(Math.random() * 6);

export default function DiceShaker({ dice, phase }) {
  const [thudding,    setThudding]    = useState(false);
  const [animState,   setAnimState]   = useState('idle');
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
      setThudding(true);
      timerRef.current = setTimeout(() => setThudding(false), 1800);

      setAnimState('rolling');

    } else if (phase === 'result' && dice.every(Boolean)) {
      setDisplayDice(dice);
      setAnimState('settling');
      timerRef.current = setTimeout(() => setAnimState('done'), 1400);

    } else if (phase === 'betting') {
      setAnimState('idle');
      setThudding(false);
      setDisplayDice([rnd(), rnd(), rnd()]);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timerRef.current);
    };
  }, [phase, dice]);

  return (
    <div className="ds-wrap">

      {/* ══ 정면 ══ */}
      <div className="ds-panel">
        <div className="ds-title">정 면</div>

        <div className={`ds-front-scene ${thudding ? 'scene-vibrate' : ''}`}>
          <div className="glass-cap"/>

          <div className="glass-body">
            <div className="glass-shine"/>
            <div className="glass-shine glass-shine-r"/>
            <DiceCanvasFront dice={displayDice} animState={animState} />
          </div>

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
            <DiceCanvasTop dice={displayDice} animState={animState} />
          </div>
        </div>
      </div>

    </div>
  );
}
