import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";

export const meta = () => [
  { title: "Resumind | Review " },
  { name: "description", content: "Detailed overview of your resume" },
];

type Tip = { type: "good" | "improve"; tip: string; explanation?: string };

type UiFeedback = {
  overall_rating: number;
  ats?: {
    score?: number;
    suggestions?: { type: "good" | "improve"; tip: string }[];
  };
  toneAndStyle: { score?: number; tips?: Tip[] };
  content: { score?: number; tips?: Tip[] };
  structure: { score?: number; tips?: Tip[] };
  skills: { score?: number; tips?: Tip[] };
};

const clamp0to100 = (n: unknown) => {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 0;
};

const asStringArray = (v: any): string[] =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const extractJsonFromText = (text: string): any | null => {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
};

const normalizeFeedbackToUi = (input: unknown): UiFeedback | null => {
  let raw: any = input;
  if (!raw) return null;

  if (typeof raw === "string") {
    const direct = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    raw = direct ?? extractJsonFromText(raw) ?? { rawText: raw };
  }

  const overall = clamp0to100(
    raw?.overall_rating ?? raw?.overallScore ?? raw?.score ?? 0
  );

  const atsScore = clamp0to100(
    raw?.ats_compatibility ??
      raw?.ats?.score ??
      raw?.atsScore ??
      raw?.ats_score ??
      0
  );

  const atsSuggestions = asStringArray(raw?.ats_issues).map((tip) => ({
    type: "improve" as const,
    tip,
  }));

  const strengths = asStringArray(raw?.strengths).map((tip) => ({
    type: "good" as const,
    tip,
    explanation: "",
  }));

  const weaknesses = asStringArray(raw?.weaknesses).map((tip) => ({
    type: "improve" as const,
    tip,
    explanation: "",
  }));

  const improvements = asStringArray(
    raw?.specific_improvements ?? raw?.recommendations
  ).map((tip) => ({
    type: "improve" as const,
    tip,
    explanation: "",
  }));

  const missingKeywords = asStringArray(raw?.missing_keywords).map((kw) => ({
    type: "improve" as const,
    tip: `Add keyword: ${kw}`,
    explanation: "",
  }));

  return {
    overall_rating: overall,
    ats: { score: atsScore, suggestions: atsSuggestions },
    toneAndStyle: { score: 0, tips: [] },
    structure: { score: 0, tips: [] },
    content: { score: 0, tips: [...strengths, ...weaknesses, ...improvements] },
    skills: { score: 0, tips: missingKeywords },
  };
};

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedbackRaw, setFeedbackRaw] = useState<unknown>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated)
      navigate(`/auth?next=/resume/${id}`);
  }, [isLoading, auth.isAuthenticated, id, navigate]);

  useEffect(() => {
    let resumeObjectUrl: string | null = null;
    let imageObjectUrl: string | null = null;

    const loadResume = async () => {
      const resume = await kv.get(`resume:${id}`);
      if (!resume) return;

      const data = JSON.parse(resume);

      const resumeBlob = await fs.read(data.resumePath);
      if (resumeBlob) {
        const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
        resumeObjectUrl = URL.createObjectURL(pdfBlob);
        setResumeUrl(resumeObjectUrl);
      }

      const imageBlob = await fs.read(data.imagePath);
      if (imageBlob) {
        imageObjectUrl = URL.createObjectURL(imageBlob);
        setImageUrl(imageObjectUrl);
      }

      setFeedbackRaw(data.feedback ?? null);
    };

    if (id) void loadResume();

    return () => {
      if (resumeObjectUrl) URL.revokeObjectURL(resumeObjectUrl);
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [id, fs, kv]);

  const feedback = useMemo(
    () => normalizeFeedbackToUi(feedbackRaw),
    [feedbackRaw]
  );

  return (
    <main>
      <Link to="/home">Back to Homepage</Link>

      {imageUrl && resumeUrl && (
        <a href={resumeUrl} target="_blank" rel="noreferrer">
          resume
        </a>
      )}

      <h1>Resume Review</h1>

      {feedback ? (
        <>
          <Summary feedback={feedback as any} />
          <ATS
            score={feedback.ats?.score ?? 0}
            suggestions={feedback.ats?.suggestions ?? []}
          />
          <Details feedback={feedback as any} />
        </>
      ) : (
        <p>Loading feedback…</p>
      )}
    </main>
  );
};

export default Resume;
