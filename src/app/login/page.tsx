import LoginForm from "@/components/LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      {/* Ambient glow phía sau card */}
      <div className={styles.glow} aria-hidden="true" />
      <LoginForm />
    </main>
  );
}
