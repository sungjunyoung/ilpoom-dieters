import { Link, useLocation } from "react-router";
import { DEADLINE } from "../../shared/types";

export default function Footer() {
  const location = useLocation();
  const onRules = location.pathname === "/rules";

  return (
    <footer className="footer">
      {onRules ? (
        <Link to="/" className="footer-link">
          돌아가기
        </Link>
      ) : (
        <Link to="/rules" className="footer-link">
          운영 수칙
        </Link>
      )}
      <span className="footer-note">계체 데드라인 {DEADLINE.replace(/-/g, ".")}</span>
    </footer>
  );
}
