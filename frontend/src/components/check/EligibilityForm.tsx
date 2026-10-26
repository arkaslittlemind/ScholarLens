"use client";

import { ArrowRight, ChevronDown, Info, Loader2, Sparkles } from "lucide-react";
import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EligibilityRequest } from "@/lib/eligibility";

// The first two are adapted from real profiles in backend/data/evaluation/profiles.json,
// so they reflect what the corpus can answer. The third is outside the corpus on
// purpose: it shows a student abroad that the check still works for them, through the web.
const EXAMPLE_QUERIES = [
  {
    label: "First-year Pell Grant",
    description:
      "I'm a U.S. citizen starting my first year as an undergraduate. I filed the FAFSA and my household income is around $40,000. Am I eligible for the Federal Pell Grant?",
  },
  {
    label: "Already have a Bachelor's",
    description:
      "I already earned a Bachelor's degree and I'm now enrolled in a second undergraduate program. Am I eligible for the Federal Pell Grant?",
  },
  {
    label: "Class 12 student in India",
    description:
      "I'm in Class 12 in Maharashtra, India, and scored 88% in my board exams. My family's yearly income is about ₹4,00,000 and I want to study engineering. Which scholarships could I apply for?",
  },
];

// The currencies most visitors are likely to earn in. Anything else can go in the description.
const CURRENCIES = [
  { code: "USD", label: "$ USD" },
  { code: "INR", label: "₹ INR" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "CAD", label: "$ CAD" },
  { code: "AUD", label: "$ AUD" },
  { code: "NGN", label: "₦ NGN" },
  { code: "PKR", label: "₨ PKR" },
  { code: "BDT", label: "৳ BDT" },
  { code: "NPR", label: "₨ NPR" },
];

const GRADE_SCALES = [
  { value: "4", label: "out of 4" },
  { value: "5", label: "out of 5" },
  { value: "10", label: "out of 10" },
  { value: "100", label: "percent" },
];

const DESCRIPTION_MAX = 2000;
const COUNTRY_MAX = 100;
const STATE_MAX = 100;
const MAJOR_MAX = 200;

type FieldName = keyof EligibilityRequest;
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_VALUES: Values = {
  description: "",
  country: "",
  state: "",
  income: "",
  currency: "",
  gpa: "",
  gpa_scale: "",
  major: "",
};

// Visual order of the fields, whose element ids match these names, so a failed
// submit can focus the first one that needs fixing.
const FIELD_ORDER: FieldName[] = ["description", "country", "state", "income", "currency", "gpa", "gpa_scale", "major"];

// A number and its unit are checked together, so editing one re-checks the other.
const PARTNER: Partial<Record<FieldName, FieldName>> = {
  income: "currency",
  currency: "income",
  gpa: "gpa_scale",
  gpa_scale: "gpa",
};

