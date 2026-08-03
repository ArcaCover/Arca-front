"use client";

import { useState, type MouseEvent } from "react";
import { useInView } from "@/lib/useInView";

const POLICY_TOTAL = 10_000_000;
const AI_SUB_LIMIT_RATIO = 0.05;

// TODO: replace with verified real events
const FEED_ITEMS = [
  "State court issues AI disclosure guidance for filings",
  "Bar association opinion on supervising AI-assisted work",
  "Regulator opens consultation on automated advice",
  "Disciplinary action reported over unverified AI output",
];

// Applied inline because the CSS pipeline strips mask-image from stylesheets.
const FEED_FADE =
  "linear-gradient(180deg, transparent 0, black 16%, black 84%, transparent 100%)";

// h-full plus a flex-1 stage makes all three cards the same height and puts
// their titles, artwork and copy on the same lines as each other.
const CARD_SHELL =
  "ag-card flex h-full flex-col gap-6 rounded-3xl border border-cielo/15 p-[34px_30px_30px] max-[1080px]:gap-5 max-[1080px]:p-[26px_22px_24px]";
const EYEBROW =
  "font-heading text-[11.5px] font-semibold tracking-[0.26em] text-cielo/90";
const CARD_TITLE =
  "font-heading text-[26px] font-medium leading-[1.14] tracking-[-0.036em] text-white max-[1080px]:text-[23px]";
const CARD_COPY = "text-[15px] leading-[1.6] text-white/70 text-pretty";
const STAGE = "relative flex-1 min-h-[176px] max-[1080px]:min-h-[168px]";

function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function SubLimitBar() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [tip, setTip] = useState({
    visible: false,
    left: 0,
    amount: money(0),
    covered: false,
  });

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const bar = event.currentTarget.getBoundingClientRect();
    const stage = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!stage) {
      return;
    }
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - bar.left) / bar.width),
    );
    setTip({
      visible: true,
      left: event.clientX - stage.left,
      amount: money(POLICY_TOTAL * ratio),
      covered: ratio <= AI_SUB_LIMIT_RATIO,
    });
  };

  const late = (delay: number) => ({
    opacity: inView ? 1 : 0,
    transitionDelay: `${delay}ms`,
  });

  return (
    <div ref={ref} className={`${STAGE} flex flex-col justify-center gap-3`}>
      <div className="flex items-baseline justify-between">
        <span className="font-heading text-[11.5px] tracking-[0.18em] text-white/40">
          POLICY LIMIT
        </span>
        <span className="font-heading text-[17px] text-white">$10M</span>
      </div>

      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setTip((current) => ({ ...current, visible: false }))}
        className="relative h-[74px] cursor-crosshair overflow-hidden rounded-2xl bg-cielo/10"
      >
        <div
          className="ag-fill absolute inset-y-0 left-0"
          style={{ width: inView ? "100%" : "0%" }}
        />
        <div
          className="ag-dim ag-late absolute inset-y-0 left-[5%] right-0"
          style={late(1500)}
        />
        <div
          className="ag-seg ag-late absolute inset-y-0 left-0 w-[5%] bg-oro"
          style={late(1600)}
        />
        <div
          className="ag-late absolute inset-y-0 left-[5%] w-px bg-oro/55"
          style={late(1700)}
        />
      </div>

      <div className="flex justify-between gap-3">
        <span
          className="ag-late text-[13px] font-semibold text-oro"
          style={late(1800)}
        >
          AI sub-limit: $500K
        </span>
        <span className="ag-late text-[13px] text-white/50" style={late(1900)}>
          not covered for AI
        </span>
      </div>

      <div
        aria-hidden="true"
        className="ag-tip pointer-events-none absolute top-3 z-[4] -translate-x-1/2 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[12.5px] leading-[1.35] text-marino"
        style={{ left: tip.left, opacity: tip.visible ? 1 : 0 }}
      >
        <b className="font-heading font-semibold">{tip.amount}</b>
        <span
          className={`block ${tip.covered ? "text-oro-oscuro" : "text-marino/70"}`}
        >
          {tip.covered ? "covered for AI" : "not covered for AI"}
        </span>
      </div>

      <span className="self-start rounded-full border border-white/15 px-2.5 py-[3px] text-[11px] tracking-[0.1em] text-white/35">
        ILLUSTRATIVE EXAMPLE
      </span>
    </div>
  );
}

