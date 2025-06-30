import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ResumePreview = ({ formData }) => {
  const resumeRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const downloadPDF = async () => {
    if (!resumeRef.current) return;

    setIsGeneratingPDF(true);

    try {
      // 1. Prepare the DOM for high-quality capture
      const originalStyles = [];
      const noPrintElements = document.querySelectorAll(".no-print");

      noPrintElements.forEach((el) => {
        originalStyles.push({
          element: el,
          display: el.style.display,
          visibility: el.style.visibility,
        });
        el.style.display = "none";
      });

      // 2. Calculate optimal scale for high resolution (4x for ultra HD)
      const scale = 4; // Fixed high scale for maximum quality
      const dpi = 300; // Target print quality

      // 3. Ultra-high-quality capture
      const canvas = await html2canvas(resumeRef.current, {
        scale,
        useCORS: true,
        letterRendering: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: false,
        quality: 1, // Maximum quality
        dpi, // High DPI for print quality
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll(".no-print").forEach((el) => {
            el.style.visibility = "hidden";
          });
        },
      });

      // 4. Restore original DOM state
      originalStyles.forEach((style) => {
        style.element.style.display = style.display;
        style.element.style.visibility = style.visibility;
      });

      // 5. Calculate PDF dimensions (maintaining your original approach)
      const pxToMm = (px) => px * 0.264583;
      const pdfWidth = pxToMm(canvas.width) / scale;
      const pdfHeight = pxToMm(canvas.height) / scale;

      // 6. Create PDF with ultra-high quality settings
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
        hotfixes: ["px_scaling"],
        filters: [],
      });

      // 7. Add image with best quality settings
      pdf.addImage(
        canvas.toDataURL("image/png", 1.0), // PNG for lossless quality
        "PNG",
        0, // x offset (full bleed)
        0, // y offset (full bleed)
        pdfWidth,
        pdfHeight,
        undefined,
        "NONE" // No compression for maximum quality
      );

      // 8. Save the PDF
      pdf.save(`${formData.fullName || "resume"}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Ultra HD PDF generation failed:", error);
      alert("Failed to generate high-quality PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Helper function to render list items safely
  const renderListItems = (items) => {
    if (!items || !Array.isArray(items)) return null;
    return items.map((item, i) => (item ? <li key={i}>{item}</li> : null));
  };

  return (
    <div className="preview-container">
      {/* Download Button */}
      <button
        id="downloadResume"
        className="download-btn"
        onClick={downloadPDF}
        disabled={isGeneratingPDF}
        aria-busy={isGeneratingPDF}
      >
        {isGeneratingPDF ? (
          "Generating PDF..."
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Resume
          </>
        )}
      </button>

      {/* Resume Content */}
      <div id="resume-preview" ref={resumeRef} className="resume-box">
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
                  // Ensure the image is properly displayed
                  e.target.style.display = "block";
                }}
                style={{ display: "none" }} // Start hidden until loaded
              />
            </div>
          )}

          <div className="resume-header-text">
            <h1 className="resume-name">{formData.fullName || "Your Name"}</h1>
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
          formData.maritalStatus ||
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
            {formData.maritalStatus && (
              <p>
                <strong>Marital Status:</strong> {formData.maritalStatus}
              </p>
            )}
            {formData.license && (
              <p>
                <strong>Driving License:</strong> {formData.license}
              </p>
            )}
            {formData.customLinks?.length > 0 && (
              <section>
                <h2 className="resume-section-title">Custom Links</h2>
                <ul>
                  {formData.customLinks.map((link, idx) => (
                    <li key={idx}>
                      <strong>{link.title || "Link"}:</strong>{" "}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
                <p className="resume-subtitle">{edu.institute}</p>
                <p className="resume-italic">{edu.degree}</p>
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
    </div>
  );
};

ResumePreview.propTypes = {
  formData: PropTypes.shape({
    fullName: PropTypes.string,
    photo: PropTypes.string,
    phone: PropTypes.string,
    whatsapp: PropTypes.string,
    email: PropTypes.string,
    dob: PropTypes.string,
    nationality: PropTypes.string,
    religion: PropTypes.string,
    maritalStatus: PropTypes.string,
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
        Link: PropTypes.string,
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
