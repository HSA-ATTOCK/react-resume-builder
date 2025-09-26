import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import jsPDF from "jspdf";
import { useEffect } from "react";

const ResumePreview = ({ formData }) => {
  const resumeRef = useRef();
  const paginatedRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Rebuild paginated preview whenever formData changes
  useEffect(() => {
    buildPaginatedPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Convert mm to px (approx at 96 DPI)
  const mmToPx = (mm) => Math.round((mm * 96) / 25.4);

  // Build paginated preview in paginatedRef to mirror PDF pages
  const buildPaginatedPreview = () => {
    const container = paginatedRef.current;
    const source = resumeRef.current;
    if (!container || !source) return;

    // Clear existing
    container.innerHTML = "";

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 20;
    const pageWidthPx = mmToPx(pageWidthMm);
    const pageHeightPx = mmToPx(pageHeightMm);
    const marginPx = mmToPx(marginMm);
    const contentHeight = pageHeightPx - marginPx * 2;

    // Helper to create a styled page element
    const createPage = () => {
      const p = document.createElement("div");
      p.className = "pdf-page";
      p.style.width = `${pageWidthPx}px`;
      p.style.height = `${pageHeightPx}px`;
      p.style.boxSizing = "border-box";
      p.style.padding = `${marginPx}px`;
      p.style.margin = "12px auto";
      p.style.background = "#fff";
      p.style.border = "1px solid #ddd";
      p.style.overflow = "hidden";
      p.style.position = "relative";
      const inner = document.createElement("div");
      inner.className = "pdf-page-content";
      inner.style.width = "100%";
      inner.style.minHeight = "1px";
      p.appendChild(inner);
      container.appendChild(p);
      return inner;
    };

    // Start first page
    let currentPageContent = createPage();

    // Iterate through source child nodes (sections and header)
    const children = Array.from(source.childNodes).filter((n) => {
      // ignore empty text nodes
      return !(n.nodeType === Node.TEXT_NODE && !n.textContent.trim());
    });

    children.forEach((node) => {
      const clone = node.cloneNode(true);
      currentPageContent.appendChild(clone);

      // If overflow, try to split paragraph nodes, otherwise move whole node to next page
      const isOverflow = currentPageContent.scrollHeight > contentHeight;
      if (isOverflow) {
        // remove the clone
        currentPageContent.removeChild(clone);

        // If it's a section with paragraphs, try to split
        if (clone.querySelectorAll) {
          const paragraphs = Array.from(clone.querySelectorAll("p"));
          if (paragraphs.length > 0) {
            // create a wrapper for remaining content
            const remaining = clone.cloneNode(false);
            remaining.innerHTML = "";

            // append paragraph by paragraph
            paragraphs.forEach((p) => {
              const pClone = p.cloneNode(true);
              currentPageContent.appendChild(pClone);
              if (currentPageContent.scrollHeight > contentHeight) {
                // remove last appended paragraph
                currentPageContent.removeChild(pClone);
                remaining.appendChild(p.cloneNode(true));
              }
            });

            // If remaining has children, create new page and append remaining
            if (remaining.childNodes.length > 0) {
              const nextPage = createPage();
              nextPage.appendChild(remaining);
              currentPageContent = nextPage;
            } else {
              // if nothing remaining, just create a new page for next nodes
              currentPageContent = createPage();
            }
            return;
          }
        }

        // fallback: move whole node to next page
        const nextPage = createPage();
        nextPage.appendChild(clone);
        currentPageContent = nextPage;
      }
    });
  };

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    setIsGeneratingPDF(true);

    try {
      // Load profile image if available
      let imageBase64 = null;
      if (formData.photo) {
        try {
          const response = await fetch(formData.photo);
          const blob = await response.blob();
          imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error("Failed to load profile image:", error);
        }
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;
      let currentPage = 1;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          currentPage++;
          return true;
        }
        return false;
      };

      // Helper function to add text with word wrapping and justification
      // Increased default lineHeight to provide more breathing room between lines
      const addText = (text, x, y, options = {}) => {
        const fontSize = options.fontSize || 10;
        const maxWidth = options.maxWidth || contentWidth - x + margin;
        // Use 0.5 * fontSize as default line height for clearer spacing
        const lineHeight = options.lineHeight || fontSize * 0.4;

        pdf.setFontSize(fontSize);
        if (options.bold) pdf.setFont("helvetica", "bold");
        else pdf.setFont("helvetica", "normal");

        const lines = pdf.splitTextToSize(text, maxWidth);

        // Check if we need a page break
        const totalHeight = lines.length * lineHeight;
        // add small extra padding when checking for page break to avoid tight bottoms
        checkPageBreak(totalHeight + 6);

        // Render each line. For all but the last line, distribute extra space between words to justify.
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const drawY = currentY;

          if (i < lines.length - 1) {
            // Justify this line but preserve minimum single-space width
            const words = (line || "").trim().match(/\S+/g) || [];
            if (words.length > 1) {
              const wordsWidth = words.reduce(
                (sum, w) => sum + pdf.getTextWidth(w),
                0
              );
              const gaps = words.length - 1;
              const spaceWidth = pdf.getTextWidth(" ");
              const rawExtra = (maxWidth - wordsWidth) / gaps; // total gap size

              // If rawExtra is negative, line already exceeds maxWidth; fall back to left align
              if (rawExtra <= 0) {
                pdf.text(line, x, drawY);
              } else {
                // gapWidth is at least the measured single-space width
                const gapWidth = Math.max(spaceWidth, rawExtra);
                let cursorX = x;
                words.forEach((word, wi) => {
                  pdf.text(word, cursorX, drawY);
                  const wordWidth = pdf.getTextWidth(word);
                  cursorX += wordWidth + gapWidth;
                });
              }
            } else {
              // Single word or empty - left align
              pdf.text(line, x, drawY);
            }
          } else {
            // Last line: left align (do not justify)
            pdf.text(line, x, drawY);
          }

          currentY += lineHeight;
        }

        // Add a tiny paragraph gap after the block to separate from next content
        currentY += Math.max(1, fontSize * 0.2);
        return currentY;
      };

      // Header Section
      if (formData.fullName) {
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text(formData.fullName, margin, currentY);
        currentY += 8;
        // Render title under the name if provided
        if (formData.title) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text(formData.title, margin, currentY + 2);
          currentY += 8;
          pdf.setTextColor(0, 0, 0);
        }
      }

      // Add profile image if available (shifted slightly up)
      if (imageBase64) {
        const imgW = 30;
        const imgH = 30;
        // move image slightly left by 6mm and up by 9mm
        const imgX = pageWidth - margin - imgW - 8;
        const imgY = margin - 9; // move image 9mm up
        pdf.addImage(imageBase64, "JPEG", imgX, imgY, imgW, imgH);
      }

      // Contact Information
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

      // Add a line separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Personal Details Section
      const personalDetails = [];
      if (formData.dob) personalDetails.push(`Date of Birth: ${formData.dob}`);
      if (formData.nationality)
        personalDetails.push(`Nationality: ${formData.nationality}`);
      if (formData.religion)
        personalDetails.push(`Religion: ${formData.religion}`);
      if (formData.maritalStatus)
        personalDetails.push(`Marital Status: ${formData.maritalStatus}`);
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

      // Social Links Section
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
          // underline the URL
          const urlWidth = pdf.getTextWidth(link.url);
          pdf.setDrawColor(37, 99, 235);
          pdf.setLineWidth(0.4);
          const underlineY = currentY + 0.8; // small offset under baseline
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

      // Profile Section
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

      // Objective Section
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

      // Education Section
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
          pdf.text(edu.institute || "", margin, currentY);
          currentY += 5;

          if (edu.degree) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "italic");
            pdf.text(edu.degree, margin, currentY);
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

      // Projects Section
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
            // tighten vertical spacing between the skills block and the following link
            // move the skills block up slightly and reduce the manual post-gap
            addText(project.skills, margin + skillsWidth, currentY - 2);
            // add a smaller manual gap (addText already applies a small paragraph gap)
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
            // underline project link
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

      // Work Experience Section
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

      // Skills Section
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

      // Languages Section
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

      // Save the PDF
      pdf.save(`${formData.fullName}_Resume.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
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

      {/* Hidden resume source used to build paginated preview and for PDF generation */}
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
                <h2 className="resume-section-title">Social Links</h2>
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

      {/* Visible paginated preview that mirrors the PDF pages */}
      <div
        className="pdf-preview-container"
        ref={paginatedRef}
        aria-hidden={false}
      ></div>
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
