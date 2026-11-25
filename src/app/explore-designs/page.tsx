import { Suspense } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { DesignImageGallery } from "@/components/designs/DesignImageGallery";

export default function ExploreDesignsPage() {
  return (
    <PublicShell>
      <Suspense
        fallback={
          <div className="min-h-[72vh] bg-[#F7F3ED]" aria-hidden="true" />
        }
      >
        <DesignImageGallery />
      </Suspense>
    </PublicShell>
  );
}
