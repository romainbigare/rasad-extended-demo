import { Archive, CircleCheck, TicketPlus } from "lucide-react";
import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";

import { ArchiveIcon, CloseIcon, PhoneIcon, SendIcon, UploadIcon } from "@/components/AppShell/icons";
import { cx } from "@/components/ui/cx";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useZones } from "@/lib/analytics/hooks";
import { fetchAllPages } from "@/lib/farm/fetchAllPages";
import { useFarmList } from "@/lib/farm/useFarmList";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useAuth } from "@shared/auth/AuthContext";
import { FARM_ENDPOINTS, type FarmServiceField } from "@shared/farm/endpoints";
import type { RbacProfile } from "@/lib/auth/profile";

import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "../data/options";
import type { SubmittedTicket, TicketStatus } from "../data/tickets";
import { STRINGS } from "../data/translations";

const CATEGORY_KEYS = {
  telemetry: "categoryTelemetry",
  cadastral: "categoryCadastral",
  treeHealth: "categoryTreeHealth",
  irrigation: "categoryIrrigation",
  imagery: "categoryImagery",
} as const satisfies Record<TicketCategory, keyof typeof STRINGS>;

const PRIORITY_KEYS = {
  critical: "priorityCritical",
  high: "priorityHigh",
  normal: "priorityNormal",
} as const satisfies Record<TicketPriority, keyof typeof STRINGS>;

const PRIORITY_TONE: Record<TicketPriority, string> = {
  critical: "border-[#BA1A1A] bg-[#FFDAD6] text-[#BA1A1A]",
  high: "border-[#F5900A] bg-[#FACF52]/30 text-[#8F5900]",
  normal: "border-green bg-[#E4F8F5] text-green-d",
};

const PRIORITY_PILL: Record<TicketPriority, string> = {
  critical: "bg-[#FFDAD6] text-[#BA1A1A]",
  high: "bg-[#E4F8F5] text-green-d",
  normal: "bg-[#E4F8F5] text-green-d",
};

const PRIORITY_SHORT_KEYS = {
  critical: "priorityShortCritical",
  high: "priorityShortHigh",
  normal: "priorityShortNormal",
} as const satisfies Record<TicketPriority, keyof typeof STRINGS>;

const SLA_KEYS = {
  critical: "slaCritical",
  high: "slaHigh",
  normal: "slaNormal",
} as const satisfies Record<TicketPriority, keyof typeof STRINGS>;

const STATUS_PILL: Record<TicketStatus, string> = {
  open: "bg-[#FFD60A]/30 text-[#8F5900]",
  inProgress: "bg-[#FFD60A]/30 text-[#8F5900]",
  resolved: "bg-[#E4F8F5] text-green-d",
};
const STATUS_KEYS = {
  open: "statusOpen",
  inProgress: "statusInProgress",
  resolved: "statusResolved",
} as const satisfies Record<TicketStatus, keyof typeof STRINGS>;

const loggedAt = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const LABEL = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted";
const FIELD =
  "w-full rounded-lg border border-line bg-[#F4F7F6] p-2.5 text-xs font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-muted focus:border-[#4FB840] disabled:cursor-not-allowed disabled:opacity-60";

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);

