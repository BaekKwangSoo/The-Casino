import React from 'react';
import './ResultHistory.css';

const DOT_POS = {
  1:[[50,50]],
  2:[[28,28],[72,72]],
  3:[[28,28],[50,50],[72,72]],
  4:[[28,28],[72,28],[28,72],[72,72]],
  5:[[28,28],[72,28],[50,50],[28,72],[72,72]],
  6:[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};

function MiniDie({ value }) {
  const dots = value ? (DOT_POS[value] || []) : [];
  return (
    <svg viewBox="0 0 100 100" width={20} height={20}>
      <rect x="4" y="4" width="92" height="92" rx="14" fill="white" stroke="#ccc" strokeWidth="2"/>
      {dots.map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="10" fill="#111"/>)}
    </svg>
  );
}

export default function ResultHistory({ history }) {
  const entries = [...history].slice(0, 10);

  return (
    <div className="rh-root">
      <div className="rh-title">결과 이력</div>
      {entries.length === 0 && (
        <div className="rh-empty">아직 결과 없음</div>
      )}
      {entries.map((h, i) => {
        const isBig = h.sum >= 11;
        const isEven = h.sum % 2 === 0;
        return (
          <div key={i} className={`rh-entry ${i === 0 ? 'rh-latest' : ''}`}>
            <div className="rh-dice">
              <MiniDie value={h.d1}/>
              <MiniDie value={h.d2}/>
              <MiniDie value={h.d3}/>
            </div>
            <div className="rh-info">
              <span className="rh-sum">{h.sum}</span>
              <span className={`rh-tag ${isBig ? 'tag-big' : 'tag-small'}`}>
                {isBig ? '大' : '小'}
              </span>
              <span className={`rh-tag ${isEven ? 'tag-even' : 'tag-odd'}`}>
                {isEven ? '偶' : '奇'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
