
import React from "react";
import { Check } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Include uppercase letters", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Include numbers", test: (p: string) => /[0-9]/.test(p) },
  { label: "Include special characters", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const metRequirements = REQUIREMENTS.map((r) => r.test(password));
  const score = metRequirements.filter(Boolean).length;

  const strengthLabel = score <= 1 ? "Weak" : score <= 3 ? "Medium" : "Strong password";
  const barColor = score <= 1 ? "bg-destructive" : score <= 3 ? "bg-yellow-500" : "bg-green-500";
  const textColor = score <= 1 ? "text-destructive" : score <= 3 ? "text-yellow-600" : "text-green-600";

  const unmetRequirements = REQUIREMENTS.filter((_, i) => !metRequirements[i]);

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < score ? barColor : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className={`text-xs font-medium ${textColor}`}>{strengthLabel}</p>

      {/* Dynamic suggestions — hidden when all met */}
      {unmetRequirements.length > 0 && (
        <ul className="space-y-0.5">
          {REQUIREMENTS.map((req, i) => (
            <li
              key={req.label}
              className={`text-xs flex items-center gap-1.5 transition-all duration-200 ${
                metRequirements[i] ? "text-green-600 line-through opacity-60" : "text-muted-foreground"
              }`}
            >
              {metRequirements[i] && <Check className="h-3 w-3 shrink-0" />}
              {!metRequirements[i] && <span className="h-3 w-3 shrink-0 inline-block rounded-full border border-muted-foreground/40" />}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
