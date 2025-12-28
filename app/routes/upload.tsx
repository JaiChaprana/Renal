import { type FormEvent, useEffect, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

type ResumeKV = {
  id: string;
  resumePath: string;
  imagePath: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  feedback: unknown;
};

const extractJsonFromText = (text: string) => {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
};

const Upload = () => {
  const { auth, fs, ai, kv, puterReady } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (selected: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(selected);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    setStatusText("");

    try {
      if (!puterReady) {
        setStatusText(
          "Error: Puter is not ready yet. Please wait and try again."
        );
        return;
      }

      if (!auth.isAuthenticated) {
        setStatusText("Error: Please sign in first.");
        return;
      }

      setStatusText("Uploading the file...");
      const uploadedFile = await fs.upload([file]);
      if (!uploadedFile?.path) {
        setStatusText("Error: Failed to upload file");
        return;
      }

      setStatusText("Converting to image...");
      const image = await convertPdfToImage(file);
      if (image.imageUrl) setPreviewUrl(image.imageUrl);
      if (!image.file) {
        setStatusText(image.error ?? "Error: Failed to convert PDF to image");
        return;
      }

      setStatusText("Uploading the image...");
      const uploadedImage = await fs.upload([image.file]);
      if (!uploadedImage?.path) {
        setStatusText("Error: Failed to upload image");
        return;
      }

      setStatusText("Preparing data...");
      const uuid = generateUUID();
      const data: ResumeKV = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null,
      };

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText("Analyzing...");
      const feedback = await ai.feedback(
        uploadedFile.path,
        prepareInstructions({ jobTitle, jobDescription })
      );

      const content = feedback?.message?.content;
      const feedbackText =
        typeof content === "string"
          ? content
          : Array.isArray(content) &&
              content[0] &&
              typeof content[0].text === "string"
            ? content[0].text
            : null;

      if (!feedbackText) {
        setStatusText("Error: Unexpected AI response format");
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(feedbackText);
      } catch {
        parsed = extractJsonFromText(feedbackText) ?? { rawText: feedbackText };
      }

      data.feedback = parsed;
      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText("Analysis complete, redirecting...");
      navigate(`/resume/${uuid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;

    const formData = new FormData(form);
    const companyName = (formData.get("company-name") as string) || "";
    const jobTitle = (formData.get("job-title") as string) || "";
    const jobDescription = (formData.get("job-description") as string) || "";

    if (!file) return;
    void handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main>
      <Navbar />
      <section className="upload-section">
        <div className="upload-container">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              {previewUrl ? (
                <img src={previewUrl} alt="Resume preview" />
              ) : null}
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isProcessing && (
            <form onSubmit={handleSubmit}>
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;
