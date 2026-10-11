import { ModelInsightsPage } from "../../components/model-insights";
import { PageHeading } from "../../components/dashboard-ui";

export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="DATA SCIENCE"
        title="Model insights"
        description="Explore CSV preparation, label balance, and held-out model performance."
      />
      <ModelInsightsPage />
    </>
  );
}
