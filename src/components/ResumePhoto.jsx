// import React, { useState } from "react";

// const ResumePhoto = ({ photoUrl, fullName }) => {
//   const [loaded, setLoaded] = useState(false);

//   return (
//     <img
//       src={photoUrl}
//       alt={`${fullName || "Candidate"} profile`}
//       onError={() => {
//         setLoaded(false);
//         console.error("Failed to load profile photo:", photoUrl);
//       }}
//       onLoad={() => setLoaded(true)}
//       style={{
//         display: loaded ? "block" : "none",
//         maxWidth: "100px",
//         borderRadius: "50%",
//         marginBottom: "1rem",
//       }}
//     />
//   );
// };

// export default ResumePhoto;
