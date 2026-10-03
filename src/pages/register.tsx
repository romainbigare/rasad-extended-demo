import { useRouter } from "next/router";
import { useEffect } from "react";

import { FullPageLoader } from "@/components/ui/States";

// Demo build: there is no sign-in step.
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/executive-view");
  }, [router]);
  return <FullPageLoader />;
}