// Digit-group separators differ by country (40,000 and 4,00,000 are both common), so
// they are dropped rather than validated. A trailing % is how many students write grades.
function parseAmount(value: string): number | undefined {
  const cleaned = value.replace(/[\s,_'%]/g, "");
  if (cleaned === "") return undefined;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

// One rule per field, shared by submit-time validation and the live re-check of a
// field that is already showing an error.
function fieldError(field: FieldName, values: Values): string | undefined {
  const trimmed = values[field].trim();
  switch (field) {
    case "description":
      return trimmed.length < 1
        ? "Tell us a little about your situation first, like your year in school and where you live."
        : undefined;
    case "country":
      return trimmed.length > COUNTRY_MAX ? `Country must be ${COUNTRY_MAX} characters or fewer.` : undefined;
    case "state":
      return trimmed.length > STATE_MAX ? `State or region must be ${STATE_MAX} characters or fewer.` : undefined;
    case "income":
      return Number.isNaN(parseAmount(values.income))
        ? "Enter your income as a number, like 400000 or 4,00,000."
        : undefined;
    case "currency":
      return parseAmount(values.income) !== undefined && values.currency === ""
        ? "Choose the currency your income is in."
        : undefined;
    case "gpa": {
      const gpa = parseAmount(values.gpa);
      if (Number.isNaN(gpa)) return "Enter your grades as a number, like 3.6 or 85.";
      if (gpa !== undefined && values.gpa_scale !== "" && gpa > Number(values.gpa_scale)) {
        return "That's above the top of the scale you chose.";
      }
      return undefined;
    }
    case "gpa_scale":
      return parseAmount(values.gpa) !== undefined && values.gpa_scale === ""
        ? "Choose the scale your grades use."
        : undefined;
    case "major":
      return trimmed.length > MAJOR_MAX ? `Field of study must be ${MAJOR_MAX} characters or fewer.` : undefined;
  }
}

// The submit button's idle and pending labels crossfade. A 2px blur bridges the two
// so the swap reads as one change; the outgoing label leaves faster than the new one arrives.
function labelLayerClass(active: boolean): string {
  return `col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,filter] ease-out-strong motion-reduce:filter-none! ${
    active ? "opacity-100 blur-[0px] duration-150" : "opacity-0 blur-[2px] duration-100"
  }`;
}

interface FieldProps {
  id: FieldName;
  label: string;
  error: string | undefined;
  // The field whose message is showing, when a number and its unit share one label.
  errorFor?: FieldName;
  children: ReactNode;
}

function Field({ id, label, error, errorFor = id, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </Label>
      {children}
      {error && (
        <p
          id={`${errorFor}-error`}
          className="text-sm font-medium text-destructive transition-[opacity,translate] duration-150 ease-out-strong starting:-translate-y-1 starting:opacity-0 motion-reduce:translate-none!"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// A themed native select: the platform picker stays (best on phones), the chrome matches Input.
function UnitSelect({ className, children, ...props }: ComponentProps<"select">) {
  // Unset reads like a placeholder, so it doesn't pass for a chosen value.
  const unset = props.value === "";
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      <select
        className={`h-11 w-full appearance-none rounded-md border border-input bg-paper pr-8 pl-3 text-base transition-[border-color,box-shadow,opacity,background-color] duration-200 outline-none hover:border-ink-secondary/50 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/10 focus-visible:transition-none disabled:cursor-not-allowed disabled:bg-tint disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 ${unset ? "text-ink-secondary/80" : "text-ink"} [&>option]:text-ink`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-secondary" />
    </div>
  );
}

interface EligibilityFormProps {
  onSubmit: (request: EligibilityRequest) => void;
  disabled?: boolean;
  // Field names the backend's validation_error response flagged (backend/app/api/errors.py's
  // ErrorDetail.fields), so a server-side rejection highlights the same input a client-side
  // one would.
  serverFieldErrors?: string[];
  // What a partial result said was missing, shown under the description while the student adds it.
  detailsToAdd?: string[];
}

export function EligibilityForm({ onSubmit, disabled = false, serverFieldErrors, detailsToAdd }: EligibilityFormProps) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Server-flagged fields the student has edited since; their stale flag is hidden.
  const [dismissedServerFields, setDismissedServerFields] = useState<ReadonlySet<FieldName>>(() => new Set());
  // Counts example fills; each new value remounts the flash layer over the field.
  const [fillCount, setFillCount] = useState(0);
  // What the student had written before an example replaced it; null once restored or edited.
  const [replacedText, setReplacedText] = useState<string | null>(null);

  function fillExample(description: string) {
    const current = values.description;
    // Only the student's own words are worth restoring, not one example replacing another.
    if (current.trim() && !EXAMPLE_QUERIES.some((example) => example.description === current)) {
      setReplacedText(current);
    }
    handleChange("description", description);
    setFillCount((count) => count + 1);
  }

  function restoreText(form: HTMLFormElement | null) {
    if (replacedText === null) return;
    handleChange("description", replacedText);
    setReplacedText(null);
    form?.querySelector<HTMLTextAreaElement>("#description")?.focus();
  }

  const hasDetailsHint = detailsToAdd !== undefined && detailsToAdd.length > 0;

  function displayError(field: FieldName): string | undefined {
    if (errors[field]) return errors[field];
    if (serverFieldErrors?.includes(field) && !dismissedServerFields.has(field)) {
      return "Please check this field.";
    }
    return undefined;
  }

  // A field already showing an error re-checks as the student types, so the message
  // goes away the moment it's fixed. Untouched fields still wait for submit.
  function handleChange(field: FieldName, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    const recheck = [field, PARTNER[field]].filter((name): name is FieldName => name !== undefined && Boolean(errors[name]));
    if (recheck.length > 0) {
      setErrors((previous) => {
        const updated = { ...previous };
        for (const name of recheck) {
          const error = fieldError(name, next);
          if (error) updated[name] = error;
          else delete updated[name];
        }
        return updated;
      });
    }
    if (serverFieldErrors?.includes(field) && !dismissedServerFields.has(field)) {
      setDismissedServerFields((previous) => new Set(previous).add(field));
    }
  }

  // Shared ARIA wiring so every input points at its own error message.
  function errorProps(field: FieldName, describedBy?: string) {
    const error = displayError(field);
    const ids = [describedBy, error ? `${field}-error` : undefined].filter(Boolean).join(" ");
    return {
      "aria-invalid": Boolean(error),
      "aria-describedby": ids || undefined,
    };
  }

  function validate(): { request: EligibilityRequest } | { errors: FieldErrors } {
    const nextErrors: FieldErrors = {};
    for (const field of FIELD_ORDER) {
      const error = fieldError(field, values);
      if (error) nextErrors[field] = error;
    }

    if (Object.keys(nextErrors).length > 0) {
      return { errors: nextErrors };
    }

    const income = parseAmount(values.income);
    const gpa = parseAmount(values.gpa);
    return {
      request: {
        description: values.description.trim(),
        country: values.country.trim() || undefined,
        state: values.state.trim() || undefined,
        income,
        // A unit alone means nothing to the agent, so it travels only with its number.
        currency: income === undefined ? undefined : values.currency,
        gpa,
        gpa_scale: gpa === undefined ? undefined : Number(values.gpa_scale),
        major: values.major.trim() || undefined,
      },
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = validate();
    if ("errors" in outcome) {
      setErrors(outcome.errors);
      const firstInvalid = FIELD_ORDER.find((field) => outcome.errors[field]);
      if (firstInvalid) {
        event.currentTarget.querySelector<HTMLElement>(`#${firstInvalid}`)?.focus();
      }
      return;
    }
    setErrors({});
    setDismissedServerFields(new Set());
    onSubmit(outcome.request);
  }

  const incomeError = displayError("income") ?? displayError("currency");
  const gradesError = displayError("gpa") ?? displayError("gpa_scale");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-7 rounded-2xl border border-hairline bg-paper p-5 shadow-card sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-caption font-semibold text-ink-secondary">
          <Sparkles aria-hidden="true" className="size-3.5 text-rust" />
          Try an example
        </span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => fillExample(example.description)}
            className="rounded-full border border-hairline bg-tint px-3 py-1.5 text-caption pointer-coarse:min-h-11 pointer-coarse:px-4 font-semibold text-ink transition-press hover:border-input hover:bg-paper active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Field id="description" label="Describe your situation" error={displayError("description")}>
          <div className="relative">
            <Textarea
              id="description"
              value={values.description}
              onChange={(event) => {
                // Restoring after the student has edited would throw their edits away.
                setReplacedText(null);
                handleChange("description", event.target.value);
              }}
              disabled={disabled}
              maxLength={DESCRIPTION_MAX}
              rows={5}
              placeholder="For example: I'm in my final year of school in India and want to study engineering. My family earns about ₹4,00,000 a year."
              {...errorProps("description", hasDetailsHint ? "description-hint description-count" : "description-count")}
            />
            {fillCount > 0 && (
              <span
                key={fillCount}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 animate-fill-flash rounded-md bg-rust-tint mix-blend-multiply"
              />
            )}
          </div>
        </Field>
        {hasDetailsHint && (
          <div id="description-hint" className="flex gap-3 rounded-xl border border-dashed border-rust/50 p-4">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
            <div className="text-sm">
              <p className="font-semibold text-ink">Add these to your description:</p>
              <ul className="mt-2 list-disc pl-5 text-ink-secondary marker:text-rust">
                {detailsToAdd.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          {/* Announced, so a replaced description never goes unnoticed. */}
          <p aria-live="polite" className="text-caption text-ink-secondary">
            {replacedText !== null && (
              <>
                The example replaced what you wrote.{" "}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(event) => restoreText(event.currentTarget.form)}
                  className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors duration-150 hover:decoration-ink disabled:opacity-50 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                >
                  Restore your text
                </button>
              </>
            )}
          </p>
          {/* Read once with the field, so the limit is known before it is hit. */}
          <p id="description-count" className="shrink-0 text-xs text-ink-secondary tabular-nums">
            {values.description.length} / {DESCRIPTION_MAX}
            <span className="sr-only"> characters used</span>
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 flex w-full items-center gap-3 text-caption font-semibold text-ink-secondary">
          Optional details that sharpen the answer
          <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="country" label="Country (optional)" error={displayError("country")}>
            <Input
              id="country"
              autoComplete="country-name"
              placeholder="e.g. India"
              value={values.country}
              onChange={(event) => handleChange("country", event.target.value)}
              disabled={disabled}
              maxLength={COUNTRY_MAX}
              {...errorProps("country")}
            />
          </Field>

          <Field id="state" label="State or region (optional)" error={displayError("state")}>
            <Input
              id="state"
              autoComplete="address-level1"
              placeholder="e.g. Maharashtra or Texas"
              value={values.state}
              onChange={(event) => handleChange("state", event.target.value)}
              disabled={disabled}
              maxLength={STATE_MAX}
              {...errorProps("state")}
            />
          </Field>

          <Field
            id="income"
            label="Yearly household income (optional)"
            error={incomeError}
            errorFor={displayError("income") ? "income" : "currency"}
          >
            <div className="flex gap-2">
              <Input
                id="income"
                inputMode="numeric"
                placeholder="e.g. 400000"
                value={values.income}
                onChange={(event) => handleChange("income", event.target.value)}
                disabled={disabled}
                {...errorProps("income")}
              />
              <UnitSelect
                id="currency"
                aria-label="Currency"
                className="w-28"
                value={values.currency}
                onChange={(event) => handleChange("currency", event.target.value)}
                disabled={disabled}
                {...errorProps("currency")}
              >
                <option value="" disabled>
                  Currency
                </option>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </UnitSelect>
            </div>
          </Field>

          <Field
            id="gpa"
            label="Grades (optional)"
            error={gradesError}
            errorFor={displayError("gpa") ? "gpa" : "gpa_scale"}
          >
            <div className="flex gap-2">
              <Input
                id="gpa"
                inputMode="decimal"
                placeholder="e.g. 3.6 or 85"
                value={values.gpa}
                onChange={(event) => handleChange("gpa", event.target.value)}
                disabled={disabled}
                {...errorProps("gpa")}
              />
              <UnitSelect
                id="gpa_scale"
                aria-label="Grading scale"
                className="w-32"
                value={values.gpa_scale}
                onChange={(event) => handleChange("gpa_scale", event.target.value)}
                disabled={disabled}
                {...errorProps("gpa_scale")}
              >
                <option value="" disabled>
                  Scale
                </option>
                {GRADE_SCALES.map((scale) => (
                  <option key={scale.value} value={scale.value}>
                    {scale.label}
                  </option>
                ))}
              </UnitSelect>
            </div>
          </Field>

          <Field id="major" label="Field of study (optional)" error={displayError("major")}>
            <Input
              id="major"
              placeholder="e.g. Engineering"
              value={values.major}
              onChange={(event) => handleChange("major", event.target.value)}
              disabled={disabled}
              maxLength={MAJOR_MAX}
              {...errorProps("major")}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-ink-secondary">Most checks take a few seconds. Nothing you enter is stored.</p>
        <Button type="submit" size="lg" disabled={disabled} className="w-full disabled:opacity-80 sm:w-auto">
          {/* Both labels share one grid cell, so the button is always as wide as the
              longer one and never jumps; only the active label is in the accessible name. */}
          <span className="grid">
            <span aria-hidden={disabled} className={labelLayerClass(!disabled)}>
              Check eligibility
              <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
            </span>
            <span aria-hidden={!disabled} className={labelLayerClass(disabled)}>
              <Loader2 aria-hidden="true" className={disabled ? "motion-safe:animate-spin" : undefined} />
              Checking eligibility...
            </span>
          </span>
        </Button>
      </div>
    </form>
  );
}
