import React, { useState } from 'react';
import './SicBoTableLayout.css';

/* ── 칩 정의 ─────────────────────────────────────── */
const CHIP_DEFS = [
  { value: 100,   bg: '#f0ede0', border: '#999', text: '#333', label: '100'  },
  { value: 500,   bg: '#dc3545', border: '#a71d2a', text: '#fff', label: '500'  },
  { value: 1000,  bg: '#1565c0', border: '#0d47a1', text: '#fff', label: '1K'   },
  { value: 5000,  bg: '#6a1b9a', border: '#4a148c', text: '#fff', label: '5K'   },
  { value: 10000, bg: '#e65100', border: '#bf360c', text: '#fff', label: '10K'  },
  { value: 50000, bg: '#1b5e20', border: '#388e3c', text: '#fff', label: '50K'  },
];

const SUM_PAYOUTS = {
  4:50, 5:30, 6:18, 7:12, 8:8, 9:6,
  10:6, 11:6, 12:6, 13:8, 14:12, 15:18, 16:30, 17:50,
};

const DOMINOS = [
  [1,2],[1,3],[1,4],[1,5],[1,6],
  [2,3],[2,4],[2,5],[2,6],
  [3,4],[3,5],[3,6],
  [4,5],[4,6],[5,6],
];

/* ── 주사위 SVG ──────────────────────────────────── */
const DOT_POS = {
  1: [[50,50]],
  2: [[28,28],[72,72]],
  3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]],
  5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};

function Die({ value, size = 20, bg = '#fff', dot = '#111' }) {
  const dots = value ? (DOT_POS[value] || []) : [];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display:'inline-block', flexShrink:0 }}>
      <rect x="5" y="5" width="90" height="90" rx="15" fill={bg} stroke="rgba(0,0,0,0.18)" strokeWidth="3"/>
      {dots.map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="9" fill={dot}/>)}
    </svg>
  );
}

