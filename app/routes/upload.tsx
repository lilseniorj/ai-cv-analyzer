import { type FormEvent, useState } from 'react';
import Navbar from '~/components/Navbar';
import FileUploader from '~/components/FileUploader';
import { usePuterStore } from '~/lib/puter';
import { useNavigate } from 'react-router';
import { convertPdfToImage } from '~/lib/pdf2img';
import { generateUUID } from '~/lib/utils';
import { prepareInstructions } from '../../constants';

const getProgress = (statusText: string) => {
  if (statusText.startsWith('Uploading the file')) return 10;
  if (statusText.startsWith('Converting')) return 30;
  if (statusText.startsWith('Uploading the image')) return 50;
  if (statusText.startsWith('Preparing')) return 65;
  if (statusText.startsWith('Analyzing')) return 80;
  if (statusText.startsWith('Analysis complete')) return 100;
  return 0;
};

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => setFile(file);

  const handleReset = () => {
    setIsProcessing(false);
    setStatusText('');
  };

  const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File }) => {
    setIsProcessing(true);
    setStatusText('Uploading the file...');

    const uploadedFile = await fs.upload([file]);
    if (!uploadedFile) return setStatusText('Error: Failed to upload file');

    setStatusText('Converting to image...');
    const imageFile = await convertPdfToImage(file);
    if (!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');

    setStatusText('Uploading the image...');
    const uploadedImage = await fs.upload([imageFile.file]);
    if (!uploadedImage) return setStatusText('Error: Failed to upload image');

    setStatusText('Preparing data...');
    const uuid = generateUUID();

    const data = {
      id: uuid,
      resumePath: uploadedFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback: '',
    };

    await kv.set(`resume:${uuid}`, JSON.stringify(data));

    setStatusText('Analyzing resume... This may take a few minutes.');

    const feedback = await ai.feedback(uploadedFile.path, prepareInstructions({ jobTitle, jobDescription }));
    if (!feedback) return setStatusText('Error: Failed to analyze resume');

    const feedbackText = typeof feedback.message.content === 'string'
      ? feedback.message.content
      : feedback.message.content[0].text;

    const cleanText = feedbackText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      data.feedback = JSON.parse(cleanText);
    } catch (e) {
      return setStatusText('Error: Failed to parse AI response');
    }

    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText('Analysis complete! Redirecting...');
    navigate(`/resume/${uuid}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (!form) return;

    const formData = new FormData(form);
    const companyName = formData.get('company-name') as string;
    const jobTitle = formData.get('job-title') as string;
    const jobDescription = formData.get('job-description') as string;
    if (!file) return;

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  const progress = getProgress(statusText);
  const isError = statusText.startsWith('Error');

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <div className="flex flex-col items-center gap-6 mt-8 w-full max-w-md mx-auto">
              {/* Error icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isError ? 'bg-red-50' : 'bg-transparent'
              }`}>
                {isError ? (
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                )}
              </div>

              {/* Status text */}
              <div className="flex flex-col items-center gap-1">
                <p className={`text-base font-medium text-center ${isError ? 'text-red-500' : 'text-gray-800'}`}>
                  {statusText}
                </p>
                <p className="text-sm text-gray-400 text-center">
                  {isError ? 'The analysis could not be completed' : "Please don't close this tab"}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full flex flex-col gap-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ease-in-out ${
                      isError ? 'bg-red-400' : 'bg-blue-500'
                    }`}
                    style={{ width: isError ? '50%' : `${progress}%` }}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col items-center gap-3 w-full">
                <button className="primary-button w-full" onClick={handleReset}>
                  Try Again
                </button>
                {isError && (
                  <button
                    className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
                    onClick={() => navigate('/')}
                  >
                    Go back to home
                  </button>
                )}
                {!isError && (
                  <button
                    className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
                    onClick={handleReset}
                  >
                    Cancel and try again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isProcessing && (
            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
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