import { MessageSquareQuote } from "lucide-react";
import { useState } from "react";

import { TitleIcon } from "@/components/ui/TitleIcon";

import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { CadenceRatingGroup } from "./CadenceRatingGroup";

export function FeedbackSurveyCard() {
  const t = useT(STRINGS);
  const [rating, setRating] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  return (
    <div className="mx-auto w-full max-w-[624px]">
      <div data-testid="feedback-form" className="rounded-xl border border-line bg-panel p-6 shadow-xs">
        <h1 className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
          <TitleIcon icon={MessageSquareQuote} />
          {t("surveyTitle")}
        </h1>
        <p className="mb-0 mt-1 text-xs text-muted">{t("surveySubtitle")}</p>

        <div className="mt-4 flex flex-col gap-4">
          <CadenceRatingGroup value={rating} onChange={setRating} />

          <div>
            <label htmlFor="feedback-comments" className="mb-1 block text-xs font-bold text-ink">
              {t("commentsLabel")}
            </label>
            <textarea
              id="feedback-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t("commentsPlaceholder")}
              rows={3}
              className="w-full resize-y rounded-lg border border-line bg-[#F4F7F6] p-2.5 text-xs text-ink outline-none transition placeholder:text-muted focus:border-[#4FB840]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              onClick={() => window.alert(t("submittedAlert"))}
              className="rounded-lg bg-[#4FB840] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#72C02C] touch:min-h-[44px]"
            >
              {t("submitButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