/* ── 베팅 구역 ───────────────────────────────────── */
function BetZone({ betKey, children, className='', myBets=[], otherBets={ count:0, total:0 }, canBet, selectedChip, onPlace, onCancel }) {
  const [dragOver, setDragOver] = useState(false);
  const myTotal = myBets.reduce((s,b) => s+b.amount, 0);
  const { count: otherCount, total: otherTotal } = otherBets;

  const fmt = (n) => n >= 10000
    ? (n/10000 % 1 === 0 ? n/10000+'만' : (n/10000).toFixed(1)+'만')
    : n.toLocaleString();

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    try { const { value } = JSON.parse(e.dataTransfer.getData('chip')); onPlace(value); } catch {}
  };

  const handleClick = () => {
    if (!canBet) return;
    if (selectedChip) {
      onPlace(selectedChip);
    } else if (myTotal > 0) {
      // 칩 미선택 상태에서 내 베팅이 있는 칸 클릭 → 취소
      onCancel();
    }
  };

  const isCancelable = canBet && !selectedChip && myTotal > 0;

  return (
    <div
      className={[
        'bz', className,
        dragOver ? 'bz-over' : '',
        myTotal > 0 ? 'bz-has-bet' : '',
        canBet && selectedChip ? 'bz-ready' : '',
        isCancelable ? 'bz-cancelable' : '',
      ].join(' ')}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      title={isCancelable ? '클릭하면 베팅 취소' : undefined}
    >
      {children}
      {otherCount > 0 && (
        <div className="bz-others">
          👥{otherCount}명 · ₩{fmt(otherTotal)}
        </div>
      )}
      {myTotal > 0 && (
        <div className={`bz-mine ${isCancelable ? 'bz-mine-cancel' : ''}`}>
          {isCancelable && <span className="bz-cancel-x">✕ </span>}
          ₩{fmt(myTotal)}
        </div>
      )}
    </div>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────── */
export default function SicBoTableLayout({ phase, currentBets=[], onBet, onCancelBet, balance, playerBets={} }) {
  const [selectedChip, setSelectedChip] = useState(null);
  const canBet = phase === 'betting';

  /* 내 베팅을 betType 기준으로 그룹 */
  const myByKey = {};
  currentBets.forEach(b => {
    if (!myByKey[b.betType]) myByKey[b.betType] = [];
    myByKey[b.betType].push(b);
  });

  /* BetZone에 넘길 공통 props 생성 */
  const zp = (betType, betValue=null) => {
    const myBetsList = myByKey[betType] || [];
    const myTotal    = myBetsList.reduce((s,b) => s+b.amount, 0);
    const agg        = playerBets[betType] || { count: 0, total: 0 };
    const otherBets  = {
      count: Math.max(0, agg.count - (myBetsList.length > 0 ? 1 : 0)),
      total: Math.max(0, agg.total - myTotal),
    };
    return {
      betKey: betType,
      myBets: myBetsList,
      otherBets,
      canBet,
      selectedChip,
      onPlace:  (amount) => { if (!canBet) return; onBet(betType, betValue, amount); },
      onCancel: () => { if (canBet && onCancelBet) onCancelBet(betType); },
    };
  };

  return (
    <div className="sbt-root">

      {/* ── 칩 트레이 ── */}
      <div className="chip-tray">
        <span className="ct-label">칩 선택</span>
        <div className="ct-chips">
          {CHIP_DEFS.map(c => (
            <div
              key={c.value}
              className={`chip ${selectedChip===c.value ? 'chip-sel' : ''}`}
              style={{ '--cb':c.bg, '--cs':c.border, '--ct':c.text }}
              draggable
              onClick={() => setSelectedChip(selectedChip===c.value ? null : c.value)}
              onDragStart={e => e.dataTransfer.setData('chip', JSON.stringify({ value:c.value }))}
            >
              <span className="chip-lbl">{c.label}</span>
            </div>
          ))}
        </div>
        <span className={`ct-hint ${selectedChip ? '' : 'ct-hint-dim'}`}>
          {selectedChip
            ? `₩${selectedChip.toLocaleString()} 선택됨 — 칸을 클릭하거나 드래그`
            : '칩을 선택하세요'}
        </span>
      </div>

      {/* ── 카지노 테이블 ── */}
      <div className="casino-table">

        <div className="table-header">
          <span className="th-deco">⚄ ⚅ ⚃</span>
          <span className="th-title">SICBO · 大小</span>
          <span className="th-deco">⚂ ⚁ ⚀</span>
        </div>

        {/* ROW 1 — 트리플 / Any Triple / 더블 */}
        <div className="t-row">
          {/* 특정 트리플 ×150 */}
          <div className="t-group">
            <div className="t-group-label">트리플 ×150</div>
            <div className="t-group-cells">
              {[1,2,3,4,5,6].map(n => (
                <BetZone key={n} className="bz-triple" {...zp(`triple_${n}`, n)}>
                  <div className="ds"><Die value={n} size={13}/><Die value={n} size={13}/><Die value={n} size={13}/></div>
                  <div className="bz-pay">×150</div>
                </BetZone>
              ))}
            </div>
          </div>

          {/* Any Triple ×24 */}
          <BetZone className="bz-any-triple" {...zp('triple_any')}>
            <div className="bz-big-txt">ANY</div>
            <div className="bz-big-txt">TRIPLE</div>
            <div className="bz-pay">×24</div>
          </BetZone>

          {/* 더블(페어) ×8 */}
          <div className="t-group">
            <div className="t-group-label">더블 ×8</div>
            <div className="t-group-cells">
              {[1,2,3,4,5,6].map(n => (
                <BetZone key={n} className="bz-double" {...zp(`double_${n}`, n)}>
                  <div className="ds"><Die value={n} size={13}/><Die value={n} size={13}/></div>
                  <div className="bz-pay">×8</div>
                </BetZone>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2 — 大 BIG / 小 SMALL */}
        <div className="t-row">
          <BetZone className="bz-big" {...zp('big')}>
            <div className="bz-kanji">大</div>
            <div className="bz-en">BIG</div>
            <div className="bz-range">11 ~ 17</div>
            <div className="bz-pay">×1</div>
          </BetZone>
          <BetZone className="bz-small" {...zp('small')}>
            <div className="bz-kanji">小</div>
            <div className="bz-en">SMALL</div>
            <div className="bz-range">4 ~ 10</div>
            <div className="bz-pay">×1</div>
          </BetZone>
        </div>

        {/* ROW 3 — 합계 4~17 */}
        <div className="t-row row-sums">
          {[4,5,6,7,8,9,10,11,12,13,14,15,16,17].map(s => (
            <BetZone key={s} className={`bz-sum ${s<=10?'sum-lo':'sum-hi'}`} {...zp(`sum_${s}`, s)}>
              <div className="sum-n">{s}</div>
              <div className="bz-pay">×{SUM_PAYOUTS[s]}</div>
            </BetZone>
          ))}
        </div>

        {/* ROW 4 — 도미노 ×5 */}
        <div className="t-row row-dom">
          <div className="dom-label">도미노 ×5</div>
          <div className="dom-cells">
            {DOMINOS.map(([a,b]) => (
              <BetZone key={`${a}_${b}`} className="bz-domino" {...zp(`domino_${a}_${b}`)}>
                <div className="ds"><Die value={a} size={12}/><Die value={b} size={12}/></div>
                <div className="bz-pay">×5</div>
              </BetZone>
            ))}
          </div>
        </div>

        {/* ROW 5 — 단일숫자(6,5,4) + EVEN + ODD + 단일숫자(3,2,1) */}
        <div className="t-row row-bottom">
          {[6,5,4].map(n => (
            <BetZone key={n} className="bz-single" {...zp(`single_${n}`, n)}>
              <Die value={n} size={34}/>
              <div className="bz-pay">×1~3</div>
            </BetZone>
          ))}
          <BetZone className="bz-even" {...zp('even')}>
            <div className="bz-kanji-sm">偶</div>
            <div className="bz-en">EVEN</div>
            <div className="bz-pay">×1</div>
          </BetZone>
          <BetZone className="bz-odd" {...zp('odd')}>
            <div className="bz-kanji-sm">奇</div>
            <div className="bz-en">ODD</div>
            <div className="bz-pay">×1</div>
          </BetZone>
          {[3,2,1].map(n => (
            <BetZone key={n} className="bz-single" {...zp(`single_${n}`, n)}>
              <Die value={n} size={34}/>
              <div className="bz-pay">×1~3</div>
            </BetZone>
          ))}
        </div>

      </div>{/* /casino-table */}
    </div>
  );
}
