import ScoreGauge from "./ScoreGauge";
import ScoreBadge from "./ScoreBadge";

type ScoreSection = { score?: number };

const Category = ({ title, score }: { title: string; score?: number }) => {
  const safeScore = score ?? 0;

  const textColor =
    safeScore > 70
      ? "text-green-600"
      : safeScore > 49
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="resume-summary">
      <div className="category">
        <div className="flex flex-row gap-2 items-center justify-center">
          <p className="text-2xl">{title}</p>
          <ScoreBadge score={safeScore} />
        </div>
        <p className="text-2xl">
          <span className={textColor}>{safeScore}</span>/100
        </p>
      </div>
    </div>
  );
};

const Summary = ({ feedback }: { feedback: Feedback | null }) => {
  // If feedback isn't ready yet, don't render the score UI.
  if (!feedback) return null;

  const overall_rating = feedback.overall_rating ?? 0;

  const toneAndStyle: ScoreSection = feedback.toneAndStyle ?? {};
  const content: ScoreSection = feedback.content ?? {};
  const structure: ScoreSection = feedback.structure ?? {};
  const skills: ScoreSection = feedback.skills ?? {};

  return (
    <div className="bg-white rounded-2xl shadow-md w-full">
      <div className="flex flex-row items-center p-4 gap-8">
        <ScoreGauge score={overall_rating} />

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">Your Resume Score</h2>
          <p className="text-sm text-gray-500">
            This score is calculated based on the variables listed below.
          </p>
        </div>
      </div>

      <Category title="Tone & Style" score={toneAndStyle.score ?? 0} />
      <Category title="Content" score={content.score ?? 0} />
      <Category title="Structure" score={structure.score ?? 0} />
      <Category title="Skills" score={skills.score ?? 0} />
    </div>
  );
};

export default Summary;