export default function AiGapCards() {
  return (
    <div className="grid grid-cols-3 gap-6 max-[1080px]:grid-cols-1 max-[1080px]:gap-4">
      {/* CARD 01 — the document that fails */}
      <article className={CARD_SHELL}>
        <div className="flex flex-col gap-2.5">
          <span className={EYEBROW}>01</span>
          <h3 className={CARD_TITLE}>When AI gets it wrong</h3>
        </div>
        <div className={`${STAGE} flex items-center justify-center`}>
          <div className="ag-doc relative flex w-[172px] flex-col gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-[18px]">
            <i className="block h-[7px] w-[70%] origin-left rounded" />
            <i className="block h-[7px] w-full origin-left rounded" />
            <i className="block h-[7px] w-[88%] origin-left rounded" />
            <i className="block h-[7px] w-[94%] origin-left rounded" />
            <i className="block h-[7px] w-[62%] origin-left rounded" />
            <i className="block h-[7px] w-[80%] origin-left rounded" />
            <div className="ag-doc-badge absolute -right-[46px] top-[78px] whitespace-nowrap rounded-full bg-oro px-[11px] py-[5px] text-[11.5px] font-bold text-marino">
              citation not found
            </div>
          </div>
        </div>
        <p className={CARD_COPY}>
          An AI-drafted brief cites a case that doesn&rsquo;t exist. A model
          misreads a reconciliation. Your client sues.
        </p>
      </article>

      {/* CARD 02 — sub-limit bar. Figures are illustrative. */}
      <article className={CARD_SHELL}>
        <div className="flex flex-col gap-2.5">
          <span className={EYEBROW}>02</span>
          <h3 className={CARD_TITLE}>When your policy says no</h3>
        </div>
        <SubLimitBar />
        <p className={CARD_COPY}>
          You file the claim. Your carrier points to the AI exclusion.
          You&rsquo;re covering the defense yourself.
        </p>
      </article>

      {/* CARD 03 — regulatory feed */}
      <article className={CARD_SHELL}>
        <div className="flex flex-col gap-2.5">
          <span className={EYEBROW}>03</span>
          <h3 className={CARD_TITLE}>When the regulator calls</h3>
        </div>
        <div
          className={`${STAGE} overflow-hidden`}
          style={{ WebkitMaskImage: FEED_FADE, maskImage: FEED_FADE }}
        >
          {/* Rendered twice so the -50% loop meets itself without a gap. */}
          <div className="ag-feed absolute inset-x-0 top-0 flex flex-col gap-2.5">
            {[0, 1].map((copy) =>
              FEED_ITEMS.map((item) => (
                <div
                  key={`${copy}-${item}`}
                  className="flex items-start gap-[11px] rounded-[13px] border border-white/10 bg-white/5 px-[13px] py-[11px]"
                >
                  <span className="ag-dot mt-[5px] h-[7px] w-[7px] flex-none rounded-full bg-oro" />
                  <div>
                    <p className="text-[13px] leading-[1.35] text-white/85">
                      {item}
                    </p>
                    <div className="mt-1 font-heading text-[11px] tracking-[0.06em] text-cielo/85">
                      PLACEHOLDER · JURISDICTION · DATE
                    </div>
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
        <p className={CARD_COPY}>
          Bar associations and state courts are writing AI rules. Non-compliance
          is a disciplinary matter, not just a claim.
        </p>
      </article>
    </div>
  );
}
