import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const SkeletonLoader = () => (
    <div className="flex flex-col gap-6 w-full animate-pulse">
        {/* Score card skeleton */}
        <div className="bg-white rounded-2xl shadow-md w-full p-6">
            <div className="flex flex-row items-center gap-8 mb-4">
                <div className="w-40 h-20 bg-gray-200 rounded-xl" />
                <div className="flex flex-col gap-3 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48" />
                    <div className="h-3 bg-gray-200 rounded w-64" />
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <div className="flex gap-3 items-center">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <div className="flex gap-3 items-center">
                        <div className="h-4 bg-gray-200 rounded w-20" />
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <div className="flex gap-3 items-center">
                        <div className="h-4 bg-gray-200 rounded w-28" />
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <div className="flex gap-3 items-center">
                        <div className="h-4 bg-gray-200 rounded w-16" />
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
            </div>
        </div>

        {/* ATS card skeleton */}
        <div className="bg-gray-50 rounded-2xl shadow-md w-full p-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="h-6 bg-gray-200 rounded w-40" />
            </div>
            <div className="flex flex-col gap-3">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-4/6" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
        </div>

        {/* Details skeleton */}
        <div className="bg-white rounded-2xl w-full">
            {['Tone & Style', 'Content', 'Structure', 'Skills'].map((item) => (
                <div key={item} className="border-b border-gray-200 px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                            <div className="h-6 bg-gray-200 rounded w-28" />
                            <div className="h-6 bg-gray-200 rounded-full w-16" />
                        </div>
                        <div className="w-5 h-5 bg-gray-200 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            const resume = await kv.get(`resume:${id}`);
            if(!resume) return;

            const data = JSON.parse(resume);

            const resumeBlob = await fs.read(data.resumePath);
            if(!resumeBlob) return;
            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            setResumeUrl(URL.createObjectURL(pdfBlob));

            const imageBlob = await fs.read(data.imagePath);
            if(!imageBlob) return;
            setImageUrl(URL.createObjectURL(imageBlob));

            setFeedback(data.feedback);
        }

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover lg:sticky lg:top-0 items-center justify-start lg:min-h-screen lg:max-h-screen">
                    {imageUrl && resumeUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gray-100 rounded-2xl animate-pulse max-w-sm mx-auto" style={{minHeight: '400px'}} />
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <SkeletonLoader />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume