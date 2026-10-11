import { Suspense } from "react";
import { ThreatsPage } from "../../components/dashboard-pages";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel insights-loading">Loading threat center…</div>}>
      <ThreatsPage />
    </Suspense>
  );
}
