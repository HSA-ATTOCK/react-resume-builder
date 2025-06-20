import { useState, useEffect } from "react";
import ResumeForm from "./components/ResumeForm";
import ResumePreview from "./components/ResumePreview";
import LoadingSpinner from "./components/LoadingSpinner";

// Initial form state
const INITIAL_RESUME_DATA = {
  photo: "",
  fullName: "",
  email: "",
  phone: "",
  whatsapp: "",
  profile: "",
  objective: "",
  skills: "",
  link: "",
  languages: "",
  dob: "",
  nationality: "",
  religion: "",
  maritalStatus: "",
  license: "",
  education: [{ institute: "", degree: "" }],
  experience: [{ title: "", company: "", period: "", details: [""] }],
  projects: [{ title: "", role: "", description: "", skills: "" }],
};

// Custom hook for localStorage persistence
const usePersistedState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : initialValue;
    } catch (error) {
      console.error("Error reading localStorage:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [key, state]);

  return [state, setState];
};

function App() {
  const [formData, setFormData] = usePersistedState(
    "resumeForm",
    INITIAL_RESUME_DATA
  );
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading (remove in production)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields?")) {
      setFormData(INITIAL_RESUME_DATA);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Resume Builder</h1>
          <button
            onClick={handleReset}
            className="reset-button" // Single class name
          >
            Reset All Fields
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Form Section */}
          <div className="lg:w-1/2 w-full">
            <div className="bg-white shadow-xl rounded-xl p-6 sticky top-6 h-fit">
              <ResumeForm formData={formData} setFormData={setFormData} />
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:w-1/2 w-full">
            <div className="bg-white shadow-xl rounded-xl p-6">
              <ResumePreview formData={formData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
