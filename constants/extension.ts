export const extension = {
  // --- 3D & Design (Creative) ---
  '.blend': {
    type: 'Blender Workfile',
    description:
      'The engine for 3D modeling and rendering. Where geometric concepts meet visual art.',
  },
  '.kra': {
    type: 'Krita Workfile',
    description:
      'Used for digital painting and 2D illustration.',
  },

  // --- Core Programming & Systems ---
  '.hs': {
    type: 'Haskell Source',
    description:
      'Purely functional programming. A strict, math-driven approach to logic and types.',
  },
  '.h': {
    type: 'C/C++ Header',
    description:
      'The blueprints of C/C++, defining structures and interfaces before the actual logic.',
  },
  '.c': {
    type: 'C Source',
    description:
      'Low-level, procedural systems programming. Dealing directly with memory and hardware.',
  },
  '.cpp': {
    type: 'C++ Source',
    description:
      'Object-oriented systems programming. Building complex, performance-critical software.',
  },
  '.elm': {
    type: 'Elm Source',
    description:
      'Functional frontend language. Used to build no-runtime-exception web frontend.',
  },
  '.java': {
    type: 'Java Source',
    description:
      'Object-oriented architecture. The standard for enterprise-level coursework.',
  },

  // --- Data Science & AI ---
  '.ipynb': {
    type: 'Jupyter Notebook',
    description:
      'Interactive data science environment. Blending live Python and markdown.',
  },
  '.py': {
    type: 'Python Source',
    description:
      'Highly readable scripting. The go-to tool for algorithms, automation, and ML.',
  },

  // --- Academic Writing & Documentation ---
  '.tex': {
    type: 'LaTeX Source',
    description:
      'Code-driven typesetting for mathematical proofs and thesis formatting.',
  },
  '.md': {
    type: 'Markdown Document',
    description:
      'Lightweight, plain-text formatting. Good for documentation, READMEs, and quick notes.',
  },
  '.txt': {
    type: 'Plain Text',
    description:
      'Raw, unformatted sequences of characters.',
  },

  // --- Office & General Productivity ---
  '.docx': {
    type: 'Word Document',
    description:
      'Standard word processing.',
  },
  '.pptx': {
    type: 'PowerPoint Presentation',
    description:
      'Slide deck creation. The medium for presenting project pitches and final defenses.',
  },
  '.xlsx': {
    type: 'Excel Worksheet',
    description:
      'Grid-based spreadsheet data. Used for basic data logging and tabular organization.',
  },
};

export const groupedExtensions = [
  ['.blend', '.kra'],
  ['.hs', '.h', '.c', '.cpp', '.elm', '.ipynb', '.py', '.java'],
  ['.docx', '.pptx', '.xlsx', '.tex', '.md', '.txt'],
];
