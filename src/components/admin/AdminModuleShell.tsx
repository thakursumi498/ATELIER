import React from "react";

interface AdminModuleShellProps {
  moduleTitle: string;
  summary: string;
  capabilities: ReadonlyArray<{ title: string; description: string }>;
}

export function AdminModuleShell({ moduleTitle, summary, capabilities }: AdminModuleShellProps) {
  return (
    <section className="rounded-[20px] border border-[#DFD0C0] bg-[#FFFDF9] p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-normal text-[#1A1A1A]">{moduleTitle}</h2>
      <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-[#746B64]">{summary}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {capabilities.map((item) => <article key={item.title} className="rounded-2xl border border-[#E8DED3] bg-[#FAF6F0] p-4"><h3 className="font-serif text-lg text-[#1A1A1A]">{item.title}</h3><p className="mt-1.5 text-xs leading-relaxed text-[#746B64]">{item.description}</p></article>)}
      </div>
    </section>
  );
}
