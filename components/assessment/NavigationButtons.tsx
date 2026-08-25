import { ArrowLeft, ArrowRight } from "lucide-react";

export default function NavigationButtons({
  onPrevious,
  onNext,
  isFirst,
  isLast,
  canProceed,
}: {
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  canProceed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirst}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-bruma px-6 py-3 font-heading text-[15px] font-medium tracking-tight text-marino transition-colors hover:border-cielo disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-bruma"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Previous
      </button>

      {isLast ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="cta-glow group inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Submit assessment
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-marino px-7 py-3 font-heading text-[15px] font-medium tracking-tight text-white transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Next
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
      )}
    </div>
  );
}
