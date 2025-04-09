
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PasswordStrengthMeterProps {
  score: number;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ score }) => {
  const { t } = useLanguage();

  let strengthLabel = "";
  let strengthColor = "";

  if (score === 0) {
    strengthLabel = t.signup.passwordWeak;
    strengthColor = "bg-red-500";
  } else if (score < 3) {
    strengthLabel = t.signup.passwordMedium;
    strengthColor = "bg-yellow-500";
  } else {
    strengthLabel = t.signup.passwordStrong;
    strengthColor = "bg-green-500";
  }

  const bars = [1, 2, 3, 4].map((index) => (
    <div 
      key={index}
      className={`h-2 flex-1 rounded-full transition-colors ${
        index <= score ? strengthColor : "bg-gray-200"
      }`}
    />
  ));

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">{bars}</div>
      {score > 0 && (
        <p className={`text-xs font-medium ${
          score === 0 ? "text-red-500" : 
          score < 3 ? "text-yellow-500" : "text-green-500"
        }`}>
          {strengthLabel}
        </p>
      )}
    </div>
  );
};
