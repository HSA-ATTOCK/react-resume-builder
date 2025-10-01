import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import jsPDF from "jspdf";

const ResumePreview = ({ formData }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const previewUrlRef = useRef(null);
  const previewTaskIdRef = useRef(0);

  // Handle ESC key to close preview modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showPreview) {
        setShowPreview(false);
      }
    };

    if (showPreview) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  const buildPdfDocument = useCallback(async () => {
    let imageBase64 = null;
    let imageMime = null;
    if (formData.photo) {
      try {
        const response = await fetch(formData.photo);
        const blob = await response.blob();
        imageMime = blob.type || null;

        if (
          (!imageMime || imageMime === "") &&
          typeof formData.photo === "string"
        ) {
          const m = formData.photo.match(/^data:([^;]+);/);
          if (m && m[1]) imageMime = m[1];
        }

        imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        const needsReencode =
          !imageMime || !imageMime.toLowerCase().includes("png");
        if (needsReencode) {
          try {
            const img = await new Promise((res, rej) => {
              const i = new Image();
              i.crossOrigin = "anonymous";
              i.onload = () => res(i);
              i.onerror = (e) => rej(e);
              i.src = imageBase64;
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const reencoded = canvas.toDataURL("image/png");
              imageBase64 = reencoded;
              imageMime = "image/png";
            }
          } catch (reErr) {
            console.warn(
              "Image re-encode to PNG failed, using original:",
              reErr
            );
          }
        }
      } catch (error) {
        console.error("Failed to load profile image:", error);
      }
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let currentY = margin;

    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    const addText = (text, x, y, options = {}) => {
      const fontSize = options.fontSize || 10;
      const maxWidth = options.maxWidth || contentWidth - x + margin;
      const lineHeight = options.lineHeight || fontSize * 0.4;

      pdf.setFontSize(fontSize);
      if (options.bold) pdf.setFont("helvetica", "bold");
      else pdf.setFont("helvetica", "normal");

      const lines = pdf.splitTextToSize(text, maxWidth);
      const totalHeight = lines.length * lineHeight;
      checkPageBreak(totalHeight + 6);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const drawY = currentY;

        if (i < lines.length - 1) {
          const words = (line || "").trim().match(/\S+/g) || [];
          if (words.length > 1) {
            const wordsWidth = words.reduce(
              (sum, w) => sum + pdf.getTextWidth(w),
              0
            );
            const gaps = words.length - 1;
            const spaceWidth = pdf.getTextWidth(" ");
            const rawExtra = (maxWidth - wordsWidth) / gaps;
            if (rawExtra <= 0) {
              pdf.text(line, x, drawY);
            } else {
              const gapWidth = Math.max(spaceWidth, rawExtra);
              let cursorX = x;
              words.forEach((word) => {
                pdf.text(word, cursorX, drawY);
                const wordWidth = pdf.getTextWidth(word);
                cursorX += wordWidth + gapWidth;
              });
            }
          } else {
            pdf.text(line, x, drawY);
          }
        } else {
          pdf.text(line, x, drawY);
        }

        currentY += lineHeight;
      }

      currentY += Math.max(1, fontSize * 0.2);
      return currentY;
    };

    if (formData.fullName) {
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(formData.fullName, margin, currentY);
      currentY += 8;
      if (formData.title) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text(formData.title, margin, currentY + 2);
        currentY += 8;
        pdf.setTextColor(0, 0, 0);
      }
    }

    if (imageBase64) {
      const imgW = 30;
      const imgH = 30;
      const imgX = pageWidth - margin - imgW - 8;
      const imgY = margin - 6;
      const lowerMime = (imageMime || "").toLowerCase();
      const imgFormat =
        lowerMime.includes("png") || lowerMime.includes("svg") ? "PNG" : "JPEG";
      try {
        pdf.addImage(imageBase64, imgFormat, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.warn(
          "addImage failed with format",
          imgFormat,
          "- falling back to JPEG",
          err
        );
        try {
          pdf.addImage(imageBase64, "JPEG", imgX, imgY, imgW, imgH);
        } catch (inner) {
          console.error("Failed to add image to PDF:", inner);
        }
      }
    }

    const contactInfo = [];
    if (formData.phone) contactInfo.push(`Phone: ${formData.phone}`);
    if (formData.whatsapp) contactInfo.push(`WhatsApp: ${formData.whatsapp}`);
    if (formData.email) contactInfo.push(`Email: ${formData.email}`);

    if (contactInfo.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      contactInfo.forEach((info) => {
        pdf.text(info, margin, currentY);
        currentY += 4;
      });
      currentY += 3;
    }

    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    const personalDetails = [];
    if (formData.dob) personalDetails.push(`Date of Birth: ${formData.dob}`);
    if (formData.nationality)
      personalDetails.push(`Nationality: ${formData.nationality}`);
    if (formData.religion)
      personalDetails.push(`Religion: ${formData.religion}`);
    if (formData.license)
      personalDetails.push(`Driving License: ${formData.license}`);

    if (personalDetails.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("PERSONAL DETAILS", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      personalDetails.forEach((detail) => {
        checkPageBreak(5);
        pdf.text(detail, margin, currentY);
        currentY += 4;
      });
      currentY += 5;
    }

    if (formData.customLinks?.length > 0) {
      checkPageBreak(15);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("SOCIAL LINKS", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      formData.customLinks.forEach((link) => {
        checkPageBreak(5);
        const label = `${link.title || "Link"}: `;
        pdf.text(label, margin, currentY);
        pdf.setTextColor(37, 99, 235);
        const labelWidth = pdf.getTextWidth(label);
        pdf.text(link.url, margin + labelWidth, currentY);
        const urlWidth = pdf.getTextWidth(link.url);
        pdf.setDrawColor(37, 99, 235);
        pdf.setLineWidth(0.4);
        const underlineY = currentY + 0.8;
        pdf.line(
          margin + labelWidth,
          underlineY,
          margin + labelWidth + urlWidth,
          underlineY
        );
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        currentY += 4;
      });
      currentY += 5;
    }

    if (formData.profile) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("PROFILE", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      addText(formData.profile, margin, currentY);
      currentY += 5;
    }

    if (formData.objective) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("OBJECTIVE", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      addText(formData.objective, margin, currentY);
      currentY += 5;
    }

    if (formData.education?.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("EDUCATION", margin, currentY);
      currentY += 6;

      formData.education.forEach((edu) => {
        checkPageBreak(15);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        if (edu.degree) {
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text(edu.degree, margin, currentY);
          currentY += 5;
        }

        if (edu.institute) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          pdf.text(edu.institute, margin, currentY);
          currentY += 4;
        }

        if (edu.period) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(edu.period, margin, currentY);
          currentY += 4;
        }
        currentY += 3;
      });
      currentY += 2;
    }

    if (formData.projects?.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("PROJECTS", margin, currentY);
      currentY += 6;

      formData.projects.forEach((project) => {
        checkPageBreak(20);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text(project.title || "", margin, currentY);
        currentY += 5;

        if (project.role) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("Role: ", margin, currentY);
          pdf.setFont("helvetica", "italic");
          const roleWidth = pdf.getTextWidth("Role: ");
          pdf.text(project.role, margin + roleWidth, currentY);
          currentY += 4;
        }

        if (project.period) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(project.period, margin, currentY);
          currentY += 4;
        }

        if (project.description) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
          addText(project.description, margin, currentY);
          currentY += 3;
        }

        if (project.skills) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("Skills: ", margin, currentY);
          pdf.setFont("helvetica", "normal");
          const skillsWidth = pdf.getTextWidth("Skills: ");
          addText(project.skills, margin + skillsWidth, currentY - 2);
          currentY += -0.7;
        }

        if (project.link) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("Link: ", margin, currentY);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(37, 99, 235);
          const linkWidth = pdf.getTextWidth("Link: ");
          pdf.text(project.link, margin + linkWidth, currentY);
          const urlWidth = pdf.getTextWidth(project.link);
          const underlineY = currentY + 0.8;
          pdf.setDrawColor(37, 99, 235);
          pdf.setLineWidth(0.4);
          pdf.line(
            margin + linkWidth,
            underlineY,
            margin + linkWidth + urlWidth,
            underlineY
          );
          pdf.setTextColor(0, 0, 0);
          pdf.setDrawColor(0, 0, 0);
          currentY += 4;
        }
        currentY += 3;
      });
      currentY += 2;
    }

    if (formData.experience?.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("WORK EXPERIENCE", margin, currentY);
      currentY += 6;

      formData.experience.forEach((job) => {
        checkPageBreak(20);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text(job.title || "", margin, currentY);
        currentY += 5;

        if (job.company || job.period) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          const companyText = job.company ? job.company : "";
          const periodText = job.period ? ` — ${job.period}` : "";
          pdf.text(companyText + periodText, margin, currentY);
          currentY += 4;
        }

        if (job.details?.length > 0) {
          job.details.forEach((detail) => {
            if (detail && detail.trim()) {
              checkPageBreak(6);
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "normal");
              pdf.text("• ", margin, currentY);
              addText(detail, margin + 5, currentY - 3.5, {
                maxWidth: contentWidth - 5,
              });
              currentY += 2;
            }
          });
        }
        currentY += 3;
      });
      currentY += 2;
    }

    if (formData.skills) {
      checkPageBreak(15);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("SKILLS", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      addText(formData.skills, margin, currentY);
      currentY += 5;
    }

    if (formData.languages) {
      checkPageBreak(15);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("LANGUAGES", margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      addText(formData.languages, margin, currentY);
    }

    return pdf;
  }, [formData]);

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = await buildPdfDocument();
      const fileName = formData.fullName
        ? `${formData.fullName}_Resume.pdf`
        : "Resume.pdf";
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const triggerPreview = useCallback(async () => {
    const taskId = ++previewTaskIdRef.current;
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      const pdf = await buildPdfDocument();
      if (taskId !== previewTaskIdRef.current) return;
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      if (taskId !== previewTaskIdRef.current) return;
      console.error("Preview generation failed:", error);
      setPreviewError("Unable to render preview. Please try again.");
    } finally {
      if (taskId === previewTaskIdRef.current) {
        setIsPreviewLoading(false);
      }
    }
  }, [buildPdfDocument]);

  useEffect(() => {
    if (!showPreview) return;
    triggerPreview();
  }, [showPreview, triggerPreview]);

  useEffect(() => {
    if (showPreview) return;
    previewTaskIdRef.current += 1;
    setIsPreviewLoading(false);
    setPreviewError(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, [showPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Helper function to render list items safely
  const renderListItems = (items) => {
    if (!items || !Array.isArray(items)) return null;
    return items.map((item, i) => (item ? <li key={i}>{item}</li> : null));
  };

  return (
    <div className="preview-container">
      {/* Top fixed action buttons */}
      <div className="top-download-wrapper" aria-hidden={isGeneratingPDF}>
        <button
          id="downloadResume"
          className="download-btn top-download"
          onClick={downloadPDF}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? "Generating PDF..." : "Download Resume"}
        </button>
        <button
          className="preview-btn top-preview"
          onClick={() => setShowPreview(true)}
          disabled={isPreviewLoading}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Preview Resume
        </button>
      </div>

      {/* Hidden resume source used to build paginated preview and for PDF generation */}
      <div id="resume-preview" className="resume-box">
        {/* === Header with Photo === */}
        <div className="resume-header">
          {formData.photo && (
            <div className="resume-photo">
              <img
                src={formData.photo}
                alt={`${formData.fullName || "Candidate"} profile`}
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.style.display = "none";
                  console.error(
                    "Failed to load profile photo:",
                    formData.photo
                  );
                }}
                onLoad={(e) => {
                  e.target.style.display = "block";
                }}
                style={{ display: "none" }}
              />
            </div>
          )}

          <div className="resume-header-text">
            <h1 className="resume-name">{formData.fullName || "Your Name"}</h1>
            {formData.title && <p className="resume-title">{formData.title}</p>}
            {(formData.phone || formData.whatsapp) && (
              <p className="resume-contact">
                <strong>
                  {formData.phone && `Phone: ${formData.phone}`}
                  {formData.phone && formData.whatsapp && " | "}
                  {formData.whatsapp && `WhatsApp: ${formData.whatsapp}`}
                </strong>
              </p>
            )}
            {formData.email && (
              <p className="resume-contact">
                <strong>Email: {formData.email}</strong>
              </p>
            )}
          </div>
        </div>

        {/* === Personal Details === */}
        {(formData.dob ||
          formData.nationality ||
          formData.religion ||
          // formData.maritalStatus ||
          formData.license) && (
          <section>
            <h2 className="resume-section-title">Personal Details</h2>
            {formData.dob && (
              <p>
                <strong>Date of Birth:</strong> {formData.dob}
              </p>
            )}
            {formData.nationality && (
              <p>
                <strong>Nationality:</strong> {formData.nationality}
              </p>
            )}
            {formData.religion && (
              <p>
                <strong>Religion:</strong> {formData.religion}
              </p>
            )}
            {/* Marital status omitted from preview per request
            {formData.maritalStatus && (
              <p>
                <strong>Marital Status:</strong> {formData.maritalStatus}
              </p>
            )}
            */}
            {formData.license && (
              <p>
                <strong>Driving License:</strong> {formData.license}
              </p>
            )}
          </section>
        )}

        {/* === Social Links === */}
        {formData.customLinks?.length > 0 && (
          <section>
            <h2 className="resume-section-title">Social Links</h2>
            <ul>
              {formData.customLinks.map((link, idx) => (
                <li key={idx}>
                  <strong>{link.title || "Link"}:</strong>{" "}
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* === Profile Summary === */}
        {formData.profile && (
          <section>
            <h2 className="resume-section-title">Profile</h2>
            <p>{formData.profile}</p>
          </section>
        )}

        {/* === Objective === */}
        {formData.objective && (
          <section>
            <h2 className="resume-section-title">Objective</h2>
            <p>{formData.objective}</p>
          </section>
        )}

        {/* === Education === */}
        {formData.education?.length > 0 && (
          <section>
            <h2 className="resume-section-title">Education</h2>
            {formData.education.map((edu, idx) => (
              <div key={idx} className="resume-subsection">
                {/* Display degree first, then institute (swapped) */}
                {edu.degree && <p className="resume-subtitle">{edu.degree}</p>}
                {edu.institute && (
                  <p className="resume-italic">{edu.institute}</p>
                )}
                {edu.period && <p className="resume-period">{edu.period}</p>}
              </div>
            ))}
          </section>
        )}

        {/* === Projects === */}
        {formData.projects?.length > 0 && (
          <section>
            <h2 className="resume-section-title">Projects</h2>
            {formData.projects.map((project, idx) => (
              <div key={idx} className="resume-subsection">
                <h3 className="resume-subtitle">{project.title}</h3>
                {project.role && (
                  <p className="resume-italic">{project.role}</p>
                )}
                {project.period && (
                  <p className="resume-period">{project.period}</p>
                )}
                {project.description && <p>{project.description}</p>}
                {project.skills && (
                  <p className="resume-note">
                    <strong>Skills:</strong> {project.skills}
                  </p>
                )}
                {project.link && (
                  <p className="project-link">
                    <strong>Link:</strong>{" "}
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.link}
                    </a>
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* === Work Experience === */}
        {formData.experience?.length > 0 && (
          <section>
            <h2 className="resume-section-title">Work Experience</h2>
            {formData.experience.map((job, idx) => (
              <div key={idx} className="resume-subsection">
                <h3 className="resume-subtitle">{job.title}</h3>
                <p className="resume-italic">
                  {job.company}
                  {job.period && ` — ${job.period}`}
                </p>
                {job.details?.length > 0 && (
                  <ul>{renderListItems(job.details)}</ul>
                )}
              </div>
            ))}
          </section>
        )}

        {/* === Skills === */}
        {formData.skills && (
          <section>
            <h2 className="resume-section-title">Skills</h2>
            <p>{formData.skills}</p>
          </section>
        )}

        {/* === Languages === */}
        {formData.languages && (
          <section>
            <h2 className="resume-section-title">Languages</h2>
            <p>{formData.languages}</p>
          </section>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="preview-modal-overlay"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="preview-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-modal-header">
              <h2>Resume Preview</h2>
              <button
                className="preview-modal-close"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
              >
                ✖
              </button>
            </div>
            <div className="preview-modal-body">
              {isPreviewLoading && (
                <div className="preview-status">Generating preview…</div>
              )}
              {!isPreviewLoading && previewError && (
                <div className="preview-status preview-error">
                  {previewError}
                </div>
              )}
              {!isPreviewLoading && !previewError && previewUrl && (
                <iframe
                  className="preview-pdf-frame"
                  title="Resume Preview"
                  src={previewUrl}
                  frameBorder="0"
                />
              )}
              {!isPreviewLoading && !previewError && !previewUrl && (
                <div className="preview-status">No preview available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ResumePreview.propTypes = {
  formData: PropTypes.shape({
    fullName: PropTypes.string,
    title: PropTypes.string,
    photo: PropTypes.string,
    phone: PropTypes.string,
    whatsapp: PropTypes.string,
    email: PropTypes.string,
    dob: PropTypes.string,
    nationality: PropTypes.string,
    religion: PropTypes.string,
    // maritalStatus: PropTypes.string,
    license: PropTypes.string,
    customLinks: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        url: PropTypes.string,
      })
    ),
    profile: PropTypes.string,
    objective: PropTypes.string,
    education: PropTypes.arrayOf(
      PropTypes.shape({
        institute: PropTypes.string,
        degree: PropTypes.string,
        period: PropTypes.string,
      })
    ),
    projects: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        role: PropTypes.string,
        period: PropTypes.string,
        description: PropTypes.string,
        skills: PropTypes.string,
        link: PropTypes.string,
      })
    ),
    experience: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        company: PropTypes.string,
        period: PropTypes.string,
        details: PropTypes.arrayOf(PropTypes.string),
      })
    ),
    skills: PropTypes.string,
    languages: PropTypes.string,
  }),
};

ResumePreview.defaultProps = {
  formData: {},
};

export default ResumePreview;
