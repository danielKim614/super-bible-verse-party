"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 루트(/)는 참가자 화면. 메인 스크린은 /display, 어드민은 /admin
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/join${window.location.search}`);
  }, [router]);
  return null;
}
