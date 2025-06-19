# React Resume Builder

A clean, customizable, and fully responsive Resume Builder built with **React**. Easily create professional resumes with real-time previews, photo upload and cropping, and one-click PDF export — all stored locally in the browser for quick access and edits.

---

## Features

* Fill in and preview resume sections in real-time
* Upload and crop a round profile photo
* Download resume as a single-page PDF
* Add/remove education, experience, and projects dynamically
* Data saved to localStorage
* Beautiful, modern, and clean UI
* Built with React + Express + Ngrok for sharing

---

## Preview

![preview](https://github.com/HSA-ATTOCK/react-resume-builder/blob/main/preview.png)

---

## Tech Stack

| Frontend | Backend | Tools      |
| -------- | ------- | ---------- |
| React    | Express | Ngrok      |
| HTML5    | Node.js | VSCode     |
| CSS3     |         | Git/GitHub |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/resume-builder.git
cd resume-builder

# Install dependencies
npm install

# Build for production
npm run build

# Start Express server
node server.js
```

---

## Running with Ngrok (for public testing)

1. Start the server:

```bash
node server.js
```

2. In a new terminal, run:

```bash
ngrok http 5000
```

3. Visit the public URL from Ngrok in your browser.

---

## Customize the Resume

* Modify input fields, styles, and PDF layout in the `/src` folder
* Update the photo preview and crop feature in `ResumeForm.jsx` and `ImageCropper.jsx`
* Change color schemes and fonts in `html.css`

---

## Folder Structure

```
resume-builder/
│
├── public/              
├── src/                 # React components and styles
│   ├── components/      # ResumeForm, ResumePreview, ImageCropper, LoadingSpinner
│   ├── utils/           # cropImage, imageUtils
│   ├── styles/          # cropper.css
│   ├── App.jsx
│   ├── index.css        # CSS for styling the app
│   └── main.jsx
├── server.js            # Express server for static build
├── package.json
├── .gitignore
├── preview.png                # Preview image
└── README.md            # This documentation file
```

---

## Author

**Haider**
Built with ❤️ using React + Express
[GitHub Profile](https://github.com/HSA-ATTOCK)

---

## License

This project is licensed under the [MIT License](LICENSE).

---

### .gitignore (Recommended)

Make sure to include this in `.gitignore`:

```
node_modules/
dist/
build/
.env
.DS_Store
```

---
