"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EligibilityRequest } from "@/lib/eligibility";

// Adapted from real profiles in backend/data/evaluation/profiles.json so the
// examples reflect what the corpus can actually answer.
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
];

const DESCRIPTION_MAX = 2000;
const STATE_MAX = 100;
const MAJOR_MAX = 200;

type FieldErrors = Partial<Record<keyof EligibilityRequest, string>>;

// Visual order of the fields, whose element ids match these names, so a failed
// submit can focus the first one that needs fixing.
const FIELD_ORDER: (keyof EligibilityRequest)[] = ["description", "income", "state", "gpa", "major"];

interface FieldProps {
  id: keyof EligibilityRequest;
  label: string;
  error: string | undefined;
  children: ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
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
}

export function EligibilityForm({ onSubmit, disabled = false, serverFieldErrors }: EligibilityFormProps) {
  const [description, setDescription] = useState("");
  const [income, setIncome] = useState("");
  const [state, setState] = useState("");
  const [gpa, setGpa] = useState("");
  const [major, setMajor] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function displayError(field: keyof EligibilityRequest): string | undefined {
    if (errors[field]) return errors[field];
    if (serverFieldErrors?.includes(field)) return "The server flagged this field. Please check it.";
    return undefined;
  }

  // Shared ARIA wiring so every input points at its own error message.
  function errorProps(field: keyof EligibilityRequest) {
    const error = displayError(field);
    return {
      "aria-invalid": Boolean(error),
      "aria-describedby": error ? `${field}-error` : undefined,
    };
  }

  function validate(): { request: EligibilityRequest } | { errors: FieldErrors } {
    const nextErrors: FieldErrors = {};
    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 1 || trimmedDescription.length > DESCRIPTION_MAX) {
      nextErrors.description = `Describe your situation in 1-${DESCRIPTION_MAX} characters.`;
    }

    let incomeValue: number | undefined;
    if (income.trim() !== "") {
      incomeValue = Number(income);
      if (!Number.isFinite(incomeValue) || incomeValue < 0) {
        nextErrors.income = "Income must be zero or a positive number.";
      }
    }

    let gpaValue: number | undefined;
    if (gpa.trim() !== "") {
      gpaValue = Number(gpa);
      if (!Number.isFinite(gpaValue) || gpaValue < 0) {
        nextErrors.gpa = "GPA must be zero or a positive number.";
      }
    }

    if (state.trim().length > STATE_MAX) {
      nextErrors.state = `State must be ${STATE_MAX} characters or fewer.`;
    }

    if (major.trim().length > MAJOR_MAX) {
      nextErrors.major = `Major must be ${MAJOR_MAX} characters or fewer.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      return { errors: nextErrors };
    }

    return {
      request: {
        description: trimmedDescription,
        income: incomeValue,
        state: state.trim() || undefined,
        gpa: gpaValue,
        major: major.trim() || undefined,
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
    onSubmit(outcome.request);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-7 rounded-2xl border border-hairline bg-paper p-5 shadow-card sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary">
          <Sparkles aria-hidden="true" className="size-3.5 text-rust" />
          Try an example
        </span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => setDescription(example.description)}
            className="rounded-full border border-hairline bg-tint px-3 py-1.5 text-[13px] font-semibold text-ink transition-press hover:border-input hover:bg-paper active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Field id="description" label="Describe your situation" error={displayError("description")}>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={disabled}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            placeholder="I'm a first-year undergraduate, U.S. citizen, household income..."
            {...errorProps("description")}
          />
        </Field>
        <p aria-hidden="true" className="self-end text-xs text-ink-secondary tabular-nums">
          {description.length} / {DESCRIPTION_MAX}
        </p>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 flex w-full items-center gap-3 text-[13px] font-semibold text-ink-secondary">
          Optional details that sharpen the answer
          <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="income" label="Household income (optional)" error={displayError("income")}>
            <Input
              id="income"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="40000"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              disabled={disabled}
              {...errorProps("income")}
            />
          </Field>

          <Field id="state" label="State (optional)" error={displayError("state")}>
            <Input
              id="state"
              placeholder="New Jersey"
              value={state}
              onChange={(event) => setState(event.target.value)}
              disabled={disabled}
              maxLength={STATE_MAX}
              {...errorProps("state")}
            />
          </Field>

          <Field id="gpa" label="GPA (optional)" error={displayError("gpa")}>
            <Input
              id="gpa"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="3.6"
              value={gpa}
              onChange={(event) => setGpa(event.target.value)}
              disabled={disabled}
              {...errorProps("gpa")}
            />
          </Field>

          <Field id="major" label="Major (optional)" error={displayError("major")}>
            <Input
              id="major"
              placeholder="Education"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              disabled={disabled}
              maxLength={MAJOR_MAX}
              {...errorProps("major")}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-secondary">Usually under a minute. Nothing is stored.</p>
        <Button type="submit" size="lg" disabled={disabled} className="w-full disabled:opacity-80 sm:w-auto">
          {disabled ? (
            <>
              <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
              Checking eligibility...
            </>
          ) : (
            <>
              Check eligibility
              <ArrowRight aria-hidden="true" className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
