import React, { useState } from 'react';
import './BettingTable.css';

const BET_AMOUNTS = [100, 500, 1000, 5000, 10000];

export default function BettingTable({ phase, currentBets, onBet, balance, lastDice }) {
  const [betAmount, setBetAmount] = useState(500);
  const [activeTab, setActiveTab]  = useState('main');
  const canBet = phase === 'betting';

  const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);

  const placeBet = (betType, betValue = null) => {
    if (!canBet) return;
    if (betAmount > balance) { alert('잔액이 부족합니다.'); return; }
    onBet(betType, betValue, betAmount);
  };

  return (
    <div className="betting-table">
      {/* 베팅 금액 선택 */}
      <div className="bet-amount-section card">
        <div className="bet-label">베팅 금액</div>
        <div className="amount-chips">
          {BET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              className={`chip ${betAmount === amt ? 'active' : ''}`}
              onClick={() => setBetAmount(amt)}
            >
              {amt.toLocaleString()}
            </button>
          ))}
          <input
            type="number"
            className="custom-amount"
            placeholder="직접입력"
            min="100"
            max={balance}
            step="100"
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 100)}
          />
        </div>
        {totalBet > 0 && (
          <div className="total-bet">현재 베팅: <span>{totalBet.toLocaleString()}</span></div>
        )}
      </div>

      {/* 탭 */}
      <div className="bet-tabs">
        {[
          { key: 'main',   label: '대/소/홀/짝' },
          { key: 'single', label: '단일 숫자'  },
          { key: 'sum',    label: '합계 베팅'  },
          { key: 'special',label: '트리플/더블' },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ─ 대/소/홀/짝 ─────────────────────────────── */}
      {activeTab === 'main' && (
        <div className="bet-grid main-bets card">
          {[
            { type: 'big',   label: '대 (大)', sub: '11~17',   color: 'red',   payout: '1:1' },
            { type: 'small', label: '소 (小)', sub: '4~10',    color: 'blue',  payout: '1:1' },
            { type: 'odd',   label: '홀 (奇)', sub: '홀수 합', color: 'purple',payout: '1:1' },
            { type: 'even',  label: '짝 (偶)', sub: '짝수 합', color: 'green', payout: '1:1' },
          ].map((b) => (
            <button
              key={b.type}
              className={`bet-btn big-btn ${b.color} ${!canBet ? 'disabled' : ''}`}
              onClick={() => placeBet(b.type)}
              disabled={!canBet}
            >
              <span className="bet-name">{b.label}</span>
              <span className="bet-sub">{b.sub}</span>
              <span className="bet-payout">{b.payout}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─ 단일 숫자 ────────────────────────────────── */}
      {activeTab === 'single' && (
        <div className="card" style={{ padding: '16px' }}>
          <p className="tab-desc">1~6 중 원하는 숫자가 나올 횟수에 베팅 (1개=1:1, 2개=2:1, 3개=3:1)</p>
          <div className="bet-grid single-bets">
            {[1,2,3,4,5,6].map((n) => (
              <button
                key={n}
                className={`bet-btn single-btn ${!canBet ? 'disabled' : ''}`}
                onClick={() => placeBet(`single_${n}`, n)}
                disabled={!canBet}
              >
                <span className="die-num">{n}</span>
                <span className="bet-payout">×1~3</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─ 합계 베팅 ────────────────────────────────── */}
      {activeTab === 'sum' && (
        <div className="card" style={{ padding: '16px' }}>
          <p className="tab-desc">3개 주사위 합계를 정확히 맞히세요</p>
          <div className="bet-grid sum-bets">
            {[
              { sum: 4,  payout: 50 }, { sum: 5,  payout: 20 }, { sum: 6,  payout: 14 },
              { sum: 7,  payout: 12 }, { sum: 8,  payout: 8  }, { sum: 9,  payout: 6  },
              { sum: 10, payout: 6  }, { sum: 11, payout: 6  }, { sum: 12, payout: 6  },
              { sum: 13, payout: 8  }, { sum: 14, payout: 12 }, { sum: 15, payout: 14 },
              { sum: 16, payout: 20 }, { sum: 17, payout: 50 },
            ].map(({ sum, payout }) => (
              <button
                key={sum}
                className={`bet-btn sum-btn ${!canBet ? 'disabled' : ''} ${sum >= 11 ? 'high' : 'low'}`}
                onClick={() => placeBet(`sum_${sum}`, sum)}
                disabled={!canBet}
              >
                <span className="sum-num">{sum}</span>
                <span className="bet-payout">×{payout}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─ 트리플/더블 ──────────────────────────────── */}
      {activeTab === 'special' && (
        <div className="card" style={{ padding: '16px' }}>
          <div className="special-section">
            <h4>모든 트리플 <span className="payout-tag">×24</span></h4>
            <button
              className={`bet-btn triple-any-btn ${!canBet ? 'disabled' : ''}`}
              onClick={() => placeBet('triple_any')}
              disabled={!canBet}
            >
              🎲🎲🎲 모든 트리플
            </button>
          </div>

          <div className="special-section">
            <h4>특정 트리플 <span className="payout-tag">×150</span></h4>
            <div className="bet-grid triple-bets">
              {[1,2,3,4,5,6].map((n) => (
                <button
                  key={n}
                  className={`bet-btn triple-btn ${!canBet ? 'disabled' : ''}`}
                  onClick={() => placeBet(`triple_${n}`, n)}
                  disabled={!canBet}
                >
                  <span>{n}{n}{n}</span>
                  <span className="bet-payout">×150</span>
                </button>
              ))}
            </div>
          </div>

          <div className="special-section">
            <h4>더블 <span className="payout-tag">×8</span></h4>
            <div className="bet-grid triple-bets">
              {[1,2,3,4,5,6].map((n) => (
                <button
                  key={n}
                  className={`bet-btn double-btn ${!canBet ? 'disabled' : ''}`}
                  onClick={() => placeBet(`double_${n}`, n)}
                  disabled={!canBet}
                >
                  <span>{n}{n}</span>
                  <span className="bet-payout">×8</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 현재 베팅 목록 */}
      {currentBets.length > 0 && (
        <div className="current-bets card">
          <h4>이번 라운드 베팅</h4>
          {currentBets.map((b, i) => (
            <div key={i} className="bet-item">
              <span>{b.betType} {b.betValue ? `(${b.betValue})` : ''}</span>
              <span className="amount">{b.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
