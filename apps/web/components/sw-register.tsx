"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/offline";

export function SWRegister() {
  useEffect(() => registerServiceWorker(), []);
  return null;
}
