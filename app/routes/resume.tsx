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

const asArray = (v: any) => (Array.isArray(v) ? v : []);

const normalizeTips = (tips: any): Tip[] => {
  const arr = asArray(tips);
  return arr
    .map((t: any) => ({
      type: t?.type === "good" ? "good" : "improve",
      tip: typeof t?.tip === "string" ? t.tip : typeof t === "string" ? t : "",
      explanation:
        typeof t?.explanation === "string" ? t.explanation : undefined,
    }))
    .filter((t: Tip) => t.tip.trim().length > 0);
};

const normalizeCategory = (obj: any): { score?: number; tips?: Tip[] } => {
  const score =
    obj?.score ??
    obj?.rating ??
    obj?.value ??
    obj?.points ??
    obj?.outOf100 ??
    obj?.out_of_100 ??
    obj?.out_of_100_score;

  const tips = obj?.tips ?? obj?.suggestions ?? obj?.feedback ?? obj?.items;
  return { score: clamp0to100(score), tips: normalizeTips(tips) };
};

const normalizeFeedbackToUi = (input: unknown): UiFeedback | null => {
  let raw: any = input;

  if (!raw) return null;

  if (typeof raw === "string") {
    const parsedDirect = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    raw = parsedDirect ?? extractJsonFromText(raw) ?? { rawText: raw };
  }

  const tone = normalizeCategory(
    raw?.toneAndStyle ?? raw?.tone_style ?? raw?.tone ?? raw?.style
  );
  const content = normalizeCategory(raw?.content);
  const structure = normalizeCategory(raw?.structure ?? raw?.format);
  const skills = normalizeCategory(raw?.skills ?? raw?.skill);

  const overall =
    raw?.overall_rating ??
    raw?.overallScore ??
    raw?.overall?.score ??
    raw?.score ??
    raw?.atsScore ??
    (() => {
      const vals = [
        tone.score,
        content.score,
        structure.score,
        skills.score,
      ].map(clamp0to100);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.round(avg * 10) / 10;
    })();

  const atsScore =
    raw?.ats?.score ??
    raw?.atsScore ??
    raw?.ats_score ??
    raw?.ats ??
    raw?.scores?.ats;

  const atsSuggestions = asArray(
    raw?.ats?.suggestions ?? raw?.atsSuggestions ?? raw?.ats_tips
  ).map((s: any) => ({
    type: s?.type === "good" ? "good" : "improve",
    tip: typeof s?.tip === "string" ? s.tip : typeof s === "string" ? s : "",
  }));

  return {
    overall_rating: clamp0to100(overall),
    ats: {
      score: clamp0to100(atsScore),
      suggestions: atsSuggestions.filter((s: any) => s.tip),
    },
    toneAndStyle: tone,
    content,
    structure,
    skills,
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
            score={feedback.ats?.score ?? feedback.overall_rating}
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
