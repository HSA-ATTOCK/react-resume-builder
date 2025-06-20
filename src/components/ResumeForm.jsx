import React, { useState, useRef, useCallback } from "react";
import ImageCropper from "./ImageCropper";

function ResumeForm({ formData, setFormData }) {
  const [cropImage, setCropImage] = useState(null);
  const fileInputRef = useRef(null);

  // Memoized handlers for better performance
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [setFormData]
  );

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImage(reader.result);
    };
    reader.onerror = () => {
      alert("Error reading file");
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCropComplete = useCallback(
    (croppedUrl) => {
      setFormData((prev) => ({ ...prev, photo: croppedUrl }));
      setCropImage(null);
    },
    [setFormData]
  );

  const addNewLink = () => {
    setFormData((prev) => ({
      ...prev,
      links: [...(prev.links || []), { url: "" }],
    }));
  };

  const removeLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links?.filter((_, i) => i !== index),
    }));
  };

  const handleLinkChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links?.map((link, i) =>
        i === index ? { ...link, url: value } : link
      ),
    }));
  };

  const updateNestedArray = useCallback(
    (section, index, key, value) => {
      setFormData((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      }));
    },
    [setFormData]
  );

  const addItem = useCallback(
    (section, newItem) => {
      setFormData((prev) => ({
        ...prev,
        [section]: [...prev[section], newItem],
      }));
    },
    [setFormData]
  );

  const removeItem = useCallback(
    (section, index) => {
      setFormData((prev) => ({
        ...prev,
        [section]: prev[section].filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  // Field configuration for DRY code
  const personalInfoFields = ["fullName", "phone", "whatsapp", "email"];
  const textAreaFields = ["profile", "objective"];
  const additionalInfoFields = [
    "skills",
    "languages",
    "dob",
    "nationality",
    "religion",
    "maritalStatus",
    "license",
  ];

  return (
    <>
      {cropImage && (
        <ImageCropper
          image={cropImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      )}

      <form className="space-y-6">
        {/* === Personal Info === */}
        <section className="section">
          <h2 className="section-title">👤 Personal Information</h2>

          {/* === Photo Upload Section === */}
          <div className="form-group photo-upload">
            <label htmlFor="photo-upload" className="photo-label">
              Profile Photo
            </label>

            {formData.photo && (
              <div className="photo-preview">
                <img
                  src={formData.photo}
                  alt="Profile"
                  className="photo-preview-image"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="photo-button"
            >
              {formData.photo ? "Change Photo" : "Choose Photo"}
            </button>

            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden-file-input"
              ref={fileInputRef}
            />
          </div>

          <div className="grid-2">
            {personalInfoFields.map((field) => (
              <div className="form-group" key={field}>
                <label htmlFor={field}>
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  id={field}
                  name={field}
                  value={formData[field] || ""}
                  onChange={handleChange}
                  className="input"
                  placeholder={`Enter your ${field.replace(/([A-Z])/g, " $1")}`}
                />
              </div>
            ))}
          </div>

          {textAreaFields.map((field) => (
            <div className="form-group" key={field}>
              <label htmlFor={field}>{field.replace(/([A-Z])/g, " $1")}</label>
              <textarea
                id={field}
                name={field}
                value={formData[field] || ""}
                onChange={handleChange}
                className="input"
                rows={4}
                placeholder={`Describe your ${field.replace(
                  /([A-Z])/g,
                  " $1"
                )}`}
              />
            </div>
          ))}
        </section>

        {/* === Education === */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">🎓 Education</h2>
            <button
              type="button"
              onClick={() =>
                addItem("education", { institute: "", degree: "" })
              }
              className="btn-link"
            >
              + Add Education
            </button>
          </div>
          {formData.education.map((edu, i) => (
            <div className="card" key={i}>
              <button
                type="button"
                onClick={() => removeItem("education", i)}
                className="remove-btn"
                aria-label="Remove education"
              >
                ✖
              </button>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor={`institute-${i}`}>Institute</label>
                  <input
                    id={`institute-${i}`}
                    value={edu.institute}
                    onChange={(e) =>
                      updateNestedArray(
                        "education",
                        i,
                        "institute",
                        e.target.value
                      )
                    }
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`degree-${i}`}>Degree</label>
                  <input
                    id={`degree-${i}`}
                    value={edu.degree}
                    onChange={(e) =>
                      updateNestedArray(
                        "education",
                        i,
                        "degree",
                        e.target.value
                      )
                    }
                    className="input"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* === Work Experience === */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">💼 Work Experience</h2>
            <button
              type="button"
              onClick={() =>
                addItem("experience", {
                  title: "",
                  company: "",
                  period: "",
                  details: [""],
                })
              }
              className="btn-link"
            >
              + Add Experience
            </button>
          </div>
          {formData.experience.map((exp, i) => (
            <div className="card" key={i}>
              <button
                type="button"
                onClick={() => removeItem("experience", i)}
                className="remove-btn"
                aria-label="Remove experience"
              >
                ✖
              </button>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor={`title-${i}`}>Job Title</label>
                  <input
                    id={`title-${i}`}
                    value={exp.title}
                    onChange={(e) =>
                      updateNestedArray(
                        "experience",
                        i,
                        "title",
                        e.target.value
                      )
                    }
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`company-${i}`}>Company</label>
                  <input
                    id={`company-${i}`}
                    value={exp.company}
                    onChange={(e) =>
                      updateNestedArray(
                        "experience",
                        i,
                        "company",
                        e.target.value
                      )
                    }
                    className="input"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor={`period-${i}`}>Duration</label>
                  <input
                    id={`period-${i}`}
                    value={exp.period}
                    onChange={(e) =>
                      updateNestedArray(
                        "experience",
                        i,
                        "period",
                        e.target.value
                      )
                    }
                    className="input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor={`details-${i}`}>Responsibilities</label>
                <textarea
                  id={`details-${i}`}
                  value={exp.details[0]}
                  onChange={(e) => {
                    const updated = [...formData.experience];
                    updated[i].details[0] = e.target.value;
                    setFormData({ ...formData, experience: updated });
                  }}
                  className="input"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </section>

        {/* === Projects === */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">💡 Projects</h2>
            <button
              type="button"
              onClick={() =>
                addItem("projects", {
                  title: "",
                  role: "",
                  description: "",
                  skills: "",
                  link: "",
                })
              }
              className="btn-link"
            >
              + Add Project
            </button>
          </div>
          {formData.projects.map((proj, i) => (
            <div className="card" key={i}>
              <button
                type="button"
                onClick={() => removeItem("projects", i)}
                className="remove-btn"
                aria-label="Remove project"
              >
                ✖
              </button>
              {["title", "role", "skills"].map((field) => (
                <div className="form-group" key={field}>
                  <label htmlFor={`${field}-${i}`}>{field}</label>
                  <input
                    id={`${field}-${i}`}
                    value={proj[field]}
                    onChange={(e) =>
                      updateNestedArray("projects", i, "field", e.target.value)
                    }
                    className="input"
                  />
                </div>
              ))}
              {/* Link Input Field (stays in form) */}
              <div className="form-group">
                <label htmlFor={`link-${i}`}>Project Link (URL)</label>
                <input
                  id={`link-${i}`}
                  type="url"
                  value={proj.link || ""}
                  onChange={(e) =>
                    updateNestedArray("projects", i, "link", e.target.value)
                  }
                  className="input"
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor={`description-${i}`}>Description</label>
                <textarea
                  id={`description-${i}`}
                  value={proj.description}
                  onChange={(e) =>
                    updateNestedArray(
                      "projects",
                      i,
                      "description",
                      e.target.value
                    )
                  }
                  className="input"
                  rows={3}
                />
              </div>
              {/* Removed the clickable link box from form */}
            </div>
          ))}
        </section>

        {/* === Additional Info === */}
        <section className="section">
          <h2 className="section-title">📄 Additional Information</h2>
          <div className="grid-2">
            {additionalInfoFields.map((field) => (
              <div className="form-group" key={field}>
                <label htmlFor={field}>
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  id={field}
                  name={field}
                  value={formData[field] || ""}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            ))}

            {/* Links Management Section */}
            <div className="form-group full-width">
              <label>Links</label>
              {formData.links?.map((link, index) => (
                <div key={index} className="link-item">
                  <input
                    type="url"
                    value={link.url || ""}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    className="input"
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="remove-link-btn"
                    aria-label="Remove link"
                  >
                    ✖
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addNewLink}
                className="add-link-btn"
              >
                + Add Link
              </button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}

export default ResumeForm;
