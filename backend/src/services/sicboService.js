/**
 * 다이사이(식보) 게임 서비스
 * - 주사위 3개 결과 계산
 * - 베팅 유형별 당첨 판정 및 배당률
 */

// ── 배당률 테이블 ──────────────────────────────────────────
const PAYOUT_TABLE = {
  big:          1,    // 대 (합계 11-17, 트리플 제외)
  small:        1,    // 소 (합계 4-10, 트리플 제외)
  odd:          1,    // 홀수 합
  even:         1,    // 짝수 합
  triple_any:   24,   // 모든 트리플 (1:24)
  triple_1:     150,  // 트리플 1
  triple_2:     150,  // 트리플 2
  triple_3:     150,  // 트리플 3
  triple_4:     150,  // 트리플 4
  triple_5:     150,  // 트리플 5
  triple_6:     150,  // 트리플 6
  double_1:     8,    // 더블 1
  double_2:     8,
  double_3:     8,
  double_4:     8,
  double_5:     8,
  double_6:     8,
  single_1:     1,    // 숫자 1 (1개=1:1, 2개=2:1, 3개=3:1)
  single_2:     1,
  single_3:     1,
  single_4:     1,
  single_5:     1,
  single_6:     1,
  // 합계 4-17
  sum_4:        50,
  sum_5:        20,
  sum_6:        14,
  sum_7:        12,
  sum_8:        8,
  sum_9:        6,
  sum_10:       6,
  sum_11:       6,
  sum_12:       6,
  sum_13:       8,
  sum_14:       12,
  sum_15:       14,
  sum_16:       20,
  sum_17:       50,
  // 두 주사위 조합 (예: combo_1_2)
  combo_1_2:    5,
  combo_1_3:    5,
  combo_1_4:    5,
  combo_1_5:    5,
  combo_1_6:    5,
  combo_2_3:    5,
  combo_2_4:    5,
  combo_2_5:    5,
  combo_2_6:    5,
  combo_3_4:    5,
  combo_3_5:    5,
  combo_3_6:    5,
  combo_4_5:    5,
  combo_4_6:    5,
  combo_5_6:    5,
};

// ── 주사위 굴리기 ──────────────────────────────────────────
function rollDice() {
  return {
    d1: Math.floor(Math.random() * 6) + 1,
    d2: Math.floor(Math.random() * 6) + 1,
    d3: Math.floor(Math.random() * 6) + 1,
  };
}

// ── 당첨 판정 ──────────────────────────────────────────────
function checkWin(betType, betValue, dice) {
  const { d1, d2, d3 } = dice;
  const sum = d1 + d2 + d3;
  const vals = [d1, d2, d3].sort((a, b) => a - b);
  const isTriple = d1 === d2 && d2 === d3;

  switch (betType) {
    case 'big':
      return sum >= 11 && sum <= 17 && !isTriple;
    case 'small':
      return sum >= 4 && sum <= 10 && !isTriple;
    case 'odd':
      return sum % 2 !== 0;
    case 'even':
      return sum % 2 === 0;
    case 'triple_any':
      return isTriple;
    case 'triple_1': return d1===1 && d2===1 && d3===1;
    case 'triple_2': return d1===2 && d2===2 && d3===2;
    case 'triple_3': return d1===3 && d2===3 && d3===3;
    case 'triple_4': return d1===4 && d2===4 && d3===4;
    case 'triple_5': return d1===5 && d2===5 && d3===5;
    case 'triple_6': return d1===6 && d2===6 && d3===6;
    case 'double_1': return vals[0]===1 && vals[1]===1;
    case 'double_2': return vals[0]===2 && vals[1]===2;
    case 'double_3': return vals[1]===3 && vals[2]===3;
    case 'double_4': return vals[1]===4 && vals[2]===4;
    case 'double_5': return vals[1]===5 && vals[2]===5;
    case 'double_6': return vals[1]===6 && vals[2]===6;
    case 'single_1': return [d1,d2,d3].includes(1);
    case 'single_2': return [d1,d2,d3].includes(2);
    case 'single_3': return [d1,d2,d3].includes(3);
    case 'single_4': return [d1,d2,d3].includes(4);
    case 'single_5': return [d1,d2,d3].includes(5);
    case 'single_6': return [d1,d2,d3].includes(6);
    default:
      if (betType.startsWith('sum_')) {
        const target = parseInt(betType.split('_')[1]);
        return sum === target;
      }
      if (betType.startsWith('combo_')) {
        const [, a, b] = betType.split('_').map(Number);
        return (vals.includes(a) && vals.includes(b) && !(isTriple));
      }
      return false;
  }
}

// ── 단일 숫자 배당: 나온 횟수만큼 배율 적용 ──────────────
function getSinglePayout(betType, dice) {
  const num = parseInt(betType.split('_')[1]);
  const { d1, d2, d3 } = dice;
  const count = [d1, d2, d3].filter(d => d === num).length;
  return count; // 1=1배, 2=2배, 3=3배 (기본 베팅금 + count * 베팅금)
}

// ── 배당률 가져오기 ────────────────────────────────────────
function getPayout(betType, dice) {
  if (betType.startsWith('single_')) {
    return getSinglePayout(betType, dice);
  }
  return PAYOUT_TABLE[betType] || 1;
}

module.exports = { rollDice, checkWin, getPayout, PAYOUT_TABLE };
