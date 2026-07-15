export const extension = {
  // --- 3D & Design (Creative) ---
  ".blend": { 
    type: "Blender Workfile", 
    description: "The engine for 3D modeling, rigging, and rendering. Where geometric concepts meet visual art." 
  },
  ".kra": { 
    type: "Krita Workfile", 
    description: "Digital painting and raster graphics. Used for storyboarding and 2D asset creation." 
  },

  // --- Core Programming & Systems ---
  ".hs": { 
    type: "Haskell Source", 
    description: "Purely functional programming. A strict, math-driven approach to logic and types." 
  },
  ".h": { 
    type: "C/C++ Header", 
    description: "The blueprints of C/C++ projects, defining structures and interfaces before the actual logic." 
  },
  ".c": { 
    type: "C Source", 
    description: "Low-level, procedural systems programming. Dealing directly with memory and hardware." 
  },
  ".cpp": { 
    type: "C++ Source", 
    description: "Object-oriented systems programming. Building complex, performance-critical architectures." 
  },
  ".elm": { 
    type: "Elm Source", 
    description: "Functional frontend language. Used to build reliable, no-runtime-exception web interfaces." 
  },
  ".java": { 
    type: "Java Source", 
    description: "Strict, class-based object-oriented architecture. The standard for enterprise-level coursework." 
  },

  // --- Data Science & AI ---
  ".ipynb": { 
    type: "Jupyter Notebook", 
    description: "Interactive data science environment. Blending live Python execution, math, and data visualization." 
  },
  ".py": { 
    type: "Python Source", 
    description: "High-level, highly readable scripting. The go-to tool for algorithms, automation, and machine learning." 
  },

  // --- Academic Writing & Documentation ---
  ".tex": { 
    type: "LaTeX Source", 
    description: "The gold standard for academic writing. Code-driven typesetting for mathematical proofs and thesis formatting." 
  },
  ".md": { 
    type: "Markdown Document", 
    description: "Lightweight, plain-text formatting. Essential for repository documentation, READMEs, and quick notes." 
  },
  ".txt": { 
    type: "Plain Text", 
    description: "Raw, unformatted sequences of characters. Often used for raw data inputs or scratchpad thoughts." 
  },

  // --- Office & General Productivity ---
  ".docx": { 
    type: "Word Document", 
    description: "Standard word processing. Primarily used for general electives and non-technical essay submissions." 
  },
  ".pptx": { 
    type: "PowerPoint Presentation", 
    description: "Slide deck creation. The medium for presenting project pitches and final defenses." 
  },
  ".xlsx": { 
    type: "Excel Worksheet", 
    description: "Grid-based spreadsheet data. Used for basic data logging and tabular organization." 
  }
};


export const groupedExtensions = [
  [".blend", ".kra"],
  [".hs", ".h", ".c", ".cpp", ".elm", ".ipynb", ".py", ".java"],
  [".docx", ".pptx", ".xlsx", ".tex", ".md", ".txt"]
];