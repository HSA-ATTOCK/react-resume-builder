import React, { useState, useRef, useCallback } from "react";
import ImageCropper from "./ImageCropper";

function ResumeForm({ formData, setFormData }) {
  const [cropImage, setCropImage] = useState(null);
  const fileInputRef = useRef(null);

  console.log("Custom Links:", formData.customLinks);

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
  // Crop complete handler (from ImageCropper)
  const handleCropComplete = useCallback(
    (croppedUrl) => {
      setFormData((prev) => ({ ...prev, photo: croppedUrl }));
      setCropImage(null);
    },
    [setFormData]
  );

  const updateNestedArray = useCallback(
    (section, index, key, value) => {
      setFormData((prev) => ({
        ...prev,
        [section]: (prev[section] || []).map((item, i) =>
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
        [section]: [...(prev[section] || []), newItem],
      }));
    },
    [setFormData]
  );

  const removeItem = useCallback(
    (section, index) => {
      setFormData((prev) => ({
        ...prev,
        [section]: (prev[section] || []).filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  // Helper function to check if an item has filled fields
  const hasFilledFields = useCallback((item, section) => {
    if (!item) return false;

    switch (section) {
      case "customLinks":
        return !!(item.title?.trim() || item.url?.trim());
      case "education":
        return !!(item.degree?.trim() || item.institute?.trim());
      case "experience":
        return !!(
          item.title?.trim() ||
          item.company?.trim() ||
          item.period?.trim() ||
          (item.details && item.details[0]?.trim())
        );
      case "projects":
        return !!(
          item.title?.trim() ||
          item.role?.trim() ||
          item.description?.trim() ||
          item.skills?.trim() ||
          item.link?.trim() ||
          item.Link?.trim()
        );
      default:
        return false;
    }
  }, []);

  // Remove item with confirmation if fields are filled
  const handleRemoveItem = useCallback(
    (section, index) => {
      const item = formData[section]?.[index];

      if (hasFilledFields(item, section)) {
        const confirmed = window.confirm(
          "This item contains filled fields. Are you sure you want to delete it?"
        );
        if (!confirmed) return;
      }

      removeItem(section, index);
    },
    [formData, hasFilledFields, removeItem]
  );

  // Move item up/down within an array section
  const moveItem = useCallback(
    (section, fromIndex, toIndex) => {
      setFormData((prev) => {
        const arr = [...(prev[section] || [])];
        if (toIndex < 0 || toIndex > arr.length) return prev;
        const [item] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, item);
        return { ...prev, [section]: arr };
      });
    },
    [setFormData]
  );
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragState, setDragState] = React.useState({});
  // Collapsible sections state: true = expanded
  const [expanded, setExpanded] = React.useState({
    customLinks: true,
    education: true,
    experience: true,
    projects: true,
  });

  const toggleSection = useCallback((section) => {
    setExpanded((s) => ({ ...s, [section]: !s[section] }));
  }, []);

  // When a section receives focus, collapse others to help navigation
  const focusSection = useCallback((section) => {
    setExpanded({
      customLinks: false,
      education: false,
      experience: false,
      projects: false,
      [section]: true,
    });
  }, []);

  const handleDragStart = useCallback((section, index, e) => {
    dragItem.current = { section, index };
    e.dataTransfer.effectAllowed = "move";
    try {
      // Some browsers require data to be set for drag to work
      e.dataTransfer.setData("text/plain", "");
    } catch (err) {
      /* ignore */
    }
  }, []);

  const handleDragEnter = useCallback((section, index, e) => {
    e.preventDefault();
    if (dragItem.current && dragItem.current.section === section) {
      dragOverItem.current = { section, index };
      setDragState((s) => ({ ...s, [section]: index }));
    }
  }, []);

  const handleDrop = useCallback(
    (section, index, e) => {
      e.preventDefault();
      const from = dragItem.current;
      const over = dragOverItem.current || { section, index };
      if (!from) return;
      if (from.section !== over.section) return;

      // Simpler, more consistent rule:
      // - if dragging down (from.index < over.index): insert after the hovered item
      // - if dragging up (from.index > over.index): insert before the hovered item
      let toIndex = from.index < over.index ? over.index + 1 : over.index;

      // Normalize for removal shifting (removing earlier shifts later indices left)
      if (from.index < toIndex) toIndex = toIndex - 1;

      if (from.index !== toIndex) {
        moveItem(section, from.index, toIndex);
      }

      dragItem.current = null;
      dragOverItem.current = null;
      setDragState((s) => ({ ...s, [section]: null }));
    },
    [moveItem]
  );

  // Drop on empty area / end of list: append to end
  const handleDropOnList = useCallback(
    (section, e) => {
      e.preventDefault();
      const from = dragItem.current;
      if (!from || from.section !== section) return;
      const len = (formData[section] || []).length;
      let toIndex = len; // insert at end
      // normalize when dragging from earlier in list
      if (from.index < toIndex) toIndex = toIndex - 1;
      if (from.index !== toIndex) moveItem(section, from.index, toIndex);
      dragItem.current = null;
      dragOverItem.current = null;
      setDragState((s) => ({ ...s, [section]: null }));
    },
    [formData, moveItem]
  );

  // Field configuration for DRY code
  const personalInfoFields = [
    "fullName",
    "title",
    "phone",
    "whatsapp",
    "email",
    "dob",
    "nationality",
    "license",
  ];
  const textAreaFields = ["profile", "objective"];
  const additionalInfoFields = [
    "skills",
    "languages",
    // "religion",
    // "maritalStatus",
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
          {/* Custom Link Section */}
          <div className="section-header">
            <h3 className="section-subtitle">🔗 Social Links</h3>
            <div>
              {/* Only show expand/collapse when there is at least one link */}
              {Array.isArray(formData.customLinks) &&
                formData.customLinks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection("customLinks")}
                    className="btn-link"
                    aria-expanded={!!expanded.customLinks}
                  >
                    {expanded.customLinks ? "− Collapse" : "+ Expand"}
                  </button>
                )}
            </div>
          </div>
          {/* Centered add button when section is expanded */}
          {expanded.customLinks && (
            <div className="section-actions-center">
              <button
                type="button"
                onClick={() => addItem("customLinks", { title: "", url: "" })}
                className="btn-link"
              >
                + Add Link
              </button>
            </div>
          )}

          {expanded.customLinks && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnList("customLinks", e)}
            >
              {formData.customLinks?.map((link, i) => (
                <div
                  className={`card ${
                    dragState["customLinks"] === i ? "drag-over" : ""
                  }`}
                  key={i}
                  onDragEnter={(e) => handleDragEnter("customLinks", i, e)}
                  onDrop={(e) => handleDrop("customLinks", i, e)}
                >
                  <div className="card-actions">
                    <div
                      className="drag-handle"
                      aria-hidden
                      draggable
                      onDragStart={(e) => handleDragStart("customLinks", i, e)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <circle cx="4" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="12" r="1.25" fill="currentColor" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem("customLinks", i)}
                      className="remove-btn"
                      aria-label="Remove link"
                    >
                      ✖
                    </button>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label htmlFor={`link-title-${i}`}>Title</label>
                      <input
                        id={`link-title-${i}`}
                        value={link.title}
                        onChange={(e) =>
                          updateNestedArray(
                            "customLinks",
                            i,
                            "title",
                            e.target.value
                          )
                        }
                        className="input"
                        placeholder="e.g., GitHub"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`link-url-${i}`}>URL</label>
                      <input
                        id={`link-url-${i}`}
                        value={link.url}
                        onChange={(e) =>
                          updateNestedArray(
                            "customLinks",
                            i,
                            "url",
                            e.target.value
                          )
                        }
                        className="input"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
            <div>
              {Array.isArray(formData.education) &&
                formData.education.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection("education")}
                    className="btn-link"
                    aria-expanded={!!expanded.education}
                  >
                    {expanded.education ? "− Collapse" : "+ Expand"}
                  </button>
                )}
            </div>
          </div>
          {/* Centered add button when section is expanded */}
          {expanded.education && (
            <div className="section-actions-center">
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
          )}
          {expanded.education && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnList("education", e)}
            >
              {formData.education.map((edu, i) => (
                <div
                  className={`card ${
                    dragState["education"] === i ? "drag-over" : ""
                  }`}
                  key={i}
                  onDragEnter={(e) => handleDragEnter("education", i, e)}
                  onDrop={(e) => handleDrop("education", i, e)}
                >
                  <div className="card-actions">
                    <div
                      className="drag-handle"
                      aria-hidden
                      draggable
                      onDragStart={(e) => handleDragStart("education", i, e)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <circle cx="4" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="12" r="1.25" fill="currentColor" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem("education", i)}
                      className="remove-btn"
                      aria-label="Remove education"
                    >
                      ✖
                    </button>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label htmlFor={`degree-${i}`}>Degree</label>
                      <input
                        id={`degree-${i}`}
                        value={edu.degree}
                        onFocus={() => focusSection("education")}
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
                    <div className="form-group">
                      <label htmlFor={`institute-${i}`}>Institute</label>
                      <input
                        id={`institute-${i}`}
                        value={edu.institute}
                        onFocus={() => focusSection("education")}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === Work Experience === */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">💼 Work Experience</h2>
            <div>
              {Array.isArray(formData.experience) &&
                formData.experience.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection("experience")}
                    className="btn-link"
                    aria-expanded={!!expanded.experience}
                  >
                    {expanded.experience ? "− Collapse" : "+ Expand"}
                  </button>
                )}
            </div>
          </div>
          {/* Centered add button when section is expanded */}
          {expanded.experience && (
            <div className="section-actions-center">
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
          )}
          {expanded.experience && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnList("experience", e)}
            >
              {formData.experience.map((exp, i) => (
                <div
                  className={`card ${
                    dragState["experience"] === i ? "drag-over" : ""
                  }`}
                  key={i}
                  onDragEnter={(e) => handleDragEnter("experience", i, e)}
                  onDrop={(e) => handleDrop("experience", i, e)}
                >
                  <div className="card-actions">
                    <div
                      className="drag-handle"
                      aria-hidden
                      draggable
                      onDragStart={(e) => handleDragStart("experience", i, e)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <circle cx="4" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="12" r="1.25" fill="currentColor" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem("experience", i)}
                      className="remove-btn"
                      aria-label="Remove experience"
                    >
                      ✖
                    </button>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label htmlFor={`title-${i}`}>Job Title</label>
                      <input
                        id={`title-${i}`}
                        value={exp.title}
                        onFocus={() => focusSection("experience")}
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
                        onFocus={() => focusSection("experience")}
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
                        onFocus={() => focusSection("experience")}
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
            </div>
          )}
        </section>

        {/* === Projects === */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">💡 Projects</h2>
            <div>
              {Array.isArray(formData.projects) &&
                formData.projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection("projects")}
                    className="btn-link"
                    aria-expanded={!!expanded.projects}
                  >
                    {expanded.projects ? "− Collapse" : "+ Expand"}
                  </button>
                )}
            </div>
          </div>
          {/* Centered add button when section is expanded */}
          {expanded.projects && (
            <div className="section-actions-center">
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
          )}
          {expanded.projects && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnList("projects", e)}
            >
              {formData.projects.map((proj, i) => (
                <div
                  className={`card ${
                    dragState["projects"] === i ? "drag-over" : ""
                  }`}
                  key={i}
                  onDragEnter={(e) => handleDragEnter("projects", i, e)}
                  onDrop={(e) => handleDrop("projects", i, e)}
                >
                  <div className="card-actions">
                    <div
                      className="drag-handle"
                      aria-hidden
                      draggable
                      onDragStart={(e) => handleDragStart("projects", i, e)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <circle cx="4" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="4" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="8" r="1.25" fill="currentColor" />
                        <circle cx="10" cy="12" r="1.25" fill="currentColor" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem("projects", i)}
                      className="remove-btn"
                      aria-label="Remove project"
                    >
                      ✖
                    </button>
                  </div>

                  {["title", "role", "skills"].map((field) => (
                    <div className="form-group" key={field}>
                      <label htmlFor={`${field}-${i}`}>{field}</label>
                      <input
                        id={`${field}-${i}`}
                        value={proj[field]}
                        onFocus={() => focusSection("projects")}
                        onChange={(e) =>
                          updateNestedArray(
                            "projects",
                            i,
                            field,
                            e.target.value
                          )
                        }
                        className="input"
                      />
                    </div>
                  ))}

                  {/* ✅ Add Link Input */}
                  <div className="form-group">
                    <label htmlFor={`link-${i}`}>Project Link</label>
                    <input
                      id={`link-${i}`}
                      value={proj.link || proj.Link}
                      onFocus={() => focusSection("projects")}
                      onChange={(e) =>
                        updateNestedArray("projects", i, "link", e.target.value)
                      }
                      className="input"
                      placeholder="https://github.com/username/project"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`description-${i}`}>Description</label>
                    <textarea
                      id={`description-${i}`}
                      value={proj.description}
                      onFocus={() => focusSection("projects")}
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* === Additional Info === */}
        <section className="section">
          <h2 className="section-title">📄 Additional Information</h2>
          <div className="grid-2">
            {additionalInfoFields
              // .filter(
              //   (field) =>
              //     !["github", "linkedin", "portfolio", "twitter"].includes(
              //       field
              //     )
              // )
              .map((field) => (
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
          </div>
        </section>
      </form>
    </>
  );
}

export default ResumeForm;
