"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Download, FileText, Upload, X } from "lucide-react";

import { SampleGate } from "@/components/app/shell/OrgNotices";
import { useAnalyses } from "@/components/app/useAnalyses";
import { Badge, Card, EmptyState, PageHeader, buttonClass, formatDate, usePreview } from "@/components/app/ui";
import { SAMPLE_TEMPLATES } from "@/lib/app/mock/records";

type Picked = { key: number; name: string; size: number };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Documents() {
  // Real analyses: an unpaid organization never gets here (SampleGate), so the 402 path stays the API's.
  const { analyses, error } = useAnalyses();
  const preview = usePreview();

  return (
    <>
      <Card
        title="Reports"
        description="The PDF report of each saved analysis. The report is generated with the scan's own access token, which this workspace does not hold yet."
      >
        {error && (
          <p role="alert" className="text-sm text-rojo">
            {error}
          </p>
        )}
        {analyses === null ? (
          !error && (
            <p role="status" className="text-sm text-marino/70">
              Loading analyses…
            </p>
          )
        ) : analyses.length === 0 ? (
          <EmptyState icon={FileText} title="No analyses saved yet." description="Reports appear here once an analysis is saved." />
        ) : (
          <ul aria-label="Reports" className="divide-y divide-marino/10">
            {analyses.map(analysis => (
              <li key={analysis.scanId} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{analysis.domain}</p>
                  <p className="text-xs text-marino/60">Saved {formatDate(analysis.claimedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled className={buttonClass.secondary}>
                    <Download aria-hidden className="h-4 w-4" />
                    Quick Scan Report
                  </button>
                  <button type="button" disabled className={buttonClass.secondary}>
                    <Download aria-hidden className="h-4 w-4" />
                    Full Assessment Report
                  </button>
                  <Badge>Coming soon</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6" title="Firm documents" description="Templates to adapt to your firm's practice." sample>
        <ul aria-label="Firm documents" className="divide-y divide-marino/10">
          {SAMPLE_TEMPLATES.map(doc => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-bruma">
                <FileText aria-hidden className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{doc.name}</p>
                <p className="text-xs text-marino/60">
                  {doc.description} Updated {formatDate(doc.updated)}.
                </p>
              </div>
              <button
                type="button"
                aria-label={`Download ${doc.name}`}
                onClick={() => preview("Templates download once the document library is connected.")}
                className={buttonClass.secondary}
              >
                <Download aria-hidden className="h-4 w-4" />
                Download
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <EvidenceZone />
    </>
  );
}

// Files stay in the browser: only their name and size are kept, the contents are never read.
function EvidenceZone() {
  const [files, setFiles] = useState<Picked[]>([]);
  const next = useRef(0);

  function add(list: FileList | null) {
    if (!list) return;
    const picked = [...list].map(file => {
      next.current += 1;
      return { key: next.current, name: file.name, size: file.size };
    });
    setFiles(current => [...current, ...picked]);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    add(event.target.files);
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    add(event.dataTransfer.files);
  }

  return (
    <Card
      className="mt-6"
      title="Evidence"
      description="Policies, training records or review checklists that support your answers."
      actions={<Badge>Not uploaded: preview only</Badge>}
    >
      <label
        onDragOver={event => event.preventDefault()}
        onDrop={onDrop}
        className="flex cursor-pointer flex-col items-center rounded-3xl border border-dashed border-marino/25 px-6 py-8 text-center focus-within:outline-2 focus-within:outline-cielo hover:bg-bruma/50"
      >
        <Upload aria-hidden className="h-5 w-5" />
        <span className="mt-2 text-sm font-semibold">Add evidence files</span>
        <span className="mt-1 text-xs text-marino/60">Drop files here or choose them. Nothing leaves your browser.</span>
        <input type="file" multiple onChange={onChange} className="sr-only" />
      </label>
      {files.length > 0 && (
        <ul aria-label="Picked files" className="mt-4 divide-y divide-marino/10">
          {files.map(file => (
            <li key={file.key} className="flex items-center gap-3 py-2">
              <FileText aria-hidden className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="text-xs text-marino/60">{formatSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles(current => current.filter(item => item.key !== file.key))}
                className={buttonClass.ghost}
              >
                <X aria-hidden className="h-4 w-4" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function DocumentsPage() {
  return (
    <>
      <PageHeader eyebrow="Documents" title="Reports and documents" description="Your analysis reports, firm templates and evidence." />
      <SampleGate feature="documents">
        <Documents />
      </SampleGate>
    </>
  );
}