export function RaiseTicketForm() {
  const t = useT(STRINGS);
  const farms = useFarmList();
  const zones = useZones();

  const [category, setCategory] = useState<TicketCategory>("telemetry");
  const [priority, setPriority] = useState<TicketPriority>("critical");
  const [farmId, setFarmId] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const profile = useAuth()?.user as unknown as RbacProfile | null;
  const [contact, setContact] = useState(profile?.phone ?? "");
  const contactTouched = useRef(false);
  useEffect(() => {
    if (!contactTouched.current && profile?.phone) setContact(profile.phone);
  }, [profile?.phone]);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<SubmittedTicket[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const zoneName = useMemo(() => new Map((zones.data ?? []).map((z) => [z.id, z.name])), [zones.data]);
  const fields = useQuery<FarmServiceField[], Error>(
    ["farm-service", "fields", "farm", farmId],
    () => fetchAllPages<FarmServiceField>(FARM_ENDPOINTS.FIELDS, { farm_id: Number(farmId) }),
    { enabled: farmId !== "" },
  );

  useEffect(() => {
    const first = farms.data?.[0];
    if (farmId === "" && first) setFarmId(String(first.id));
  }, [farms.data, farmId]);
  useEffect(() => {
    const first = fields.data?.[0];
    if (fieldId === "" && first) setFieldId(String(first.id));
  }, [fields.data, fieldId]);

  const sla = TICKET_PRIORITIES.find((p) => p.key === priority)?.hours ?? 24;

  const addFiles = (incoming: FileList | File[]) => {
    const errors: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!(ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) errors.push(fill(t("attachBadType"), { name: file.name }));
      else if (file.size > ATTACHMENT_MAX_BYTES) errors.push(fill(t("attachTooBig"), { name: file.name }));
      else accepted.push(file);
    }
    setFileErrors(errors);
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!summary.trim() || !description.trim()) {
      window.alert(t("validationAlert"));
      return;
    }
    const now = new Date();
    const id = `ADAFSA-TKT-${now.getFullYear()}-0${Math.floor(Math.random() * 900) + 100}`;
    const farm = (farms.data ?? []).find((f) => String(f.id) === farmId);
    const field = (fields.data ?? []).find((f) => String(f.id) === fieldId);
    const ticket: SubmittedTicket = {
      id,
      title: summary.trim(),
      description: description.trim(),
      category,
      priority,
      status: "open",
      farm: farm ? farm.uid : "—",
      fieldId: field ? field.uid : "",
      contactPhone: contact,
      attachments: files.map((f) => f.name),
      createdAt: loggedAt(now),
    };
    setTickets((current) => [ticket, ...current]);
    setSuccessId(id);
    setSummary("");
    setDescription("");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-panel p-6 shadow-xs md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink">
            <span>{t("eyebrow")}</span>
            <span className="text-line">·</span>
            <span className="flex items-center gap-1.5 text-green-d">
              {fill(t("slaResponse"), { hours: sla })}
            </span>
          </div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-ink">
            <TitleIcon icon={TicketPlus} />
            {t("title")}
          </h1>
          <p className="mb-0 mt-1 text-xs text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowArchive((open) => !open)}
            aria-pressed={showArchive}
            data-testid="ticket-archive-toggle"
            className="flex items-center gap-2 rounded-lg border border-line bg-[#F4F7F6] px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white"
          >
            <ArchiveIcon width={16} height={16} className="text-muted" />
            {fill(t("myArchiveCount"), { n: tickets.length })}
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-[#BA1A1A]/30 bg-[#FFDAD6]/30 px-3 py-2 text-xs font-bold text-[#BA1A1A] lg:flex">
            <PhoneIcon width={14} height={14} />
            {t("hotline")}
          </div>
        </div>
      </div>

      {successId && (
        <div
          role="status"
          data-testid="ticket-success"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#4FB840] bg-[#E4F8F5] p-4"
        >
          <div className="flex items-center gap-3">
            <CircleCheck aria-hidden className="h-5 w-5 flex-none text-[#4FB840]" />
            <div>
              <div className="text-xs font-bold text-ink">{fill(t("successTitle"), { id: successId })}</div>
              <div className="text-[11px] text-green-d">{t("successSub")}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessId(null)}
            aria-label={t("closeBanner")}
            className="text-xs text-muted hover:text-ink"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      )}

      {showArchive ? (
        <div data-testid="ticket-archive" className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <h2 className="m-0 flex items-center gap-2 text-sm font-bold text-ink">
              <TitleIcon icon={Archive} />
              {t("archiveTitle")}
            </h2>
            <button type="button" onClick={() => setShowArchive(false)} className="text-xs font-semibold text-ink hover:underline">
              {t("backToNew")}
            </button>
          </div>
          {tickets.length === 0 ? (
            <p className="m-0 py-4 text-xs text-muted">{t("archiveEmpty")}</p>
          ) : (
            <div className="divide-y divide-line">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{ticket.id}</span>
                      <span className={cx("rounded px-2 py-0.5 text-[10px] font-bold", PRIORITY_PILL[ticket.priority])}>
                        {t(PRIORITY_SHORT_KEYS[ticket.priority])}
                      </span>
                      <span className="text-[11px] text-muted">{t(SLA_KEYS[ticket.priority])}</span>
                    </div>
                    {/* New tickets are "Open" - nothing updates their status until the ticket API exists. */}
                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_PILL[ticket.status])}>
                      {t(STATUS_KEYS[ticket.status])}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink">{ticket.title}</div>
                  <p className="m-0 text-xs text-[#41484B]">{ticket.description}</p>
                  <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-muted">
                    <span>{fill(t("archiveFarm"), { v: ticket.farm })}</span>
                    <span>{fill(t("archiveCategory"), { v: t(CATEGORY_KEYS[ticket.category]) })}</span>
                    <span>{fill(t("archiveLogged"), { v: ticket.createdAt })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 rounded-xl border border-line bg-panel p-6 shadow-xs">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="ticket-category" className={LABEL}>
              {t("categoryLabel")}
            </label>
            <select id="ticket-category" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={FIELD}>
              {TICKET_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {t(CATEGORY_KEYS[key])}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div id="ticket-priority-label" className={LABEL}>
              {t("priorityLabel")}
            </div>
            <div role="radiogroup" aria-labelledby="ticket-priority-label" className="grid grid-cols-3 gap-2">
              {TICKET_PRIORITIES.map(({ key, hours }) => {
                const active = key === priority;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPriority(key)}
                    className={cx(
                      "rounded-lg border py-2 text-xs font-bold transition touch:min-h-[44px]",
                      active ? PRIORITY_TONE[key] : "border-line bg-[#F4F7F6] text-[#41484B] hover:bg-panel",
                    )}
                  >
                    {fill(t(PRIORITY_KEYS[key]), { hours })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label htmlFor="ticket-farm" className={LABEL}>
              {t("farmLabel")}
            </label>
            <select
              id="ticket-farm"
              value={farmId}
              onChange={(e) => {
                setFarmId(e.target.value);
                setFieldId("");
              }}
              disabled={farms.isLoading}
              className={FIELD}
            >
              <option value="">{farms.isLoading ? t("farmsLoading") : t("farmPlaceholder")}</option>
              {(farms.data ?? []).map((farm) => {
                const zone = farm.zone_id === null ? null : zoneName.get(farm.zone_id);
                return (
                  <option key={farm.id} value={farm.id}>
                    {farm.name ?? farm.uid}
                    {zone ? ` (${zone})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-field" className={LABEL}>
              {t("fieldLabel")}
            </label>
            <select id="ticket-field" value={fieldId} onChange={(e) => setFieldId(e.target.value)} disabled={farmId === ""} className={FIELD}>
              {(fields.data ?? []).length === 0 && <option value="">{t("fieldWholeFarm")}</option>}
              {(fields.data ?? []).map((field) => (
                <option key={field.id} value={field.id}>
                  {fill(t("fieldOption"), { uid: field.uid })}
                  {field.area_dunum ? ` (${formatInteger(Number(field.area_dunum))} du)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-contact" className={LABEL}>
              {t("contactLabel")}
            </label>
            <input
              id="ticket-contact"
              type="tel"
              autoComplete="tel"
              value={contact}
              onChange={(e) => {
                contactTouched.current = true;
                setContact(e.target.value);
              }}
              placeholder={t("contactPlaceholder")}
              className={FIELD}
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ticket-summary" className={LABEL}>
            {t("summaryLabel")}
          </label>
          <input
            id="ticket-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("summaryPlaceholder")}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="ticket-description" className={LABEL}>
            {t("descriptionLabel")}
          </label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={4}
            className={cx(FIELD, "resize-y font-normal leading-relaxed")}
          />
        </div>

        <div>
          <div className={LABEL}>{t("attachmentsLabel")}</div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx(
              "cursor-pointer rounded-xl border-2 border-dashed bg-[#F4F7F6] p-6 text-center transition-colors hover:border-[#4FB840]",
              dragging ? "border-[#4FB840]" : "border-line",
            )}
          >
            <UploadIcon width={24} height={24} className="mx-auto mb-2 text-muted" />
            <div className="text-xs font-bold text-ink">{t("attachCta")}</div>
            <div className="mt-0.5 text-[11px] text-muted">{t("attachHint")}</div>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              accept={ATTACHMENT_EXTENSIONS.join(",")}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {fileErrors.map((message) => (
            <p key={message} role="alert" className="mb-0 mt-1.5 text-[11px] text-red">
              {message}
            </p>
          ))}
          {files.length > 0 && (
            <ul className="mb-0 mt-2 flex list-none flex-col gap-1 p-0">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate font-semibold text-ink">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    aria-label={fill(t("removeFile"), { name: file.name })}
                    className="text-muted hover:text-red"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          <button
            type="submit"
            data-testid="ticket-submit"
            className="flex items-center gap-2 rounded-lg bg-[#4FB840] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#72C02C] touch:min-h-[44px]"
          >
            <SendIcon width={16} height={16} />
            {t("submit")}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
