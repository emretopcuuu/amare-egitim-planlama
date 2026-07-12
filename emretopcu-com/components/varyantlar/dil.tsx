"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ICERIK, type Dil, type Icerik } from "@/lib/icerik";

const DilContext = createContext<{ dil: Dil; c: Icerik }>({
  dil: "tr",
  c: ICERIK.tr,
});

export function DilProvider({
  dil,
  children,
}: {
  dil: Dil;
  children: ReactNode;
}) {
  return (
    <DilContext.Provider value={{ dil, c: ICERIK[dil] }}>
      {children}
    </DilContext.Provider>
  );
}

/** Aktif dilin içeriği. */
export function useC() {
  return useContext(DilContext).c;
}

/** Aktif dil kodu. */
export function useDil() {
  return useContext(DilContext).dil;
}
