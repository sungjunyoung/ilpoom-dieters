import type { ReactNode } from "react";
import { DEADLINE } from "../../shared/types";
import { dday } from "../components/Header";

interface RuleGroup {
  title: string;
  items: ReactNode[];
}

const RULES: RuleGroup[] = [
  {
    title: "목표 체중은 미만(未滿) 기준으로 적용",
    items: [
      <>
        예: 목표 체중이 <b>75kg</b>인 경우 <b>74.99kg 이하</b>여야 목표 달성으로 인정한다.
      </>,
    ],
  },
  {
    title: "계체 방식",
    items: [
      <>
        모든 참가자는 <b>동일한 체중계</b>로 측정한다.
      </>,
      <>인증샷 및 개인 체중계 측정 결과는 인정하지 않는다.</>,
      <>
        <b>계체 당일 체중계에 표시된 숫자만</b> 공식 기록으로 인정한다.
      </>,
      <>
        계체는 <b>1회만 실시</b>한다.
      </>,
    ],
  },
  {
    title: "수분 감량 제한",
    items: [
      <>
        참가자의 건강을 위해 <b>사우나, 탈수 등 인위적인 수분 감량</b>을 통한 체중 조절은
        제한한다.
      </>,
      <>
        이 앱은 앞뒤 기록과 비교해 <b>하루 1kg을 초과하는 감량</b>이 계산되면 해당 기록의 저장과
        수정을 막는다.
      </>,
    ],
  },
  {
    title: "목표 미달성자 벌칙",
    items: [
      <>
        목표를 달성하지 못한 참가자는 <b>참가비 10만 원</b>을 성공자들에게 균등 분배하여
        반납한다.
      </>,
      <>
        또한 실패자들은 <b>12월 12일 오락 및 식사 비용 50만 원</b>을 모아서 지급한다.
      </>,
    ],
  },
];

export default function RulesPage() {
  const d = dday();

  return (
    <div className="rules">
      <div className="card deadline-card">
        <div className="deadline-label">계체 데드라인</div>
        <div className="deadline-value">{DEADLINE.replace(/-/g, ".")}</div>
        <div className="deadline-label">
          {d > 0 ? `${d}일 남았습니다` : d === 0 ? "오늘이 계체일입니다" : "계체가 종료되었습니다"}
        </div>
      </div>

      <div className="card">
        <h3>추가 룰</h3>
        <p className="rules-intro">일품 모임에서 합의된 운영 수칙입니다.</p>
        {RULES.map((group, i) => (
          <section className="rule-group" key={group.title}>
            <div className="rule-head">
              <span className="rule-index">{i + 1}</span>
              <span className="rule-title">{group.title}</span>
            </div>
            <ul className="rule-items">
              {group.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
