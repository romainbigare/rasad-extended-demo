import { useRouter } from "next/router";
import { useEffect } from "react";

import { FullPageLoader } from "@/components/ui/States";

// Static export has no server redirects.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/executive-view");
  }, [router]);
  return <FullPageLoader />;
}
