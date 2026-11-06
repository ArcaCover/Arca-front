import { buttonClass } from "./primitives";

/** A page or tab whose first read failed: the API's reason, and a way to ask again without leaving it. */
export function LoadFailed({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div className={className}>
      <p role="alert" className="text-sm text-rojo">
        {message}
      </p>
      <button type="button" onClick={onRetry} className={`${buttonClass.secondary} mt-4`}>
        Try again
      </button>
    </div>
  );
}
