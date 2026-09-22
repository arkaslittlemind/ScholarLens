"use client";

import { useState, type FormEvent } from "react";
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

interface EligibilityFormProps {
  onSubmit: (request: EligibilityRequest) => void;
  disabled?: boolean;
}

export function EligibilityForm({ onSubmit, disabled = false }: EligibilityFormProps) {
  const [description, setDescription] = useState("");
  const [income, setIncome] = useState("");
  const [state, setState] = useState("");
  const [gpa, setGpa] = useState("");
  const [major, setMajor] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

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
      return;
    }
    setErrors({});
    onSubmit(outcome.request);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => setDescription(example.description)}
            className="rounded-full border border-ink px-3 py-1 text-sm font-medium disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Describe your situation</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          placeholder="I'm a first-year undergraduate, U.S. citizen, household income..."
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-graphite">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="income">Household income (optional)</Label>
          <Input
            id="income"
            type="number"
            min={0}
            value={income}
            onChange={(event) => setIncome(event.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.income)}
            aria-describedby={errors.income ? "income-error" : undefined}
          />
          {errors.income && (
            <p id="income-error" className="text-sm text-graphite">
              {errors.income}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State (optional)</Label>
          <Input
            id="state"
            value={state}
            onChange={(event) => setState(event.target.value)}
            disabled={disabled}
            maxLength={STATE_MAX}
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? "state-error" : undefined}
          />
          {errors.state && (
            <p id="state-error" className="text-sm text-graphite">
              {errors.state}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gpa">GPA (optional)</Label>
          <Input
            id="gpa"
            type="number"
            min={0}
            step="0.01"
            value={gpa}
            onChange={(event) => setGpa(event.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(errors.gpa)}
            aria-describedby={errors.gpa ? "gpa-error" : undefined}
          />
          {errors.gpa && (
            <p id="gpa-error" className="text-sm text-graphite">
              {errors.gpa}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="major">Major (optional)</Label>
          <Input
            id="major"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
            disabled={disabled}
            maxLength={MAJOR_MAX}
            aria-invalid={Boolean(errors.major)}
            aria-describedby={errors.major ? "major-error" : undefined}
          />
          {errors.major && (
            <p id="major-error" className="text-sm text-graphite">
              {errors.major}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={disabled} className="self-start">
        {disabled ? "Checking eligibility..." : "Check eligibility"}
      </Button>
    </form>
  );
}
