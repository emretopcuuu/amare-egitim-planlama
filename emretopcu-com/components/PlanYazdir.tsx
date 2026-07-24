"use client";

import { Printer } from "@phosphor-icons/react";
import { olcum } from "@/lib/olcum";

export default function PlanYazdir() {
  return (
    <button
      type="button"
      onClick={() => {
        olcum("plan-indir");
        window.print();
      }}
      className="inline-flex items-center gap-2 rounded-full bg-altin px-6 py-3 text-sm font-medium text-fildisi active:scale-[0.98] print:hidden"
    >
      <Printer size={18} weight="fill" />
      Yazdır / PDF olarak kaydet
    </button>
  );
}
